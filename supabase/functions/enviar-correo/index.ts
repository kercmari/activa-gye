// Edge Function: envía un correo de aviso (fase 3, y los de contacto siempre).
// Dos formas de enviar, la primera que esté configurada:
//   1. SMTP (por ejemplo Gmail con contraseña de aplicación): SMTP_HOST, SMTP_USER, SMTP_PASS
//      y opcional SMTP_PORT (465 por defecto; Supabase bloquea la salida por los puertos 25 y 587).
//   2. API de Brevo: BREVO_API_KEY.
// La llama el trigger de `notifications` (migración 20261121000005) con la clave de servicio.
// Los avisos de contacto (kind 'contacto', migración 20261125000017) van a las administradoras
// aunque la fase 3 esté apagada.
// Sin ninguna de las dos no envía nada: responde 200 { sent: false, reason: 'sin_clave' } y el aviso
// igual queda en la campana de la app.

import { createClient } from 'npm:@supabase/supabase-js@2';
import nodemailer from 'npm:nodemailer@7.0.13';

const BREVO_URL = 'https://api.brevo.com/v3/smtp/email';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);

// El enlace puede venir relativo ('/nutri/...'): se antepone SITE_URL.
const absoluteLink = (link: string | null, siteUrl: string) => {
  if (!link) return null;
  if (/^https?:\/\//i.test(link)) return link;
  return `${siteUrl.replace(/\/+$/, '')}/${link.replace(/^\/+/, '')}`;
};

const renderHtml = (title: string, body: string | null, link: string | null, siteUrl: string, footer: string) => {
  const logo = `${siteUrl.replace(/\/+$/, '')}/img/logo.png`;
  const button = link
    ? `<p style="margin:28px 0 0"><a href="${escapeHtml(link)}" style="display:inline-block;background:#f26b1d;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:999px">Ver en VITGO</a></p>`
    : '';
  return `<!doctype html>
<html lang="es"><body style="margin:0;background:#f4f6fa;font-family:Arial,Helvetica,sans-serif;color:#1b2a4a">
<div style="max-width:560px;margin:0 auto;padding:24px">
  <div style="background:#ffffff;border-radius:20px;padding:28px">
    <img src="${escapeHtml(logo)}" alt="VITGO" height="44" style="display:block;height:44px;width:auto">
    <h1 style="font-size:20px;margin:24px 0 8px">${escapeHtml(title)}</h1>
    ${body ? `<p style="font-size:15px;line-height:1.6;margin:0;white-space:pre-line">${escapeHtml(body)}</p>` : ''}
    ${button}
  </div>
  <p style="font-size:12px;color:#6b7a94;text-align:center;margin:16px 0 0">${escapeHtml(footer)}</p>
</div>
</body></html>`;
};

// true si el token es un JWT (ya verificado por la puerta) con rol service_role de este proyecto.
const isServiceRoleJwt = (token: string) => {
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  try {
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4)));
    const host = new URL(Deno.env.get('SUPABASE_URL') ?? '').hostname;
    const ref = host.split('.')[0];
    const vigente = typeof payload?.exp !== 'number' || payload.exp * 1000 > Date.now();
    return payload?.role === 'service_role' && payload?.iss === 'supabase' && vigente &&
      typeof payload?.ref === 'string' && payload.ref === ref;
  } catch {
    return false;
  }
};

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405);

  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const auth = req.headers.get('Authorization') ?? '';
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  // Solo la base de datos (trigger) o quien tenga la clave de servicio puede disparar correos.
  // En proyectos nuevos SUPABASE_SERVICE_ROLE_KEY puede no ser la clave legacy que guarda Vault,
  // así que también vale un JWT con rol service_role de este proyecto. La firma la comprueba la
  // puerta de Supabase antes de llegar aquí (verify_jwt = true en supabase/config.toml) y otra vez
  // Supabase Auth al pedir el usuario con esa misma clave (más abajo).
  if (!bearer || !((serviceRole && bearer === serviceRole) || isServiceRoleJwt(bearer))) {
    return json({ error: 'No autorizado' }, 401);
  }

  let input: { user_id?: unknown; kind?: unknown; title?: unknown; body?: unknown; link?: unknown };
  try {
    input = await req.json();
  } catch {
    return json({ error: 'JSON no válido' }, 400);
  }
  if (typeof input.user_id !== 'string' || typeof input.title !== 'string' || !input.title.trim()) {
    return json({ error: 'Faltan user_id o title' }, 400);
  }
  // Sin saltos de línea ni caracteres de control en el asunto.
  const title = input.title.replace(/[\u0000-\u001f\u007f]+/g, ' ').trim();
  if (!title) return json({ error: 'Faltan user_id o title' }, 400);
  const body = typeof input.body === 'string' && input.body.trim() ? input.body.trim() : null;
  const isContact = input.kind === 'contacto';
  const rawLink = typeof input.link === 'string' && input.link.trim() ? input.link.trim() : null;

  const smtpHost = Deno.env.get('SMTP_HOST') ?? '';
  const smtpUser = Deno.env.get('SMTP_USER') ?? '';
  const smtpPass = Deno.env.get('SMTP_PASS') ?? '';
  const useSmtp = Boolean(smtpHost && smtpUser && smtpPass);
  const apiKey = Deno.env.get('BREVO_API_KEY') ?? '';
  if (!useSmtp && !apiKey) return json({ sent: false, reason: 'sin_clave' });

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  // Se usa la clave que llegó: así Supabase Auth vuelve a comprobar su firma en getUserById, aunque
  // algún día se despliegue la función sin verify_jwt (un token falso termina en 'sin_correo').
  const adminKey = serviceRole && bearer === serviceRole ? serviceRole : bearer;
  const admin = createClient(supabaseUrl, adminKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Solo se envía si la fase 3 está encendida (salvo los avisos de contacto).
  if (!isContact) {
    const { data: settings, error: settingsError } = await admin.rpc('get_public_settings');
    if (settingsError) return json({ sent: false, reason: 'error_configuracion' }, 500);
    if (!(settings as { phase3?: boolean } | null)?.phase3) {
      return json({ sent: false, reason: 'fase_apagada' });
    }
  }

  const { data: userData, error: userError } = await admin.auth.admin.getUserById(input.user_id);
  const email = userData?.user?.email;
  if (userError || !email) return json({ sent: false, reason: 'sin_correo' });

  const siteUrl = Deno.env.get('SITE_URL') ?? '';
  const link = rawLink ? absoluteLink(rawLink, siteUrl) : null;
  // Con Gmail el remitente debe ser la misma cuenta (SMTP_USER) o un alias verificado de ella.
  const senderEmail = useSmtp
    ? (Deno.env.get('SENDER_EMAIL') || smtpUser)
    : (Deno.env.get('SENDER_EMAIL') || Deno.env.get('BREVO_SENDER_EMAIL') || '');
  const senderName = Deno.env.get('SENDER_NAME') || Deno.env.get('BREVO_SENDER_NAME') || 'VITGO';
  if (!senderEmail) return json({ sent: false, reason: 'sin_remitente' });

  const html = renderHtml(title, body, link, siteUrl, isContact
    ? 'Recibiste este correo porque eres administradora de VITGO.'
    : 'Recibiste este correo porque tienes una cuenta en VITGO.');
  const text = [title, body, link].filter(Boolean).join('\n\n');

  if (useSmtp) {
    const port = Number(Deno.env.get('SMTP_PORT') ?? '465') || 465;
    try {
      const transport = nodemailer.createTransport({
        host: smtpHost,
        port,
        secure: port === 465,
        auth: { user: smtpUser, pass: smtpPass },
        // Por debajo del límite de tiempo de la función, para que el error quede en los logs.
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
        socketTimeout: 20_000,
      });
      await transport.sendMail({
        from: { name: senderName, address: senderEmail },
        to: { name: '', address: email },
        subject: title,
        html,
        text,
      });
    } catch (err) {
      // Solo el código del error: el mensaje puede traer el correo del destinatario.
      console.error('SMTP falló', (err as { code?: string; responseCode?: number })?.code ?? 'sin_codigo',
        (err as { responseCode?: number })?.responseCode ?? '');
      return json({ sent: false, reason: 'smtp_error' }, 502);
    }
    return json({ sent: true });
  }

  const brevo = await fetch(BREVO_URL, {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      sender: { name: senderName, email: senderEmail },
      to: [{ email }],
      subject: title,
      htmlContent: html,
      textContent: text,
    }),
  });

  if (!brevo.ok) {
    // No se registra el cuerpo de la respuesta: puede traer datos del destinatario.
    console.error('Brevo respondió', brevo.status);
    return json({ sent: false, reason: 'brevo_error', status: brevo.status }, 502);
  }
  return json({ sent: true });
});

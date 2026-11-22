// Edge Function: envía un correo de aviso con Brevo (fase 3).
// La llama el trigger de `notifications` (migración 20261121000005) con la clave de servicio.
// Sin BREVO_API_KEY no envía nada: responde 200 { sent: false, reason: 'sin_clave' } y el aviso
// igual queda en la campana de la app.

import { createClient } from 'npm:@supabase/supabase-js@2';

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

const renderHtml = (title: string, body: string | null, link: string | null, siteUrl: string) => {
  const logo = `${siteUrl.replace(/\/+$/, '')}/img/logo.png`;
  const button = link
    ? `<p style="margin:28px 0 0"><a href="${escapeHtml(link)}" style="display:inline-block;background:#f26b1d;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:999px">Ver en Activa GYE</a></p>`
    : '';
  return `<!doctype html>
<html lang="es"><body style="margin:0;background:#f4f6fa;font-family:Arial,Helvetica,sans-serif;color:#1b2a4a">
<div style="max-width:560px;margin:0 auto;padding:24px">
  <div style="background:#ffffff;border-radius:20px;padding:28px">
    <img src="${escapeHtml(logo)}" alt="Activa GYE" height="44" style="display:block;height:44px;width:auto">
    <h1 style="font-size:20px;margin:24px 0 8px">${escapeHtml(title)}</h1>
    ${body ? `<p style="font-size:15px;line-height:1.6;margin:0">${escapeHtml(body)}</p>` : ''}
    ${button}
  </div>
  <p style="font-size:12px;color:#6b7a94;text-align:center;margin:16px 0 0">Recibiste este correo porque tienes una cuenta en Activa GYE.</p>
</div>
</body></html>`;
};

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405);

  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const auth = req.headers.get('Authorization') ?? '';
  // Solo la base de datos (trigger) o quien tenga la clave de servicio puede disparar correos.
  if (!serviceRole || auth !== `Bearer ${serviceRole}`) {
    return json({ error: 'No autorizado' }, 401);
  }

  let input: { user_id?: unknown; title?: unknown; body?: unknown; link?: unknown };
  try {
    input = await req.json();
  } catch {
    return json({ error: 'JSON no válido' }, 400);
  }
  if (typeof input.user_id !== 'string' || typeof input.title !== 'string' || !input.title.trim()) {
    return json({ error: 'Faltan user_id o title' }, 400);
  }
  const title = input.title.trim();
  const body = typeof input.body === 'string' && input.body.trim() ? input.body.trim() : null;
  const rawLink = typeof input.link === 'string' && input.link.trim() ? input.link.trim() : null;

  const apiKey = Deno.env.get('BREVO_API_KEY') ?? '';
  if (!apiKey) return json({ sent: false, reason: 'sin_clave' });

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const admin = createClient(supabaseUrl, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Solo se envía si la fase 3 está encendida.
  const { data: settings, error: settingsError } = await admin.rpc('get_public_settings');
  if (settingsError) return json({ sent: false, reason: 'error_configuracion' }, 500);
  if (!(settings as { phase3?: boolean } | null)?.phase3) {
    return json({ sent: false, reason: 'fase_apagada' });
  }

  const { data: userData, error: userError } = await admin.auth.admin.getUserById(input.user_id);
  const email = userData?.user?.email;
  if (userError || !email) return json({ sent: false, reason: 'sin_correo' });

  const siteUrl = Deno.env.get('SITE_URL') ?? '';
  const link = rawLink ? absoluteLink(rawLink, siteUrl) : null;
  const senderEmail = Deno.env.get('BREVO_SENDER_EMAIL') ?? '';
  const senderName = Deno.env.get('BREVO_SENDER_NAME') ?? 'Activa GYE';
  if (!senderEmail) return json({ sent: false, reason: 'sin_remitente' });

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
      htmlContent: renderHtml(title, body, link, siteUrl),
      textContent: [title, body, link].filter(Boolean).join('\n\n'),
    }),
  });

  if (!brevo.ok) {
    // No se registra el cuerpo de la respuesta: puede traer datos del destinatario.
    console.error('Brevo respondió', brevo.status);
    return json({ sent: false, reason: 'brevo_error', status: brevo.status }, 502);
  }
  return json({ sent: true });
});

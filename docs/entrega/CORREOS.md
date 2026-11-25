# Correos de aviso con Brevo (fase 3 y formulario de contacto)

Cada aviso de la campana (por ejemplo, «Nueva solicitud de atención») también se envía por correo
cuando la fase 3 está encendida y Brevo está configurado. Si falta cualquiera de los dos, el aviso
igual queda en la campana y no se envía nada.

**Formulario de contacto:** cada mensaje nuevo crea un aviso «Nuevo mensaje de contacto» para cada
cuenta con rol administrador, y ese aviso se envía por correo con esta misma configuración. Estos
correos salen aunque la fase 3 esté apagada (solo necesitan Brevo y el paso 3). El mensaje completo
sigue en *Admin → Mensajes*. El asunto y el texto los escribe cualquier visitante: no abras enlaces
sospechosos. Como mucho se envían 20 avisos de contacto por hora; si llegan más, se envía uno solo
(«Llegaron muchos mensajes») y el resto se lee en *Admin → Mensajes*.

**Al publicar la migración 17, vuelve a desplegar la función `enviar-correo` al mismo tiempo**
(`npx supabase functions deploy enviar-correo`). Con la función vieja, los correos de contacto no
salen mientras la fase 3 esté apagada.

Piezas:
- `supabase/functions/enviar-correo/index.ts`: la Edge Function que envía el correo con la API de Brevo.
- `supabase/migrations/20261121000005_correos.sql`: el trigger que llama a la función después de cada aviso nuevo (con `pg_net`).
- `supabase/migrations/20261125000017_contacto_correo_admins.sql`: el aviso de contacto para las administradoras.

## 1. Crear la cuenta gratis de Brevo

1. Entra a **brevo.com** y crea una cuenta. El plan gratis permite **300 correos por día**.
2. Ve a *SMTP & API* → *API Keys* y crea una clave de API (**no** la clave SMTP). Guárdala; no la compartas.
3. Ve a *Senders, Domains & Dedicated IPs* → *Senders* y agrega el remitente (correo y nombre).
   Brevo enviará un correo de verificación a esa dirección; confírmalo. Sin remitente verificado, Brevo rechaza los envíos.

## 2. Poner los secretos de la función

Desde la carpeta del proyecto (la dueña lo ejecuta, con la sesión de Supabase iniciada):

```bash
npx supabase secrets set BREVO_API_KEY=… BREVO_SENDER_EMAIL=… SITE_URL=…
```

- `BREVO_API_KEY`: la clave de API del paso 1.
- `BREVO_SENDER_EMAIL`: el remitente verificado (por ejemplo, `avisos@tu-dominio.com`).
- `SITE_URL`: la dirección pública del sitio, sin barra final (por ejemplo, `https://activa-gye.example`).
  Los enlaces de los avisos se arman con esta dirección.
- `BREVO_SENDER_NAME` (opcional): nombre que ve la persona que recibe el correo. Si no se pone, es «VITGO».

`SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` ya los pone Supabase en la función; no hay que ponerlos.

Después de cambiar secretos, vuelve a desplegar la función:

```bash
npx supabase functions deploy enviar-correo
```

## 3. Decirle a la base dónde está la función

El trigger necesita la dirección de las funciones y la clave de servicio. Una sola vez, en el
*SQL Editor* del panel de Supabase, como el usuario `postgres`:

```sql
alter database postgres set app.functions_url = 'https://<ref-del-proyecto>.supabase.co/functions/v1';
alter database postgres set app.service_role_key = '<clave service_role>';
```

Notas:
- La clave `service_role` queda guardada en la configuración de la base. Solo la pueden leer
  quienes administran la base. No la pegues en el código ni en el repositorio.
- Si cambias la clave, vuelve a ejecutar la segunda línea.
- Sin estas dos líneas, el trigger no hace nada (no es un error).

## 4. Revisar que funcione

1. En *Admin → Fases*, enciende la fase 3.
2. Haz que un usuario reciba un aviso (por ejemplo, un nutricionista acepta una solicitud).
3. Revisa el correo del usuario. Si no llega, mira *Logs* de la función `enviar-correo` en el panel
   de Supabase: la respuesta indica el motivo (`sin_clave`, `fase_apagada`, `sin_correo`, `sin_remitente`, `error_configuracion`, `brevo_error`).
4. En Brevo, *Statistics → Transactional → Logs*, revisa si el correo salió y si rebotó.
5. Para el contacto: con la fase 3 apagada, envía el formulario de *Contacto* sin iniciar sesión y
   revisa que llegue el correo «Nuevo mensaje de contacto» a cada administradora.

Mientras no haya clave de Brevo, la función responde `{ "sent": false, "reason": "sin_clave" }` y no envía nada.

## Límites

- 300 correos por día en el plan gratis de Brevo. Cada aviso es un correo; cada mensaje de contacto
  es un correo por administradora (como mucho 20 mensajes por hora).
- El envío es asíncrono: el correo puede llegar unos segundos después del aviso.
- Si el correo falla, el aviso igual queda en la campana. No hay reintentos automáticos.

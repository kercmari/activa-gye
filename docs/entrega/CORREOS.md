# Correos de aviso con Gmail o Brevo (fase 3 y formulario de contacto)

Cada aviso de la campana (por ejemplo, «Nueva solicitud de atención») también se envía por correo
cuando la fase 3 está encendida y hay un servicio de correo configurado (Gmail o Brevo). Si falta cualquiera de los dos, el aviso
igual queda en la campana y no se envía nada.

**Formulario de contacto:** cada mensaje nuevo crea un aviso «Nuevo mensaje de contacto» para cada
cuenta con rol administrador, y ese aviso se envía por correo con esta misma configuración. Estos
correos salen aunque la fase 3 esté apagada (solo necesitan el servicio de correo y el paso 3). El mensaje completo
sigue en *Admin → Mensajes*. El asunto y el texto los escribe cualquier visitante: no abras enlaces
sospechosos. Como mucho se envían 20 avisos de contacto por hora; si llegan más, se envía uno solo
(«Llegaron muchos mensajes») y el resto se lee en *Admin → Mensajes*.

**Al publicar la migración 17, vuelve a desplegar la función `enviar-correo` al mismo tiempo**
(`npx supabase functions deploy enviar-correo`). Con la función vieja, los correos de contacto no
salen mientras la fase 3 esté apagada.

Piezas:
- `supabase/functions/enviar-correo/index.ts`: la Edge Function que envía el correo por SMTP (Gmail) o con la API de Brevo.
- `supabase/migrations/20261121000005_correos.sql`: el trigger que llama a la función después de cada aviso nuevo (con `pg_net`).
- `supabase/migrations/20261125000017_contacto_correo_admins.sql`: el aviso de contacto para las administradoras.

## Opción recomendada: Gmail (gratis, unos 500 correos por día)

### A. Contraseña de aplicación de Google
1. En la cuenta de Google que enviará los correos, activa *Seguridad → Verificación en 2 pasos*.
2. Ve a *Seguridad → Contraseñas de aplicación* (o busca «contraseñas de aplicación» en la cuenta),
   crea una llamada `VITGO` y copia la clave de 16 letras. No la compartas ni la pegues en el código.

### B. Correos de registro y contraseña (Supabase Auth)
En el panel de Supabase, *Authentication → Emails → SMTP Settings*, activa *Enable custom SMTP*:
- Sender email: la cuenta de Gmail. Sender name: `VITGO`.
- Host: `smtp.gmail.com`. Port: `587`.
- Username: la cuenta de Gmail. Password: la contraseña de aplicación.

En *Authentication → URL Configuration*: Site URL = la dirección del sitio y, en Redirect URLs,
la misma dirección con `/**` al final.

### C. Avisos y contacto (la función `enviar-correo`)
En *Edge Functions → Secrets* agrega:
- `SMTP_HOST` = `smtp.gmail.com`
- `SMTP_PORT` = `465` (Supabase no deja salir por el 587 desde las funciones)
- `SMTP_USER` = la cuenta de Gmail
- `SMTP_PASS` = la contraseña de aplicación
- `SENDER_NAME` = `VITGO` (opcional)
- `SITE_URL` = la dirección del sitio, sin barra final

Con Gmail el remitente es la misma cuenta (`SMTP_USER`). Si están puestos `SMTP_*`, la función usa
Gmail aunque también exista `BREVO_API_KEY`. Luego sigue con el paso 3 (más abajo).

## Opción con Brevo

### 1. Crear la cuenta de Brevo

1. Entra a **brevo.com** y crea una cuenta. El plan gratis permite **300 correos por día**.
2. Ve a *SMTP & API* → *API Keys* y crea una clave de API (**no** la clave SMTP). Guárdala; no la compartas.
3. Ve a *Senders, Domains & Dedicated IPs* → *Senders* y agrega el remitente (correo y nombre).
   Brevo enviará un correo de verificación a esa dirección; confírmalo. Sin remitente verificado, Brevo rechaza los envíos.

### 2. Poner los secretos de la función

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
   de Supabase: la respuesta indica el motivo (`sin_clave`, `fase_apagada`, `sin_correo`, `sin_remitente`, `error_configuracion`, `smtp_error`, `brevo_error`).
4. Con Gmail, revisa la carpeta *Enviados* de la cuenta. Con Brevo, *Statistics → Transactional → Logs*.
5. Para el contacto: con la fase 3 apagada, envía el formulario de *Contacto* sin iniciar sesión y
   revisa que llegue el correo «Nuevo mensaje de contacto» a cada administradora.

Mientras no haya Gmail (`SMTP_*`) ni clave de Brevo, la función responde `{ "sent": false, "reason": "sin_clave" }` y no envía nada.

## Límites

- Gmail: unos 500 correos por día. Brevo (si se usa): 300 por día en su plan gratis. Cada aviso es un correo; cada mensaje de contacto
  es un correo por administradora (como mucho 20 mensajes por hora).
- El envío es asíncrono: el correo puede llegar unos segundos después del aviso.
- Si el correo falla, el aviso igual queda en la campana. No hay reintentos automáticos.

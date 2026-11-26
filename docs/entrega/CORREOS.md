# Correos de aviso con Gmail o Brevo (fase 3 y formulario de contacto)

Cada aviso de la campana (por ejemplo, «Nueva solicitud de atención») también se envía por correo
cuando la fase 3 está encendida y hay un servicio de correo configurado (Gmail o Brevo). Si falta cualquiera de los dos, el aviso
igual queda en la campana y no se envía nada.

**Formulario de contacto:** cada mensaje nuevo crea un aviso «Nuevo mensaje de contacto» para cada
cuenta con rol administrador, y ese aviso se envía por correo con esta misma configuración. Estos
correos salen aunque la fase 3 esté apagada (solo necesitan el servicio de correo y los pasos 2 y 3). El mensaje completo
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

## Paso 1, opción A (recomendada): Gmail, gratis

### A1. Contraseña de aplicación de Google
1. Usa una cuenta **personal** de Gmail (en cuentas de empresa o universidad el administrador
   puede tener apagadas las contraseñas de aplicación).
2. Activa *Seguridad → Verificación en 2 pasos*. Sin esto no aparece la opción siguiente.
3. Busca «Contraseñas de aplicación» en la cuenta, crea una llamada `VITGO` y copia la clave.
   Google la muestra en 4 grupos de 4 letras: cópiala **sin espacios**. No la compartas ni la pegues
   en el código.

### A2. Correos de registro y contraseña (Supabase Auth)
En el panel de Supabase, *Authentication → Emails → SMTP Settings*, activa *Enable custom SMTP*:
- Sender email: la cuenta de Gmail. Sender name: `VITGO`.
- Host: `smtp.gmail.com`. Port: `587`.
- Username: la cuenta de Gmail. Password: la contraseña de aplicación.

En *Authentication → URL Configuration*: Site URL = la dirección del sitio y, en Redirect URLs,
la misma dirección con `/**` al final. En *Authentication → Rate Limits* puedes subir los correos
por hora (por ejemplo, 30).

### A3. Avisos y contacto (secretos de la función `enviar-correo`)
En *Edge Functions → Secrets* (o con `npx supabase secrets set …`) agrega:
- `SMTP_HOST` = `smtp.gmail.com`
- `SMTP_PORT` = `465` (Supabase no deja salir por el 587 desde las funciones)
- `SMTP_USER` = la cuenta de Gmail
- `SMTP_PASS` = la contraseña de aplicación
- `SENDER_NAME` = `VITGO` (opcional)
- `SITE_URL` = la dirección del sitio, sin barra final

Con Gmail el remitente siempre es la cuenta de Gmail (`SMTP_USER`), salvo que pongas `SENDER_EMAIL`
con un alias verificado de esa cuenta. Si están puestos los `SMTP_*`, la función usa Gmail aunque
también exista `BREVO_API_KEY`; si Gmail falla no se intenta con Brevo (el aviso igual queda en la
campana). Sigue con el **paso 2**.

## Paso 1, opción B: Brevo

1. Entra a **brevo.com** y crea una cuenta.
2. Ve a *SMTP & API* → *API Keys* y crea una clave de API (**no** la clave SMTP). Guárdala; no la compartas.
3. Ve a *Senders, Domains & Dedicated IPs* → *Senders* y agrega el remitente (correo y nombre).
   Brevo enviará un correo de verificación a esa dirección; confírmalo. Sin remitente verificado, Brevo rechaza los envíos.
4. Pon los secretos de la función (en *Edge Functions → Secrets* o con
   `npx supabase secrets set BREVO_API_KEY=… BREVO_SENDER_EMAIL=… SITE_URL=…`):
   - `BREVO_API_KEY`: la clave de API.
   - `BREVO_SENDER_EMAIL`: el remitente verificado (por ejemplo, `avisos@tu-dominio.com`).
   - `SITE_URL`: la dirección pública del sitio, sin barra final (por ejemplo, `https://activa-gye.example`).
   - `BREVO_SENDER_NAME` (opcional): si no se pone, es «VITGO».

`SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` ya los pone Supabase en la función; no hay que ponerlos.

## Paso 2. Desplegar la función

La versión que envía por Gmail tiene que estar desplegada. Después de cambiar secretos, o al
publicar la migración 17, vuelve a desplegarla:

```bash
npx supabase functions deploy enviar-correo
```

## Paso 3. Decirle a la base dónde está la función

El trigger necesita la dirección de las funciones y la clave de servicio. Una sola vez, en el
*SQL Editor* del panel de Supabase, como el usuario `postgres`:

```sql
alter database postgres set app.functions_url = 'https://<ref-del-proyecto>.supabase.co/functions/v1';
alter database postgres set app.service_role_key = '<clave service_role>';
```

- `<ref-del-proyecto>`: el *Project ID* de *Project Settings → General*.
- `<clave service_role>`: **la clave antigua (legacy)**, en *Project Settings → API Keys → Legacy API
  keys → service_role*. Empieza con `eyJ`. **No** uses la nueva `sb_secret_…`: con esa la función
  responde 401 («No autorizado») y no sale ningún correo.

Para comprobar que quedó guardado, abre otra pestaña del *SQL Editor* y ejecuta
`select current_setting('app.functions_url', true);` (debe mostrar la dirección).

Notas:
- La clave `service_role` queda guardada en la configuración de la base. Solo la pueden leer
  quienes administran la base. No la pegues en el código ni en el repositorio.
- Si cambias la clave, vuelve a ejecutar la segunda línea.
- Sin estas dos líneas, el trigger no hace nada (no es un error).

## Paso 4. Revisar que funcione

1. **Contacto:** con la fase 3 apagada, envía el formulario de *Contacto* sin iniciar sesión y
   revisa que llegue el correo «Nuevo mensaje de contacto» a cada administradora.
2. **Avisos:** en *Admin → Fases* enciende la fase 3 y haz que un usuario reciba un aviso (por
   ejemplo, un nutricionista acepta una solicitud). Revisa el correo de ese usuario.
3. Con Gmail, mira la carpeta *Enviados* de la cuenta. Con Brevo, *Statistics → Transactional → Logs*.

Si no llega (revisa también *Spam*):
- En el *SQL Editor*: `select status_code, content from net._http_response order by created desc limit 5;`
  muestra la respuesta de la función. `401` = clave del paso 3 equivocada. Si no, el `reason` dice el
  motivo: `sin_clave`, `fase_apagada`, `sin_correo`, `sin_remitente`, `error_configuracion`,
  `smtp_error`, `brevo_error`.
- Con `smtp_error`, en *Edge Functions → enviar-correo → Logs* aparece el código: `EAUTH`
  (contraseña de aplicación incorrecta), `ETIMEDOUT` (puerto bloqueado), `EDNS`/`ENOTFOUND` o `ESOCKET`.

## Límites

- Gmail: unos 500 correos por día, sumando los de registro y contraseña (paso A2) y los avisos.
  Brevo (si se usa): 300 por día en su plan gratis.
- Cada aviso es un correo; cada mensaje de contacto es un correo por administradora (como mucho
  20 mensajes por hora).
- El envío es asíncrono: el correo puede llegar unos segundos después del aviso.
- Si el correo falla, el aviso igual queda en la campana. No hay reintentos automáticos.

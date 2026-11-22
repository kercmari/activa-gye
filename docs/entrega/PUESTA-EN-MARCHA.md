# Puesta en marcha (para la dueña)

Esta guía explica, paso a paso, cómo dejar Activa GYE publicada con una base de datos real. Todo es gratis. Lo que se hace una sola vez está marcado como **(una vez)**.

Antes de empezar necesitas: una cuenta de correo, Node.js 20 o más nuevo, y el proyecto descargado en tu computadora.

---

## 1. Crear el proyecto en Supabase **(una vez)**

1. Entra a **supabase.com** y crea una cuenta gratis.
2. Pulsa **New project**. Ponle un nombre (por ejemplo, `activa-gye`).
3. En **Region** elige **São Paulo** (la más cercana a Ecuador).
4. Escribe una contraseña para la base de datos y **guárdala en un lugar seguro**. Supabase no la vuelve a mostrar.
5. Espera unos minutos a que el proyecto termine de crearse.

## 2. Conectar la computadora con Supabase **(una vez)**

En una terminal, dentro de la carpeta del proyecto:

```bash
npx supabase login
```

Se abre el navegador para que autorices la CLI. Cuando termine, vuelve a la terminal.

Luego vincula el proyecto. El **ref** del proyecto aparece en la dirección del panel de Supabase (`https://supabase.com/dashboard/project/<ref>`) o en **Project Settings → General**:

```bash
npx supabase link --project-ref <ref>
```

Te pedirá la contraseña de la base que guardaste en el paso 1.

## 3. Subir el esquema (las tablas) **(cada vez que cambie la base)**

```bash
npx supabase db push
```

Esto crea en la nube las tablas, las reglas de seguridad (quién ve qué) y las fases. Al terminar, la fase 1 queda encendida y las fases 2 y 3 apagadas.

## 4. Cargar los lugares de la semilla **(una vez)**

Los lugares deportivos están en el archivo `supabase/seed.sql`. Para la nube hay que cargar **solo los lugares**, no las cuentas de prueba.

1. Abre el archivo `supabase/seed.sql` con un editor de texto (Bloc de notas, VS Code, etc.).
2. **Copia todo el contenido, pero borra el bloque que empieza en la línea** `-- CUENTAS LOCALES: NO se carga en la nube...` **y termina en la línea** `select set_config('activa.allow_role_change', 'off', true);` (incluida). Deja la línea `commit;` del final.
3. En el panel de Supabase, abre **SQL Editor → New query**.
4. Pega el texto que quedó y pulsa **Run**.

> Importante: **no** cargues las cuentas de prueba en la nube. Las contraseñas de esas cuentas son conocidas y son solo para la computadora de desarrollo.

## 5. Crear tu cuenta de administradora **(una vez)**

1. Abre la página publicada (o `npm run dev` en tu computadora) y **regístrate** con tu correo, como cualquier persona.
2. Si Supabase te pide confirmar el correo, abre el enlace que te llega antes de entrar.
3. En Supabase, abre **SQL Editor → New query** y ejecuta, cambiando el correo por el tuyo:

```sql
update profiles set role = 'admin'
where id = (select id from auth.users where email = 'tu-correo@ejemplo.com');
```

4. Vuelve a entrar en la página. Ya verás **Admin** en el menú.

## 6. Poner las claves en el proyecto **(una vez, y si cambias de proyecto)**

En Supabase: **Project Settings → API**. Copia:

- **Project URL**
- **anon public** (la clave *anon*, no la *service_role*)

En la carpeta del proyecto, crea el archivo `.env.production.local` con este contenido, reemplazando los valores:

```
VITE_SUPABASE_URL=https://<tu-proyecto>.supabase.co
VITE_SUPABASE_ANON_KEY=<tu-clave-anon>
```

La clave *anon* es pública (va dentro de la página), pero **nunca** pongas en ningún archivo la clave *service_role*. Este archivo no se sube a GitHub.

## 7. Generar la página y publicarla

```bash
npm run build
npx wrangler deploy
```

Si Cloudflare te pide entrar, ejecuta antes `npx wrangler login` (abre el navegador). `npx wrangler deploy` publica la carpeta `dist/` en Cloudflare Workers.

Al terminar, la dirección de la página aparece en la terminal. Abre esa dirección y prueba el registro y el ingreso.

Si el enlace del correo de confirmación abre `localhost` en vez de la página publicada, revisa en Supabase **Authentication → URL Configuration** que la dirección del sitio sea la publicada.

## 8. Encender las fases **(cuando estés lista)**

La fase 1 (ingreso y ficha) ya viene encendida. Para encender las demás:

1. Entra a la página con tu cuenta de administradora.
2. Ve a **Admin → Fases**.
3. Marca la fase que quieras (2 o 3) y guarda. También puedes cambiar el cupo de pacientes de la fase 1 y 2 (5 por defecto).

Una fase apagada se ve como «Próximamente» en la página, y la base tampoco deja usarla por detrás. Puedes apagarla de nuevo cuando quieras.

Los precios de los planes de nutricionistas (Básico y Pro) son valores iniciales. Cámbialos en **Admin → Pagos** antes de cobrar.

## 9. Correos de aviso (fase 3) **(opcional, aún no está lista)**

Los avisos siempre quedan en la campana de la página. Para que además salgan **correos**, hace falta una cuenta gratis en **brevo.com** y su clave, guardada como secreto de Supabase. Esta parte todavía no está escrita: consulta `docs/entrega/PENDIENTES-Y-PROXIMOS-PASOS.md`.

---

## Si la base se pausa

El plan gratis de Supabase **se pausa después de 7 días sin uso**. Cuando pase, la página mostrará errores de carga. Para reactivarla:

1. Entra a **supabase.com** y abre tu proyecto.
2. Pulsa el botón para **restaurar** (*Restore project*) que aparece en el panel del proyecto.
3. Espera unos minutos y recarga la página publicada.

Los datos no se pierden al pausarse.

---

## Resumen rápido

| Paso | Qué | ¿Cuándo? |
|---|---|---|
| 1 | Crear proyecto en supabase.com (São Paulo) | Una vez |
| 2 | `npx supabase login` y `npx supabase link --project-ref <ref>` | Una vez |
| 3 | `npx supabase db push` | Cada vez que cambie la base |
| 4 | Pegar `supabase/seed.sql` sin el bloque `-- CUENTAS LOCALES` | Una vez |
| 5 | Registrarte y hacerte admin con SQL | Una vez |
| 6 | Claves en `.env.production.local` | Una vez |
| 7 | `npm run build` y `npx wrangler deploy` | Cada publicación |
| 8 | Encender fases en Admin → Fases | Cuando corresponda |

# Registro con tipo de cuenta y foto; Nutrición como inicio (22/11/2026)

Pedido de la dueña: «el registro debe permitir soy nutricionista o soy profesional al momento de registrar; la página de nutricionista dejarla como home principal y lo otro dejarlo en el panel de deportes; en el formulario se debe agregar foto».
Decisiones de la dueña (22/11):
- Opciones: **Soy paciente** / **Soy nutricionista**.
- Quien elige nutricionista queda **pendiente** hasta que el admin lo **aprueba** (nadie ve fichas de pacientes sin verificarse).
- La foto es **obligatoria** al registrarse.
- `/` pasa a ser Nutrición; el inicio actual (buscador, deportes, lugares recomendados) pasa a **Panel de deportes** en `/deportes`.

Reglas que siguen valiendo: fases (`usePhase(n)`, vistas apagadas no se ven), cupo de pacientes, mínimo 16 años, textos en español de Ecuador, 360 px y 1280 px, ningún botón sin acción ni pantalla sin salida, commits sin `Co-Authored-By`.

## 1. Base de datos — migración `supabase/migrations/20261122000010_registro_rol_foto.sql`
- `profiles`: columnas nuevas
  - `requested_role text null check (requested_role in ('nutricionista'))`
  - `nutri_status text null check (nutri_status in ('pendiente','aprobado','rechazado'))`
  - `avatar_path text null` (ruta en el bucket `avatars`: `'<user_id>/<archivo>'`).
- Nadie cambia su propio `requested_role` ni `nutri_status` desde la página (trigger como `protect_role`, mismo permiso `activa.allow_role_change`). `avatar_path` sí lo cambia el propio usuario.
- `handle_new_user` (copia la versión **vigente** de la migración 2 y conserva todo): lee `raw_user_meta_data ->> 'account_type'` (`'paciente'` por defecto, o `'nutricionista'`). Si es nutricionista: **no** aplica el cupo de pacientes e inserta `requested_role='nutricionista'`, `nutri_status='pendiente'` (el rol sigue `'usuario'`). Cualquier otro valor → `DATOS_INVALIDOS`.
- El conteo de pacientes (en `handle_new_user` y en `get_public_settings.patients_count`) cuenta solo `role='usuario' and requested_role is null`. Copia `get_public_settings` vigente y cambia solo eso.
- `admin_review_nutri(target uuid, approve boolean) returns void`, security definer, solo admin (si no → `SOLO_ADMIN`), y solo si `nutri_status='pendiente'` (si no → `SIN_SOLICITUD`). Aprobar → `role='nutricionista'`, `nutri_status='aprobado'`. Rechazar → `nutri_status='rechazado'` (sigue `usuario`). Crea un aviso en `notifications` para esa persona si la tabla lo permite.
- `admin_list_users` devuelve además `requested_role`, `nutri_status`, `avatar_path` (drop + create con los mismos grants; los pendientes primero).
- Bucket privado `avatars` (2 MB, `image/jpeg`, `image/png`, `image/webp`). Políticas: insertar/actualizar/borrar solo en tu carpeta; leer tu carpeta o `is_staff()`.
- Grants como en las migraciones anteriores (revisa `20261122000009_permisos_nube.sql`: la nube necesita los grants explícitos). Pruebas pgTAP en `supabase/tests/08_registro_rol_foto.sql`.

## 2. Contrato de datos (`src/data/types.ts`)
- `SignUpInput` += `account_type: 'paciente' | 'nutricionista'`, `photo: File`.
- `Profile` += `avatar_path: string | null`, `requested_role: 'nutricionista' | null`, `nutri_status: 'pendiente' | 'aprobado' | 'rechazado' | null`.
- `AdminUser` += `requested_role`, `nutri_status`, `avatar_path` (mismos tipos).
- `Repo` +=
  - `uploadAvatar(file: File): Promise<Profile>` — valida tipo/tamaño (`FOTO_INVALIDA`), reduce a lado 512 JPEG, sube a `avatars/<uid>/avatar.jpg` (upsert) y guarda `avatar_path`.
  - `avatarUrl(path: string | null): Promise<string | null>` — URL firmada (1 h) o `null`.
  - `adminReviewNutri(userId: string, approve: boolean): Promise<void>`.
- `signUp`: valida la foto antes de crear la cuenta (`FOTO_REQUERIDA` «Agrega una foto tuya.» si falta; `FOTO_INVALIDA` si no sirve). El cupo solo frena a pacientes. Con sesión → sube la foto enseguida. Sin sesión (`CORREO_SIN_CONFIRMAR`) → guarda la foto reducida en `localStorage` (`activa.fotoPendiente.<correo>`) y `signIn` la sube y la borra en el primer ingreso. Si la subida falla tras crear la cuenta, la cuenta queda y el perfil pide la foto (no se pierde el registro).
- El simulador (`src/data/mock`) hace lo mismo con data URL.

## 3. Pantallas
- **Registro** (`/registro`, `?tipo=paciente|nutricionista` preselecciona): primero «¿Cómo te registras?» con dos tarjetas-radio grandes (Soy paciente / Soy nutricionista, accesibles con teclado). Foto obligatoria con vista previa, botón para cambiarla y error en su campo. Paciente: aviso de cupos como hoy. Nutricionista: «Tu cuenta de nutricionista queda en revisión. El equipo la aprueba y te avisamos.»; el cupo lleno no lo bloquea.
- Tras registrarse: paciente → `/mi-panel` (como hoy); nutricionista pendiente → `/perfil` con aviso «Tu solicitud de nutricionista está en revisión».
- **Perfil** y **Editar perfil**: muestran la foto y permiten cambiarla. Si falta, aviso «Agrega tu foto» con botón.
- **Encabezado**: el círculo de cuenta muestra la foto si existe (si no, la inicial).
- **Admin → Usuarios**: bloque «Solicitudes de nutricionista» arriba con foto, nombre, correo y botones Aprobar / Rechazar (con confirmación); estado visible en cada fila.
- **Inicio `/`** = Nutrición: la página de Nutrición convertida en portada (héroe con foto, «Cómo funciona» con las reglas de fase de hoy, botones «Soy paciente» → `/registro?tipo=paciente` y «Soy nutricionista» → `/registro?tipo=nutricionista`; con sesión, «Ir a mi ficha»). `/nutricion` redirige a `/`.
- **Panel de deportes `/deportes`**: el contenido del inicio actual (buscador, «Explora por deporte», «Lugares recomendados») + accesos a Buscar lugares, Comparar y Guía (si la guía es de deportes; si es de nutrición queda en el menú principal). La lista vieja de deportes queda en `/deportes/todos` si el panel no la muestra completa. `/deportes/:slug`, `/lugares`, `/comparar` no cambian.
- **Menú** (escritorio, móvil y pie): Inicio, Deportes, (Guía si es de nutrición), Conócenos, Contacto. El botón naranja lleva a `/deportes`.

## 4. Nube (no se hace en esta ronda)
Aplicar la migración 10 al proyecto Supabase en la nube y volver a publicar la página: solo con el OK de la dueña.

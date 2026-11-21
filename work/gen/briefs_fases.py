"""Briefs del backend en 3 fases (haiku implementa, opus revisa). Uso: python3 -I work/gen/briefs_fases.py"""
from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / 'briefs'
OUT.mkdir(exist_ok=True)
DESIGN = 'docs/superpowers/specs/2026-11-21-activa-gye-fases-backend-design.md'
PLAN = 'docs/superpowers/plans/2026-11-21-activa-gye-backend-fases.md'
DB = 'docs/superpowers/plans/2026-11-21-db-contrato.md'

COMMON = f"""**Proyecto:** Activa GYE. Plataforma intermediaria tipo Uber: el **paciente** llena su ficha y pide atención; un **nutricionista** la acepta y lo acompaña (calendario, seguimiento, facturas). Sin IA. Además, buscador de lugares deportivos de Guayaquil (ya hecho, no lo rompas). Se entrega en **3 fases** que se encienden en la base (`app_settings`).
**Lee primero:** `work/TOKEN-PROTOCOL.md` (reglas y gates, obligatorio); `{DESIGN}` (qué es cada fase, §2, §7, §8); `{PLAN}` (quién hace qué); `src/data/types.ts` (contrato `Repo`: NO lo cambies); `{DB}` (nombres exactos de tablas y funciones: NO inventes otros).
**Convenciones fijas:**
- Stack: React 19 + TypeScript + Vite + Tailwind v4 + `react-router` v8 (importa SIEMPRE desde `'react-router'`). Íconos `lucide-react`. Tests: Vitest + Testing Library (jsdom, `src/test/setup.ts`).
- Datos: SOLO con `import {{ repo }} from '<ruta>/data'`. Sesión: `useAuth()` de `src/auth/AuthContext` → `{{ session, loading, refresh }}`. Fases: `useSettings()` / `usePhase(n)` de `src/auth/SettingsContext` y el componente `src/components/PhaseGate.tsx` (`<PhaseGate phase={{2}} title="…">…</PhaseGate>`, muestra «Próximamente» si la fase está apagada).
- UI ya hecha y reutilizable: `src/components/ui/` (`Button`, `LinkButton`, `BackButton`, `PageHeader`, `States` → `Loading`, `EmptyState`, `ErrorState`, `errorMessage`; `Field` → `TextField`, `SelectField`, `TextArea`; `Badge`), `src/components/profile/` (`ConfirmDialog`, `WeightChart`, `useAsync`, `labels`), `src/components/nutrition/labels.ts` (opciones de sexo, objetivo, actividad), `src/components/admin/AdminShell.tsx` (marco del panel admin), `src/lib/image.ts` (reducir foto), `src/lib/nutrition/guide.ts` (`buildBasicGuide`: estimación sin IA). Míralos antes de crear algo parecido.
- Estilo: el de las páginas existentes (`bg-navy-900`, `text-navy-900`, `bg-brand-orange`, `text-brand-orange`, `bg-surface`, tarjetas `rounded-[1.75rem] bg-white shadow-xl shadow-navy-900/5`, títulos `.display`, etiquetas `.eyebrow`, contenedor `mx-auto max-w-6xl px-4`). Bien a 360 px y a 1280 px.
- Cada carga: estados cargando (`role="status"`), vacío (mensaje + acción), error (mensaje + «Reintentar»), contenido. **Ningún botón sin acción ni pantalla sin salida** (botón «Volver» o enlace de regreso).
- Textos en español de Ecuador. Errores: `errorMessage(e)`. Sin datos inventados.
- Los archivos marcador (`Pending` o «En construcción») de tu tarea: reemplázalos por completo.
- **Commits sin la línea `Co-Authored-By`** (regla de la dueña). El autor ya está configurado: no lo cambies.
"""

GATES = """**Tiempo:** máximo 20 minutos. Commit apenas algo funcione con gates verdes; luego sigue. Lo commiteado vale.
**Gates antes de cada commit:** `npm run -s lint` (0 errores), `npm run -s build` (exit 0), `npx vitest run` (verde). Reporta los números.
"""

SQL_RULES = f"""**Reglas SQL:**
- Solo tu archivo de migración (nombre exacto del contrato). Nunca edites migraciones anteriores.
- Sigue `{DB}` al pie de la letra (nombres, columnas, códigos de error). Si algo no cuadra, anótalo en «Pedidos al orquestador».
- **Tienes la base local para ti solo en esta ronda.** Prueba así: `npx supabase db reset` (aplica migraciones + `supabase/seed.sql`) y luego `npx supabase test db`. NUNCA `supabase start/stop`, NUNCA `db push`, NUNCA `link`.
- Pruebas pgTAP en tu archivo de `supabase/tests/` (`begin; select plan(n); … select * from finish(); rollback;`). Para actuar como un usuario: crea usuarios con `insert into auth.users(id, email, raw_user_meta_data, …)` (el trigger crea el perfil) y luego `set local role authenticated; select set_config('request.jwt.claims', json_build_object('sub', '<uuid>', 'role', 'authenticated')::text, true);`. Vuelve a `reset role;` para preparar datos como superusuario.
- Gates: `npx supabase db reset` sin errores + `npx supabase test db` verde + los gates normales (lint/build/vitest).
"""


def impl(name, title, owns, body, tests, nxt, extra=''):
    fix = lambda t: t.replace('{{', '{').replace('}}', '}')
    owns, body, tests, extra = fix(owns), fix(body), fix(tests), fix(extra)
    text = f"""# {name} — IMPLEMENTADOR (haiku) — {title}
**Reporte:** `work/out/{name}/report.md` (qué hiciste, archivos, gates con números, «Pedidos al orquestador», pendientes).
**Commits:** empiezan con `{name}: `.
{COMMON}
{extra}
**Archivos que son tuyos (solo estos):** {owns}

## Qué construir
{body}

## Tests obligatorios
{tests}

{GATES}
**Última línea del reporte:** `NEXT: la cadena sigue con {nxt}.`
"""
    (OUT / f'{name}.md').write_text(text)


def review(name, title, scope, falsify):
    text = f"""# {name} — REVISOR (opus) — {title}
**Reglas:** solo revisar: nunca edites, nunca commit, nunca push. Sigue `work/TOKEN-PROTOCOL.md` (regla 3). Máximo 20 minutos.
**Hallazgos:** `work/out/{name}/report.md`
**Lee:** `{DESIGN}`, `{PLAN}`, `{DB}`, `src/data/types.ts`, los reportes `work/out/*/report.md` y `git log --oneline -60`.
**Alcance:** {scope}
**Mide, no confíes en los reportes.** Gates: `npm run -s lint`, `npm run -s build`, `npx vitest run`, `npx supabase test db`, `npx playwright test --reporter=line` (la base local ya está lista con la semilla; NO hagas `db reset`, `start` ni `stop`).
**Intenta romper:**
{falsify}
**Veredicto:** la línea `## Verdict: **SHIP**` o `## Verdict: **DO NOT SHIP**` (inglés, exacto). DO NOT SHIP solo por: un usuario ve datos/fotos de otro; una fase apagada se puede usar; pago que se puede marcar pagado por quien no debe; botón sin acción; pantalla sin salida; crash; gate rojo; texto falso visible. Luego `HOTFIX NOW` / `BLOCKING` (archivo:línea + cómo reproducir + arreglo sugerido) / `non-blocking`. A cada BLOCKING ponle área: `[sql]`, `[datos]`, `[paciente]`, `[nutri]`, `[admin]`, `[fase3]`, `[e2e]`.
**Última línea:** `NEXT: el orquestador lee {name}.`
"""
    (OUT / f'{name}.md').write_text(text)


# ================================================================== RONDA 1
impl('S1', 'Migración 2: fases, cupo, ficha y solicitudes',
     '`supabase/migrations/20261121000002_fases_ficha_solicitudes.sql`, `supabase/tests/01_fases_ficha_solicitudes.sql`.',
     f"""Implementa TODA la sección «Migración 2» de `{DB}`. En orden: `app_settings` + fila 1 → `phase_on` → `get_public_settings` → `admin_set_settings` → reemplazo de `handle_new_user` (lee la versión actual en la migración 1 y conserva todo) → `drop` de `nutrition_requests` y sus funciones → `is_my_patient` → `patient_intakes` (+ trigger + RLS) → `care_requests` (+ índice único parcial + RLS) → RPCs `request_care`, `cancel_care_request`, `accept_care_request`, `finish_care_request`, `my_care_request`, `my_nutritionist`, `list_open_care_requests`, `list_my_patients`, `rating_summary` → nueva política de `profiles` → políticas de storage `body-photos` (borra las viejas con `drop policy if exists`).
Grants: ver el contrato. `get_public_settings` y `rating_summary` también a `anon`.
""",
     """`supabase/tests/01_fases_ficha_solicitudes.sql` (pgTAP), como mínimo:
1. `get_public_settings()` devuelve phase1 true, phase2 false, phase3 false, patient_limit 5.
2. un no-admin que llama `admin_set_settings` → error `SOLO_ADMIN`; un admin sí cambia los valores.
3. con `patient_limit = 1` y un paciente ya creado, crear otro usuario → error `CUPO_LLENO`; con `phase3 = true` sí se crea.
4. paciente guarda su ficha; otro paciente NO la ve (0 filas); con foto y menor de 18 → `FOTO_MENOR_18`.
5. con `phase2 = false`, `request_care` → `FASE_NO_ACTIVA`; con `phase2 = true` y sin ficha → `FALTA_FICHA`; con ficha → crea `abierta`; una segunda → `YA_TIENES_SOLICITUD`.
6. nutricionista ve la solicitud en `list_open_care_requests`; la acepta; un segundo nutricionista que la acepta → `YA_TOMADA`; `is_my_patient` true solo para el primero.
7. el nutricionista asignado ve el perfil y la ficha del paciente; otro nutricionista NO.""",
     'S3 en la ronda 2', SQL_RULES)

impl('S2', 'Semilla local: 300 lugares y 3 cuentas de prueba',
     '`scripts/seed-sql.mjs`, `supabase/seed.sql`, y `package.json` NO (pide al orquestador el script npm si lo quieres).',
     f"""Lee `{DB}` (sección «Semilla») y la migración 1 (`places`, `place_sports`, `sectors`, `sports`).
1. `scripts/seed-sql.mjs` (Node, sin dependencias nuevas): lee `src/data/mock/places.osm.json` y escribe `supabase/seed.sql`:
   - `insert into public.places (id, name, description, address, sector_id, lat, lng, phone, whatsapp, website, instagram, photo_url, gallery, price_from, price_note, promotions, services, hours, source, osm_id, published, verified_at) values … on conflict (id) do nothing;` Revisa los tipos de cada columna en la migración 1 (por ejemplo, si `id` es uuid o text, `gallery`/`services` son arrays, `hours` jsonb) y adapta el valor; si `id` es uuid y el JSON trae `osm-node-…`, genera un uuid **determinístico** a partir del id OSM (p. ej. `md5(id)::uuid` en SQL) y guarda el id original en `osm_id`. Escapa comillas simples. Si `sector_id` no existe en `sectors`, pon null.
   - `insert into public.place_sports (place_id, sport_id) …` para cada `sport_ids`.
   - Bloque `-- CUENTAS LOCALES` (con un comentario que diga que NO se carga en la nube): 3 usuarios en `auth.users` (+ `auth.identities`, proveedor `email`) con las contraseñas de `docs/entrega/CUENTAS-DE-PRUEBA.md`, `crypt(clave, gen_salt('bf'))`, `email_confirmed_at = now()`, `raw_user_meta_data` con `full_name` y `birth_date` (adulto). Después `update public.profiles set role = …` para admin y nutricionista (si el trigger `protect_role` lo impide, desactívalo dentro de la semilla con `alter table … disable trigger profiles_protect_role` y vuelve a activarlo).
   - Todo dentro de un `begin; … commit;`.
2. Córrelo (`node scripts/seed-sql.mjs`) y commitea `supabase/seed.sql`.
3. **No** corras `db reset` (la base es de S1 en esta ronda). Valida el SQL así: `grep -c "insert into public.places" supabase/seed.sql` y que el archivo no tenga `undefined` ni `NaN`. El orquestador lo prueba al final de la ronda.
""",
     """- `scripts/seed-sql.test.mjs` NO es necesario. Verifica a mano con `grep` y reporta: cuántos lugares, cuántos place_sports, que no hay `undefined`/`NaN`.""",
     'S3 en la ronda 2')

impl('D1', 'Supabase: cliente, errores, catálogo y cuenta',
     '`src/data/supabase/client.ts`, `src/data/supabase/errors.ts`, `src/data/supabase/catalog.ts`, `src/data/supabase/account.ts` y sus `*.test.ts`. NO toques `src/data/supabase/index.ts` (lo arma el orquestador).',
     f"""Hoy `src/data/supabase/catalog.ts` y `account.ts` son marcadores. Implementa con `@supabase/supabase-js` (ya instalado) las partes del `Repo` que usan tablas de la **migración 1** (lee `supabase/migrations/20261121000001_esquema_inicial.sql`) y las RPC de fases de `{DB}`.
1. `client.ts`: `export const supabase = createClient(import.meta.env.VITE_SUPABASE_URL ?? 'http://localhost', import.meta.env.VITE_SUPABASE_ANON_KEY ?? 'anon', {{ auth: {{ persistSession: true, autoRefreshToken: true }} }})`.
2. `errors.ts`: `toAppError(e: unknown): AppError`. Mapa de códigos → mensaje en español para TODOS los códigos de la lista de `src/data/types.ts` (p. ej. `CUPO_LLENO` → «Por ahora no hay cupos para nuevos pacientes. Inténtalo más adelante.», `FASE_NO_ACTIVA` → «Esta función aún no está habilitada.», `SIN_SUSCRIPCION` → «Necesitas una suscripción activa para aceptar pacientes.»). Reglas: si `e.message` es un código conocido → ese; `Invalid login credentials` → `CREDENCIALES`; `User already registered` → `CORREO_EN_USO`; `JWT`/sin sesión → `SIN_SESION`; errores de red → `DATOS_INVALIDOS` no: usa código `RED` con «No pudimos conectarnos. Revisa tu internet.»; lo demás → `DATOS_INVALIDOS` «Revisa los datos e inténtalo de nuevo.». También `unwrap<T>({{ data, error }})` que lanza `toAppError(error)` o devuelve `data`.
3. `catalog.ts` → `export const catalogPart: Partial<Repo>` con `listSectors`, `listSports` (ordenados por `sort`), `searchPlaces` (trae publicados con `place_sports(sport_id)` y filtra en el cliente igual que `src/data/mock/catalog.ts`: copia su lógica de filtros usando `src/lib/hours.ts`; `sport_ids` = lista de `place_sports`), `getPlace`, `getPlaces`, `adminListPlaces`, `adminSavePlace` (upsert + reemplaza `place_sports`), `adminSetPublished`, `adminListIncompletePlaces` (admin: `price_from is null or hours is null`, por nombre), `sendContact` (insert en `contact_messages`), `adminListMessages`, `adminMarkMessageRead`.
4. `account.ts` → `export const accountPart: Partial<Repo>` con `getSession` (sesión de auth + fila de `profiles`), `onAuthChange` (`supabase.auth.onAuthStateChange` → vuelve a leer el perfil; devuelve la función que desuscribe), `signUp` (ANTES: lee `get_public_settings`; si `!phase3 && patients_count >= patient_limit` → `AppError('CUPO_LLENO')`; valida edad ≥ 16 en el cliente → `MENOR_DE_16`; luego `auth.signUp({{ email, password, options: {{ data: {{ full_name, birth_date }} }} }})`; si responde «Database error saving new user» vuelve a leer settings y lanza `CUPO_LLENO` si está lleno, si no `DATOS_INVALIDOS`), `signIn`, `signOut`, `requestPasswordReset` (`resetPasswordForEmail` con `redirectTo: location.origin + '/ingresar'`), `updateProfile`, `deleteMyAccount` (RPC `delete_my_account` + `signOut`), `listFavorites`, `isFavorite`, `toggleFavorite`, `listProgress`, `addProgress`, `deleteProgress`, `adminListUsers` (RPC `admin_list_users`), `adminSetRole` (RPC `admin_set_role`), `getSettings` (RPC `get_public_settings`), `adminSaveSettings` (RPC `admin_set_settings`).
Todas las funciones: errores con `toAppError`; sin sesión donde se necesita → `SIN_SESION`.
""",
     """Con `vi.mock('./client', …)` (un objeto `supabase` falso con `from().select()…`, `rpc`, `auth`), en `src/data/supabase/account.test.ts` y `errors.test.ts`:
- `toAppError` traduce `{ message: 'CUPO_LLENO' }`, `Invalid login credentials` y un error desconocido.
- `signUp` con settings llenos lanza `CUPO_LLENO` SIN llamar a `auth.signUp`.
- `signUp` con menor de 16 lanza `MENOR_DE_16`.
- `getSettings` llama `rpc('get_public_settings')` y devuelve sus campos.
- `adminSaveSettings` llama `rpc('admin_set_settings', { p_phase1, p_phase2, p_phase3, p_patient_limit })`.""",
     'D2 en la ronda 2')

impl('U1a', 'Panel del paciente y pestaña «Mi ficha»',
     '`src/pages/panel/MiPanelPage.tsx`, `src/components/panel/FichaTab.tsx` (+ `src/components/panel/*` nuevos que crees, excepto `MiNutricionistaTab.tsx`, `CalendarioTab.tsx` y `PagosTab.tsx`) y sus `*.test.tsx`.',
     """1. **`MiPanelPage`** (`/mi-panel`, con sesión): `PageHeader` («MI PANEL», «Hola, <nombre>», botón Volver a `/perfil`). Pestañas accesibles (`role="tablist"`, como `src/pages/PerfilPage.tsx`) guardadas en `?tab=`: `ficha` «Mi ficha» (por defecto), `calendario` «Calendario y progreso», `pagos` «Pagos», `nutricionista` «Mi nutricionista». Las 3 últimas muestran un candado pequeño en el título si la fase 2 está apagada, y su panel va envuelto en `<PhaseGate phase={2} title="…">` con el componente marcador (`CalendarioTab`, `PagosTab`, `MiNutricionistaTab`: impórtalos, NO los edites).
2. **`FichaTab`** = formulario de la ficha inicial (`repo.getMyIntake()` + datos del perfil de `useAuth()`):
   - Campos: Nombre completo, Fecha de nacimiento (muestra «Edad: N años» al lado), Género (`SEX_OPTIONS`), Peso (kg), Estatura (cm), Cintura (cm, opcional), Objetivo (`GOAL_OPTIONS`, opcional), Nivel de actividad (`ACTIVITY_OPTIONS`, opcional), Notas de salud (opcional, ≤1000: alergias, lesiones…).
   - **Foto de cuerpo entero** (opcional): input de archivo (jpg/png/webp ≤ 5 MB, valida tipo y tamaño), vista previa, botón «Quitar foto», casilla de consentimiento obligatoria si hay foto: «Acepto que mi nutricionista vea esta foto para dar seguimiento a mi estado inicial.» Si la persona tiene < 18 años, la sección de foto se reemplaza por «La foto solo está disponible para mayores de 18 años.». Si ya hay foto guardada, muéstrala con `repo.getIntakePhotoUrl(session.user.id)`.
   - Validación en el cliente con mensajes bajo cada campo (rangos del contrato: peso 25–350, estatura 100–250, cintura 40–250).
   - «Guardar mi ficha» → `repo.saveMyIntake({ …, photo, remove_photo, consent_photo })` → mensaje «Ficha guardada» + `refresh()` de la sesión. Botón deshabilitado con «Guardando…».
   - Debajo, si hay ficha guardada: tarjeta «Tu estado inicial» (IMC con 1 decimal y su etiqueta, y «Estimación orientativa: ~N kcal/día» usando `buildBasicGuide` de `src/lib/nutrition/guide.ts` si sus datos alcanzan) con el aviso «Es una estimación automática; tu nutricionista te dará tu plan.»
   - Si `repo.getMyIntake()` falla con `SIN_BASE`, muestra el `ErrorState` con su mensaje (no rompas la página).
""",
     """- `MiPanelPage.test.tsx`: `abre la pestaña de ?tab=pagos`; `con fase 2 apagada, Calendario muestra Próximamente` (mock de `../../auth/SettingsContext` o del repo `getSettings`).
- `FichaTab.test.tsx`: `valida peso fuera de rango sin llamar a saveMyIntake`; `con foto exige consentimiento`; `guarda y muestra Ficha guardada`; `menor de 18 no ve el campo de foto`.""",
     'la ronda 2')

impl('U1b', 'Admin → Fases, registro con cupo, «Cómo funciona» y enlaces a Mi panel',
     '`src/pages/admin/AdminFasesPage.tsx`, `src/pages/NutricionPage.tsx`, `src/pages/RegistroPage.tsx`, `src/pages/PerfilPage.tsx`, `src/components/profile/DataTab.tsx` y sus `*.test.tsx`.',
     """1. **`AdminFasesPage`** (`/admin/fases`, solo admin) dentro de `AdminShell` título «Fases de la plataforma»: carga `repo.getSettings()`; 3 casillas grandes con descripción:
   - «Fase 1 · Ingreso y ficha del paciente» (registro, ingreso, Mi ficha con foto).
   - «Fase 2 · Nutricionista» (solicitudes, tablero, avisos, seguimiento, calendario, suscripciones y facturas).
   - «Fase 3 · Para todos» (registro sin cupo, reseñas, reporte PDF, correos, datos completos de lugares).
   - Campo numérico «Cupo de pacientes (mientras la fase 3 está apagada)» (0–100000) y el texto «Pacientes registrados: N».
   - «Guardar cambios» → `repo.adminSaveSettings(...)` → «Cambios guardados» y `reload()` de `useSettings()` para que toda la página se actualice. Aviso si se apaga la fase 1: «Si apagas la fase 1, los pacientes no podrán guardar su ficha.»
2. **`RegistroPage`**: si `useSettings()` dice `!phase3 && patients_count >= patient_limit`, muestra arriba un aviso «Por ahora no hay cupos para nuevos pacientes.» y deshabilita «Crear cuenta». Si `signUp` lanza `CUPO_LLENO`, muestra su mensaje. Si `!phase3`, debajo del título: «Cupos disponibles: N». Tras registrarse, navega a `/mi-panel` (antes iba a `/perfil`).
3. **`NutricionPage`** (`/nutricion`, pública): «Cómo funciona» en 3 pasos: 1) Llena tu ficha (datos y foto) 2) Un nutricionista acepta tu solicitud 3) Sigue tu calendario y marca cada día cumplido. Botón principal: con sesión «Ir a mi ficha» (`/mi-panel`), sin sesión «Crear mi cuenta» (`/registro`) + «Ya tengo cuenta» (`/ingresar?volver=/mi-panel`). Sección «Para nutricionistas»: «Atiende pacientes desde tu panel. Suscripción mensual.» + enlace a `/contacto`. Aviso: «Activa GYE conecta pacientes con nutricionistas. No da diagnósticos ni consejos automáticos.» Si la fase 2 está apagada, el paso 2 y 3 llevan la etiqueta «Próximamente».
4. **`PerfilPage`**: agrega una tarjeta destacada «Mi panel: ficha, calendario y pagos» con botón «Abrir mi panel» → `/mi-panel` (arriba de las pestañas). **`DataTab`**: si muestra algo de «plan» o «progreso» antiguo, cámbialo por el enlace a `/mi-panel`.
""",
     """- `AdminFasesPage.test.tsx`: `muestra las 3 fases con su estado`; `guardar llama adminSaveSettings con los valores marcados`.
- `RegistroPage.test.tsx` (agrega): `cupo lleno deshabilita Crear cuenta`.
- `PerfilPage.test.tsx` (agrega): `tiene el enlace Abrir mi panel a /mi-panel`.""",
     'la ronda 2')

# ================================================================== RONDA 2
impl('S3', 'Migración 3: seguimiento, calendario y avisos',
     '`supabase/migrations/20261121000003_seguimiento_calendario_avisos.sql`, `supabase/tests/02_seguimiento_calendario_avisos.sql`.',
     f"""Implementa TODA la sección «Migración 3» de `{DB}`: `followups`, `plan_days` (+ triggers + RLS), `set_plan_day_done`, `copy_plan_week`, reemplazo de `list_my_patients`, `notifications`, `notify`, `mark_all_notifications_read` y TODOS los triggers de avisos de la tabla.""",
     """`supabase/tests/02_seguimiento_calendario_avisos.sql` (pgTAP), como mínimo:
1. con fase 2 encendida y una solicitud aceptada: el nutricionista crea un `plan_days`; otro nutricionista NO puede (`NO_ES_TU_PACIENTE` o 0 filas).
2. el paciente ve sus días; otro paciente no.
3. el paciente marca cumplido con `set_plan_day_done`; NO puede cambiar `title` con un update directo.
4. `copy_plan_week` copia 7 días y devuelve 7.
5. avisos: crear solicitud genera `solicitud_nueva` para el nutricionista; aceptarla genera `solicitud_aceptada` para el paciente; marcar cumplido genera `dia_cumplido`.
6. un usuario no ve avisos de otro.
7. con fase 2 apagada, insertar en `followups` → `FASE_NO_ACTIVA`.""",
     'S4 en la ronda 3', SQL_RULES)

impl('D2', 'Supabase: ficha, solicitudes, pacientes y avisos',
     '`src/data/supabase/care.ts` y `src/data/supabase/care.test.ts`.',
     f"""`care.ts` → `export const carePart: Partial<Repo>`. Usa `supabase` de `./client` y `unwrap`/`toAppError` de `./errors` (los hace D1; ya están en main). Nombres en `{DB}` (migraciones 2 y 3; `nutri_dashboard` es de la 4).
- `getMyIntake` (select de `patient_intakes` del usuario; null si no hay), `saveMyIntake`: (1) `update profiles` con nombre, fecha y sexo; (2) si viene `photo`: reduce con `src/lib/image.ts` si sirve, sube a `body-photos` en `<uid>/ficha-<Date.now()>.<ext>`; (3) `upsert` de `patient_intakes` con `photo_path` nuevo (o null si `remove_photo`) y `consent_photo`; (4) borra del bucket la foto anterior si cambió. Devuelve la ficha.
- `getIntakePhotoUrl(userId)`: lee `photo_path` de `patient_intakes` y crea `createSignedUrl(path, 600)`; null si no hay.
- `getMyCareRequest` (RPC `my_care_request`), `requestCare` (RPC `request_care`, `{{ p_message }}`), `cancelMyCareRequest`, `getMyNutritionist` (RPC `my_nutritionist` + RPC `rating_summary('nutricionista', id)` → `rating`).
- `listOpenCareRequests` (RPC `list_open_care_requests`), `acceptCareRequest`, `finishCareRequest`, `listMyPatients` (RPC `list_my_patients`), `getPatientDetail(patientId)`: `profiles` por id + `patient_intakes` + foto firmada + la `care_requests` `aceptada` de ese paciente (null si no hay → devuelve null), `getNutriDashboard` (RPC `nutri_dashboard`).
- `listNotifications` (50 más nuevas), `countUnreadNotifications` (`select('id', {{ count: 'exact', head: true }}).is('read_at', null)`), `markNotificationRead` (update `read_at = now`), `markAllNotificationsRead` (RPC).
Convierte `numeric` que llegan como texto a `number`.
""",
     """`care.test.ts` con `vi.mock('./client')`:
- `saveMyIntake` con foto sube al bucket en la carpeta del usuario y guarda `photo_path`.
- `saveMyIntake` con `remove_photo` guarda `photo_path: null` y borra la foto anterior.
- `requestCare` llama `rpc('request_care', { p_message })` y traduce `{ message: 'FALTA_FICHA' }` a `AppError` con ese código.
- `countUnreadNotifications` devuelve el `count`.""",
     'D3 en la ronda 3')

impl('U2', 'Nutricionista: tablero y bolsa de solicitudes',
     '`src/pages/nutri/TableroPage.tsx`, `src/pages/nutri/SolicitudesPage.tsx`, `src/components/nutri/*` (nuevos; NO `PlanEditor.tsx`) y sus `*.test.tsx`.',
     """Las páginas `/nutri*` son para rol nutricionista o admin. Todo dentro de `<PhaseGate phase={2} title="Panel del nutricionista" back={{ to: '/', label: 'Ir al inicio' }}>`.
1. Crea `src/components/nutri/NutriShell.tsx`: marco con `PageHeader` («PANEL DEL NUTRICIONISTA») y navegación: «Tablero» `/nutri`, «Solicitudes» `/nutri/solicitudes`, «Mi suscripción» `/nutri/suscripcion`; en celular, pestañas desplazables. Si el rol es admin, un enlace «Administración» `/admin`.
2. **`TableroPage`** (`/nutri`): `repo.getNutriDashboard()` + `repo.listMyPatients()`.
   - Tarjetas: «Solicitudes abiertas» (→ `/nutri/solicitudes`), «Mis pacientes», «Días cumplidos esta semana» (`done/total` y %), «Facturas por cobrar».
   - Estado de suscripción: si no hay o no está `activa` y el rol es nutricionista → aviso naranja «Necesitas una suscripción activa para aceptar pacientes» + botón «Elegir plan» (`/nutri/suscripcion`). Admin: «Como administrador, no necesitas suscripción.»
   - Lista «Mis pacientes»: nombre, edad, «N de M días cumplidos», último seguimiento (o «Sin seguimiento»), botón «Ver paciente» → `/nutri/pacientes/<patient_id>`. Vacío: «Aún no tienes pacientes. Revisa las solicitudes abiertas.» + botón.
3. **`SolicitudesPage`** (`/nutri/solicitudes`): `repo.listOpenCareRequests()`; cada tarjeta: nombre, edad, sexo, objetivo (`GOAL_LABELS`), mensaje, «hace N horas/días», botón «Aceptar» → `repo.acceptCareRequest(id)` → navega a `/nutri/pacientes/<patient_id>`. Si falla con `YA_TOMADA`, quita la tarjeta y muestra «Otro nutricionista ya la aceptó.»; con `SIN_SUSCRIPCION`/`CUPO_PLAN_LLENO` muestra el mensaje + botón «Ver mi suscripción». Botón «Actualizar». Vacío: «No hay solicitudes abiertas por ahora.»
""",
     """- `TableroPage.test.tsx`: `muestra las tarjetas con los números del tablero`; `nutricionista sin suscripción ve Elegir plan`; `con fase 2 apagada muestra Próximamente`.
- `SolicitudesPage.test.tsx`: `aceptar navega a la ficha del paciente`; `YA_TOMADA quita la tarjeta y avisa`.""",
     'la ronda 3')

impl('U2b', 'Campana de avisos y página Notificaciones',
     '`src/components/NotificationBell.tsx`, `src/pages/NotificacionesPage.tsx` y sus `*.test.tsx`.',
     """1. **`NotificationBell`** (ya está colocada en el encabezado para usuarios con sesión): solo si la fase 2 está encendida (`usePhase(2)`), si no `null`. Ícono `Bell` (blanco sobre azul marino) con un globo naranja con el número de no leídos (`repo.countUnreadNotifications()`, «9+» si > 9). Consulta al montar, cada 60 s y al volver a la pestaña (`visibilitychange`). Es un enlace a `/notificaciones` con `aria-label="Notificaciones (N sin leer)"`. Si la consulta falla, no muestra número (sin romper el encabezado).
2. **`NotificacionesPage`** (`/notificaciones`, con sesión) con `PageHeader` y Volver: dentro de `<PhaseGate phase={2} title="Notificaciones">`. Lista de `repo.listNotifications()`: título, texto, «hace N minutos/horas/días», punto naranja si no leída. Clic en una → `markNotificationRead(id)` y navega a su `link` (si tiene). Botón «Marcar todas como leídas». Vacío: «No tienes notificaciones.»
""",
     """- `NotificationBell.test.tsx`: `muestra el número de no leídos`; `con fase 2 apagada no se muestra`.
- `NotificacionesPage.test.tsx`: `al pulsar una notificación la marca leída y navega a su enlace`; `marcar todas llama markAllNotificationsRead`.""",
     'la ronda 3')

impl('U3', 'Paciente: «Mi nutricionista» y resumen de administración',
     '`src/components/panel/MiNutricionistaTab.tsx`, `src/pages/admin/AdminHomePage.tsx` y sus `*.test.tsx`.',
     """1. **`MiNutricionistaTab`** (pestaña dentro de `/mi-panel`, ya envuelta en PhaseGate 2 por la página): `repo.getMyCareRequest()`:
   - Sin solicitud: explica «Pide un nutricionista: verá tu ficha y te armará un calendario.»; campo opcional «Mensaje para el nutricionista» (≤500) y botón «Solicitar nutricionista» → `repo.requestCare(msg)`. Si responde `FALTA_FICHA`: «Primero llena tu ficha» + botón que abre `?tab=ficha`.
   - `abierta`: «Tu solicitud está esperando a un nutricionista» (fecha) + «Cancelar solicitud» (con `ConfirmDialog`).
   - `aceptada`: tarjeta del nutricionista (`repo.getMyNutritionist()`: nombre; si `rating.count > 0`, «★ 4,5 (12)»), «Te atiende desde <fecha>»; lista de seguimientos `repo.listFollowups(session.user.id)` (fecha, peso, observaciones, recomendaciones) con vacío «Tu nutricionista aún no registra seguimientos.»; botón «Cancelar atención».
   - Si `listFollowups` responde `SIN_BASE` o error, muestra el error solo en esa sección.
2. **`AdminHomePage`** (`/admin`, solo admin) dentro de `AdminShell` título «Administración»: tarjetas-enlace a Fases (`/admin/fases`, con el estado «Fase 1 ✓ · Fase 2 ✗ · Fase 3 ✗» de `useSettings()`), Lugares, Datos de lugares, Pagos, Usuarios, Mensajes y Panel nutricionista (`/nutri`). Cada tarjeta con una frase de qué hace. Sin datos inventados.
""",
     """- `MiNutricionistaTab.test.tsx`: `sin solicitud, solicitar llama requestCare`; `FALTA_FICHA muestra Primero llena tu ficha`; `aceptada muestra el nombre del nutricionista`.
- `AdminHomePage.test.tsx`: `muestra el estado de las fases y los enlaces`.""",
     'la ronda 3')

# ================================================================== RONDA 3
impl('S4', 'Migración 4: pagos manuales, suscripción, reseñas y tablero',
     '`supabase/migrations/20261121000004_pagos_resenas.sql`, `supabase/tests/03_pagos_resenas.sql`.',
     f"""Implementa TODA la sección «Migración 4» de `{DB}`: `subscription_plans` (+ semilla Básico/Pro), `subscriptions`, `invoices`, `subscription_active`, `choose_plan`, `create_invoice`, `report_invoice_paid`, `mark_invoice_paid`, `cancel_invoice`, `my_invoices`, `admin_list_invoices`, `my_subscription`, `admin_list_subscriptions`, reemplazo de `accept_care_request` (suscripción + cupo del plan), `nutri_dashboard`, `reviews` (+ trigger + RLS), reemplazo de `rating_summary`, `list_reviews`, avisos de facturas (usa `notify` de la migración 3).""",
     """`supabase/tests/03_pagos_resenas.sql` (pgTAP), como mínimo:
1. nutricionista sin suscripción → `accept_care_request` da `SIN_SUSCRIPCION`; admin sí puede aceptar.
2. `choose_plan` crea suscripción `pendiente` + factura; el nutricionista NO puede `mark_invoice_paid` de su propia factura de suscripción; el admin sí → suscripción `activa` con `current_period_end` ~30 días.
3. `create_invoice` a un paciente que no es mío → `NO_ES_TU_PACIENTE`; a mi paciente sí; el paciente `report_invoice_paid` → `reportada`; el paciente NO puede `mark_invoice_paid`; el nutricionista sí.
4. un tercero no ve esas facturas.
5. con fase 3 apagada, insertar reseña → `FASE_NO_ACTIVA`; encendida, un paciente que nunca fue atendido por ese nutricionista → `NO_PERMITIDO`; el atendido sí; `rating_summary` devuelve average y count.
6. cupo del plan: con `patient_quota = 1` y 1 paciente aceptado, aceptar otro → `CUPO_PLAN_LLENO`.""",
     'la ronda 4', SQL_RULES)

impl('D3', 'Supabase: seguimiento, calendario, pagos y reseñas',
     '`src/data/supabase/plan.ts` y `src/data/supabase/plan.test.ts`.',
     f"""`plan.ts` → `export const planPart: Partial<Repo>`. Nombres en `{DB}` (migraciones 3 y 4). Usa `supabase`, `unwrap`, `toAppError`.
- `listFollowups(patientId)` (por fecha desc), `addFollowup(patientId, input)` (insert con `patient_id`).
- `listPlanDays(patientId, from, to)` (`gte('day', from).lte('day', to)`, orden por `day`), `savePlanDay(patientId, input)` (con `id`: update; sin `id`: insert; `on conflict` de día repetido → `AppError('DATOS_INVALIDOS', 'Ya hay un plan para ese día.')`), `deletePlanDay`, `copyPlanWeek` (RPC `copy_plan_week` con `p_patient, p_from, p_to`), `setPlanDayDone` (RPC `set_plan_day_done`).
- `listPlans` (orden `sort`), `adminSavePlan` (upsert), `getMySubscription` (RPC `my_subscription`), `choosePlan` (RPC `choose_plan`), `listMyInvoices` (RPC `my_invoices`), `createInvoice` (RPC `create_invoice`), `reportInvoicePaid`, `markInvoicePaid`, `cancelInvoice`, `adminListInvoices` (RPC), `adminListSubscriptions` (RPC; arma `plan` anidado con `plan_name`, `monthly_price`, `patient_quota`).
- `listReviews` (RPC `list_reviews`), `getRating` (RPC `rating_summary`), `saveReview` (`upsert` en `reviews` con `onConflict: 'target_type,target_id,author_id'`), `deleteMyReview`.
Convierte `numeric` (texto) a `number`.
""",
     """`plan.test.ts` con `vi.mock('./client')`:
- `copyPlanWeek` llama la RPC con `p_patient, p_from, p_to` y devuelve el número.
- `savePlanDay` sin id inserta; con id actualiza.
- `markInvoicePaid` traduce `{ message: 'NO_PERMITIDO' }` a `AppError`.
- `getRating` devuelve `{ average: 4.5, count: 2 }` desde la RPC.""",
     'la ronda 4')

impl('U4a', 'Nutricionista: ficha del paciente, seguimientos y factura',
     '`src/pages/nutri/PacientePage.tsx`, `src/components/nutri/FollowupForm.tsx`, `src/components/nutri/InvoiceForm.tsx` y sus `*.test.tsx`. Usa `src/components/nutri/NutriShell.tsx` y `src/components/nutri/PlanEditor.tsx` (los hacen U2 y U4b: NO los edites).',
     """**`PacientePage`** (`/nutri/pacientes/:id`) en `NutriShell` y `PhaseGate` 2: `repo.getPatientDetail(id)` (null → «No encontramos este paciente o ya no lo atiendes» + Volver a `/nutri`).
- Cabecera: nombre, edad, sexo, objetivo, «Te atiende desde <fecha>», botón «Volver al tablero».
- Ficha: peso, estatura, IMC (1 decimal), cintura, actividad, notas de salud; foto de cuerpo entero (`photo_url`) en tamaño mediano que se amplía al pulsar (diálogo con «Cerrar»); sin foto: «El paciente no subió foto.»
- Sección **Calendario**: `<PlanEditor patientId={id} />`.
- Sección **Seguimientos**: lista (`repo.listFollowups(id)`) + `FollowupForm` (fecha hoy por defecto, peso, cintura, observaciones y recomendaciones ≥2 caracteres) → `repo.addFollowup` → recarga.
- Sección **Cobros**: `InvoiceForm` (concepto, monto > 0) → `repo.createInvoice({ patient_id, concept, amount })` → «Factura enviada al paciente»; lista de facturas de este paciente (de `repo.listMyInvoices()` filtradas por `payer_id`) con estado y botón «Marcar pagada» si está `pendiente`/`reportada` (muestra la referencia que reportó) → `repo.markInvoicePaid`.
- «Finalizar atención» (con `ConfirmDialog`) → `repo.finishCareRequest(request.id)` → navega a `/nutri`.
""",
     """- `PacientePage.test.tsx` (mockea `PlanEditor` con `vi.mock`): `muestra la ficha y la foto`; `agregar seguimiento llama addFollowup y recarga`; `crear factura llama createInvoice`; `marcar pagada llama markInvoicePaid`; `paciente inexistente muestra mensaje y Volver`.""",
     'la ronda 4')

impl('U4b', 'Nutricionista: editor del calendario del plan',
     '`src/components/nutri/PlanEditor.tsx`, `src/lib/dates.ts` y sus `*.test.ts(x)`.',
     """1. `src/lib/dates.ts`: `toISODate(d)`, `mondayOf(d)` (lunes de esa semana), `addDays(iso, n)`, `weekDays(mondayISO)` (7 fechas), `formatDayLabel(iso)` → «Lun 24/11», `isToday(iso)`. Fechas locales, sin librerías.
2. **`PlanEditor`** (`{ patientId }`): vista por **semana** (lunes a domingo) con «‹ Semana anterior», «Esta semana», «Semana siguiente ›». Carga `repo.listPlanDays(patientId, lunes, domingo)`.
   - 7 tarjetas (en celular, una debajo de otra): fecha; si hay plan: título, comidas, ejercicio, notas, estado «✓ Cumplido» (verde, con la nota del paciente) o «Pendiente»; botones «Editar» y «Borrar» (con confirmación). Sin plan: botón «Agregar plan».
   - Formulario (en diálogo o desplegado): Título (2–120), Comidas, Ejercicio, Notas → `repo.savePlanDay(patientId, {...})`.
   - «Copiar esta semana a la siguiente» → `repo.copyPlanWeek(patientId, lunes, lunes+7)` → «Se copiaron N días» y pasa a la semana siguiente.
   - Resumen arriba: «N de 7 días cumplidos esta semana».
""",
     """- `src/lib/dates.test.ts`: `mondayOf de un domingo devuelve el lunes anterior`; `weekDays devuelve 7 fechas seguidas`.
- `PlanEditor.test.tsx`: `muestra los días de la semana con su estado`; `agregar plan llama savePlanDay`; `copiar semana llama copyPlanWeek con lunes y lunes+7`.""",
     'la ronda 4')

impl('U4c', 'Nutricionista: suscripción',
     '`src/pages/nutri/SuscripcionPage.tsx` y su `*.test.tsx`. Usa `NutriShell` (de U2, no lo edites).',
     """**`SuscripcionPage`** (`/nutri/suscripcion`) en `NutriShell` + `PhaseGate` 2:
- Estado actual (`repo.getMySubscription()`): sin suscripción / `pendiente` («Pendiente de pago») / `activa` («Activa hasta <fecha>») / `vencida`.
- Planes (`repo.listPlans()`): tarjetas con nombre, «$N al mes», «Hasta N pacientes», botón «Elegir este plan» → `repo.choosePlan(id)` → muestra la factura creada. Si ya tiene una activa: botones deshabilitados con «Ya tienes una suscripción activa».
- «Cómo pagar»: texto fijo «Haz una transferencia por el monto de la factura y escribe aquí el número de comprobante. El administrador confirmará el pago.» (sin número de cuenta inventado: «Los datos bancarios te los da el administrador por correo.»)
- Facturas de suscripción (de `repo.listMyInvoices()` con `kind === 'suscripcion'`): concepto, monto, estado; si `pendiente`: campo «Número de comprobante» (4–100) + «Informar pago» → `repo.reportInvoicePaid(id, ref)`.
- Admin que entra: «Como administrador no necesitas suscripción.» + enlace a `/admin/pagos`.
""",
     """- `SuscripcionPage.test.tsx`: `elegir plan llama choosePlan`; `informar pago valida el comprobante y llama reportInvoicePaid`; `con suscripción activa los botones están deshabilitados`.""",
     'la ronda 4')

impl('U5a', 'Paciente: Calendario y progreso',
     '`src/components/panel/CalendarioTab.tsx` (+ `src/components/panel/calendario/*` nuevos) y sus tests. Puedes reutilizar `src/components/profile/WeightChart.tsx` y `ProgressTab.tsx` sin editarlos; usa `src/lib/dates.ts` si ya existe en main, si no crea funciones locales.',
     """**`CalendarioTab`** (en `/mi-panel?tab=calendario`, la página ya la envuelve en PhaseGate 2):
- Vista de **mes** (cuadrícula lunes–domingo; en celular, lista de la semana con «‹ ›»): `repo.listPlanDays(session.user.id, primerDía, últimoDía)`. Cada día con plan: punto naranja (pendiente) o verde con ✓ (cumplido). Hoy resaltado. «‹ Mes anterior», «Mes siguiente ›», «Hoy».
- Al pulsar un día con plan: detalle (título, comidas, ejercicio, notas del nutricionista) + casilla «Cumplí este día» y «Nota para mi nutricionista» (≤500) + «Guardar» → `repo.setPlanDayDone(id, done, note)`. Solo se puede marcar cumplido un día de hoy o anterior («Podrás marcarlo ese día.»).
- Progreso arriba: «Cumpliste N de M días este mes» con barra y %; racha de días seguidos cumplidos.
- Debajo, «Mi peso»: el registro de peso existente (`ProgressTab` de `src/components/profile`) para seguir anotando peso.
- Sin días: «Tu nutricionista aún no arma tu calendario.» + botón a `?tab=nutricionista`.
""",
     """- `CalendarioTab.test.tsx`: `muestra días cumplidos y pendientes del mes`; `marcar cumplido llama setPlanDayDone`; `un día futuro no se puede marcar`; `calcula el porcentaje del mes`.""",
     'la ronda 4')

impl('U5b', 'Paciente: Pagos',
     '`src/components/panel/PagosTab.tsx` y su test.',
     """**`PagosTab`** (en `/mi-panel?tab=pagos`, ya con PhaseGate 2): `repo.listMyInvoices()` donde `payer_id === session.user.id`.
- Resumen: «Pendiente por pagar: $N».
- Lista: concepto, nutricionista (`payee_name`), fecha, monto (formato `$12,50`), estado con `Badge` (pendiente naranja, reportada azul «En revisión», pagada verde, anulada gris).
- `pendiente`: «Número de comprobante» (4–100) + «Informar pago» → `repo.reportInvoicePaid(id, ref)` → pasa a «En revisión».
- Texto: «Paga por transferencia a tu nutricionista y escribe aquí el número de comprobante. Él confirmará el pago.»
- Vacío: «No tienes cobros.»
""",
     """- `PagosTab.test.tsx`: `suma lo pendiente`; `informar pago valida y llama reportInvoicePaid`; `vacío muestra No tienes cobros`.""",
     'la ronda 4')

impl('U6a', 'Fase 3: reseñas',
     '`src/components/reviews/*` (nuevos), `src/pages/LugarPage.tsx`, `src/components/panel/MiNutricionistaTab.tsx` (solo para agregar la sección de reseña) y sus tests.',
     """1. `src/components/reviews/Stars.tsx`: estrellas de solo lectura (`value`, «4,5») y `StarInput` (5 botones accesibles, `aria-label="N estrellas"`).
2. `src/components/reviews/ReviewsSection.tsx` (`{ target, targetId, canReview, title }`): dentro de `<PhaseGate phase={3} compact text="Las reseñas se habilitarán pronto.">`. Muestra promedio (`repo.getRating`) y lista (`repo.listReviews`: primer nombre, estrellas, comentario, fecha). Si `canReview` y hay sesión: formulario (estrellas obligatorias + comentario ≤1000) → `repo.saveReview` → recarga; si ya tiene una, se precarga y aparece «Borrar mi reseña» → `repo.deleteMyReview`. `NO_PERMITIDO` → «Solo puedes calificar a un nutricionista que te atendió.» Sin sesión: «Ingresa para dejar tu reseña» (enlace a `/ingresar?volver=…`).
3. `LugarPage`: agrega `<ReviewsSection target="lugar" targetId={place.id} canReview title="Reseñas" />` al final de la ficha (no cambies lo demás; «Cómo llegar» debe seguir igual).
4. `MiNutricionistaTab`: si la solicitud está `aceptada` (o el paciente tuvo una), agrega `<ReviewsSection target="nutricionista" targetId={nutricionista.id} canReview title="Califica a tu nutricionista" />`.
""",
     """- `ReviewsSection.test.tsx`: `muestra promedio y reseñas`; `guardar llama saveReview con estrellas y comentario`; `con fase 3 apagada muestra Próximamente`; `NO_PERMITIDO muestra el mensaje`.
- `LugarPage.test.tsx`: los tests existentes siguen verdes (mockea los métodos nuevos del repo).""",
     'la ronda 4')

impl('U6b', 'Fase 3: reporte en PDF y datos faltantes de lugares',
     '`src/pages/panel/ReportePage.tsx`, `src/pages/admin/AdminDatosLugaresPage.tsx`, `src/print.css` (nuevo; impórtalo desde `ReportePage`) y sus tests.',
     """1. **`ReportePage`** (`/mi-panel/reporte`, con sesión) en `<PhaseGate phase={3} title="Reporte de progreso">`: página limpia para imprimir con logo `/img/logo-512.png`, «Reporte de progreso — Activa GYE», fecha, datos del paciente (nombre, edad, sexo), ficha inicial (peso, estatura, IMC), nutricionista (si hay), resumen del calendario de los últimos 30 días (cumplidos/total, %), lista de seguimientos (fecha, peso, recomendaciones) y registro de peso (`repo.listProgress()`). Botones (ocultos al imprimir): «Descargar PDF» (`window.print()`; el usuario elige «Guardar como PDF») y «Volver» a `/mi-panel`. `src/print.css`: `@media print` que oculta encabezado, pie y botones (`.no-print`) y quita fondos. Agrega en `MiPanelPage` NO (no es tuyo): pide al orquestador un enlace «Descargar reporte» en el reporte.
2. **`AdminDatosLugaresPage`** (`/admin/datos-lugares`, admin) dentro de `AdminShell` «Datos de lugares», en `<PhaseGate phase={3} title="Datos de lugares">`: `repo.adminListIncompletePlaces()`; filtro «Sin precio» / «Sin horario» / «Todos»; contador «N lugares por completar»; cada fila: nombre, sector, qué falta, campo rápido «Precio desde (USD)» con «Guardar» (→ `repo.adminSavePlace({ ...lugar, price_from })` y lo quita de la lista si ya está completo) y enlace «Editar todo» → `/admin/lugares/<id>`.
""",
     """- `ReportePage.test.tsx`: `muestra los datos y el botón Descargar PDF llama window.print`.
- `AdminDatosLugaresPage.test.tsx`: `lista lugares incompletos con su contador`; `guardar precio llama adminSavePlace`.""",
     'la ronda 4')

impl('U6c', 'Admin → Pagos (facturas, suscripciones y planes)',
     '`src/pages/admin/AdminPagosPage.tsx` y su test.',
     """**`AdminPagosPage`** (`/admin/pagos`, admin) en `AdminShell` «Pagos», en `<PhaseGate phase={2} title="Pagos">`. Pestañas:
- **Facturas** (`repo.adminListInvoices()`): filtro por estado; columnas: fecha, quién paga, quién cobra («Plataforma» si null), concepto, monto, estado, referencia. Acciones: «Marcar pagada» (pendiente/reportada) → `repo.markInvoicePaid`; «Anular» (no pagadas, con confirmación) → `repo.cancelInvoice`. Destaca las `reportada` («Por confirmar»).
- **Suscripciones** (`repo.adminListSubscriptions()`): nutricionista, plan, estado, vence.
- **Planes** (`repo.listPlans()`): editar nombre, precio mensual, cupo de pacientes, activo, orden → `repo.adminSavePlan`; «Nuevo plan».
""",
     """- `AdminPagosPage.test.tsx`: `marcar pagada llama markInvoicePaid`; `anular pide confirmación y llama cancelInvoice`; `editar plan llama adminSavePlan`.""",
     'la ronda 4')

# ================================================================== RONDA 4
impl('C1', 'Fase 3: correos de aviso con Brevo (Edge Function)',
     '`supabase/functions/enviar-correo/index.ts`, `supabase/migrations/20261121000005_correos.sql`, `docs/entrega/CORREOS.md`.',
     f"""1. Edge Function `enviar-correo` (Deno): recibe `{{ user_id, title, body, link }}` por POST con la cabecera `Authorization: Bearer <SERVICE_ROLE>`; si no hay `BREVO_API_KEY` en `Deno.env` → responde `{{ sent: false, reason: 'sin_clave' }}` (200). Si hay: busca el correo del usuario con el cliente admin de Supabase y envía con `POST https://api.brevo.com/v3/smtp/email` (`sender` desde `BREVO_SENDER_EMAIL`/`BREVO_SENDER_NAME`), asunto = title, HTML sencillo con el logo, el texto y un botón al `link` (prefijo `SITE_URL`). Solo si la fase 3 está encendida (`get_public_settings`).
2. Migración 5: trigger `after insert on notifications` que llama a la función con `net.http_post` (extensión `pg_net`; si no está disponible en local, deja la función SQL pero que no falle: `exception when others then null`). URL y clave desde `current_setting('app.functions_url', true)` / `current_setting('app.service_role_key', true)`; si son null, no hace nada.
3. `docs/entrega/CORREOS.md`: cómo crear la cuenta gratis de Brevo (300 correos/día), verificar el remitente, y poner los secretos con `npx supabase secrets set BREVO_API_KEY=… BREVO_SENDER_EMAIL=… SITE_URL=…` (los pone la dueña).
No corras `db reset` (la base es del orquestador en esta ronda): valida con `npx supabase db lint` si existe, o revisión manual.
""",
     """- Sin tests de Vitest. Reporta que `deno check` (si está) o una lectura cuidadosa no muestran errores.""",
     'EF')

impl('EF', 'Pruebas de punta a punta de las 3 fases + evidencia',
     '`e2e/*.spec.ts` (nuevos y existentes), `e2e/helpers.ts`, `docs/entrega/*`, `scripts/capturas.mjs`.',
     """La base local ya tiene todas las migraciones y la semilla (cuentas de `docs/entrega/CUENTAS-DE-PRUEBA.md`). Tu árbol tiene `.env.local` apuntando a ella. **No** hagas `db reset`/`start`/`stop`. Para cambiar fases en las pruebas usa la página **Admin → Fases** (entrando como admin), y al final de cada archivo deja las fases como estaban (fase 1 sí, 2 y 3 no).
1. Revisa los `e2e/*.spec.ts` existentes: los que usan cosas retiradas (`/nutricion/nueva`, `/admin/nutricion`, la pestaña «Mi plan» o «Mi progreso» de `/perfil`) cámbialos al flujo nuevo. Usa correos únicos (`e2e+<Date.now()>@activagye.test`) al registrar.
2. Nuevos:
   - `e2e/fase1.spec.ts`: registro → `/mi-panel` → «Mi ficha» con foto (`e2e/fixtures/cuerpo.jpg`, una imagen pequeña que creas tú) → «Ficha guardada» → recargar y sigue ahí; Calendario/Pagos muestran «Próximamente»; admin pone cupo = pacientes actuales → registro muestra «no hay cupos»; admin lo restaura.
   - `e2e/fase2.spec.ts`: admin enciende fase 2 → paciente pide nutricionista → nutricionista ve la campana con aviso, va a Solicitudes, acepta (si pide suscripción: elige plan, admin marca pagada en Admin → Pagos, vuelve y acepta) → crea un día en el calendario y un seguimiento → paciente ve el día y lo marca cumplido → nutricionista ve «1 de 7 cumplidos» → nutricionista crea factura → paciente informa pago → nutricionista marca pagada → paciente la ve «Pagada».
   - `e2e/fase3.spec.ts`: admin enciende fase 3 → paciente deja reseña a un lugar y a su nutricionista → aparece el promedio → abre el reporte y ve «Descargar PDF» → admin ve «Datos de lugares».
   - Cada prueba verifica que hay botón de regreso en las páginas nuevas.
3. Evidencia en `docs/entrega/`: actualiza `PRUEBA-DE-BOTONES.md` (páginas nuevas), crea `FASES.md` (qué incluye cada fase, cómo se activa, captura de Admin → Fases), y `scripts/capturas.mjs` para sacar: `mi-ficha.png`, `admin-fases.png`, `nutri-tablero.png`, `nutri-paciente.png`, `paciente-calendario.png`, `paciente-pagos.png`, `resenas.png`, `reporte.png`. Míralas con Read y commitea las que se vean bien.
""",
     """- `npx playwright test --reporter=line`: todo verde (reporta el número). Si algo falla por un error REAL de la app, NO lo tapes: anótalo en el reporte con archivo:línea y cómo reproducirlo.""",
     'las revisiones',
     '**Tiempo extra:** este brief puede usar 25 minutos.')

impl('DOC', 'README y puesta en marcha',
     '`README.md`, `docs/entrega/PUESTA-EN-MARCHA.md`, `docs/entrega/CUENTAS-DE-PRUEBA.md`, `docs/entrega/PENDIENTES-Y-PROXIMOS-PASOS.md`.',
     f"""1. `README.md`: actualiza «Estado actual» (backend real con Supabase; datos ya no se pierden al cambiar de navegador cuando está conectado), la tabla de fases, las herramientas (Supabase Auth/Postgres/Storage/Edge Functions, Brevo; SIN IA), «Cómo correrlo» con `.env.local` (`cp .env.example .env.local`), `npx supabase start`, `npx supabase db reset` (carga lugares y cuentas de prueba locales). Plataforma tipo Uber: no digas que hay IA.
2. `docs/entrega/PUESTA-EN-MARCHA.md` (para la dueña, en palabras sencillas): crear proyecto en supabase.com (región São Paulo), `npx supabase login`, `npx supabase link --project-ref <ref>`, `npx supabase db push`, cargar SOLO los lugares de la semilla (sin el bloque `-- CUENTAS LOCALES`), crear su cuenta de admin (registrarse y luego en el SQL Editor `update profiles set role='admin' where id = (select id from auth.users where email='…')`), poner `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` en `.env.production.local`, `npm run build`, `npx wrangler deploy`, encender fases en Admin → Fases, y que Supabase gratis se pausa a los 7 días sin uso (cómo reactivarlo).
3. `CUENTAS-DE-PRUEBA.md`: aclara que son solo para la base local.
4. `PENDIENTES-Y-PROXIMOS-PASOS.md`: quita Groq/IA; pon lo que falte de verdad (lee `{PLAN}` y los reportes).
""",
     '- Sin tests nuevos; gates normales verdes.',
     'las revisiones')

# ================================================================== REVISIONES
review('RS', 'Seguridad y datos (SQL + capa Supabase)',
       'Migraciones 2–5, `supabase/tests/`, `src/data/supabase/*`. ¿Cumple `' + DB + '`? ¿RLS correcta?',
       """- Como paciente A (supabase-js o SQL con `set local role authenticated` + claims), intenta leer ficha, foto, calendario, seguimientos, facturas y avisos del paciente B.
- Como nutricionista X, intenta leer/escribir datos de un paciente atendido por Y; aceptar sin suscripción; marcar pagada su propia factura de suscripción.
- Con cada fase apagada, intenta usar sus tablas/RPC directamente (saltándote la UI).
- Registro con cupo lleno (directo a `auth.signUp`).
- Reseña a un nutricionista que no te atendió.
- ¿`anon` puede leer algo privado? ¿Alguna función `security definer` sin chequeo de rol?""")
review('RN', 'Navegación real y entrega (navegador)',
       'Toda la app en el navegador real a 360 y 1280 px con la base local, entrando con las 3 cuentas. Lee `docs/entrega/PRUEBA-DE-BOTONES.md` y `FASES.md`.',
       """- Recorre fase 1 → enciende fase 2 → fase 3 desde Admin → Fases: ¿todo lo apagado muestra «Próximamente» y lo encendido funciona?
- Cada botón nuevo: ¿hace algo y tiene regreso? ¿estados de cargando/vacío/error?
- El buscador, la ficha de lugar y «Cómo llegar» siguen funcionando (observación 1 del profesor) y la cuenta guarda datos de verdad (observación 2).
- ¿Queda texto «En construcción», «Pending» o datos inventados visibles?""")
impl('XS', 'Arreglos de la revisión: seguridad y datos',
     'Los archivos que señalen los BLOCKING/HOTFIX con área `[sql]` o `[datos]` (puede ser una migración NUEVA `supabase/migrations/20261121000006_arreglos.sql`: nunca edites una migración ya aplicada).',
     'Lee `work/out/RS/report.md` y `work/out/RN/report.md`. Arregla TODOS los HOTFIX y BLOCKING de áreas `[sql]` y `[datos]`, cada uno con su test (pgTAP o Vitest). Tienes la base local para ti: `npx supabase db reset` + `npx supabase test db`.',
     '- Un test por hallazgo arreglado, con el nombre del hallazgo.', 'la recomprobación RSb/RNb', SQL_RULES)
impl('XN', 'Arreglos de la revisión: pantallas y navegación',
     'Los archivos que señalen los BLOCKING/HOTFIX con área `[paciente]`, `[nutri]`, `[admin]`, `[fase3]` o `[e2e]`. NO toques `supabase/`.',
     'Lee `work/out/RS/report.md` y `work/out/RN/report.md`. Arregla TODOS los HOTFIX y BLOCKING de esas áreas, cada uno con su test. **No** hagas `db reset` (la base es de XS).',
     '- Un test por hallazgo arreglado.', 'la recomprobación RSb/RNb')
review('RSb', 'Recomprobación: seguridad y datos',
       'Solo verifica que los hallazgos `[sql]` `[datos]` de `work/out/RS/report.md` y `work/out/RN/report.md` estén arreglados (con test) y sin regresiones. Lee `work/out/XS/report.md`.',
       '- Reproduce cada hallazgo anterior.\n- Gates completos.')
review('RNb', 'Recomprobación: navegación',
       'Solo verifica que los hallazgos `[paciente]` `[nutri]` `[admin]` `[fase3]` `[e2e]` de RS/RN estén arreglados y sin regresiones. Lee `work/out/XN/report.md`.',
       '- Reproduce cada hallazgo anterior en el navegador.\n- Recorrido de fases otra vez.')

print('ok', sorted(p.name for p in OUT.glob('*.md') if p.stem in {
    'S1', 'S2', 'D1', 'U1a', 'U1b', 'S3', 'D2', 'U2', 'U2b', 'U3', 'S4', 'D3', 'U4a', 'U4b', 'U4c', 'U5a', 'U5b',
    'U6a', 'U6b', 'U6c', 'C1', 'EF', 'DOC', 'RS', 'RN', 'XS', 'XN', 'RSb', 'RNb'}))

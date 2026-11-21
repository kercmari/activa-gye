# Contrato de la base (Supabase) — fases 1, 2 y 3

Fuente única de **nombres** para las tareas SQL (S1, S3, S4) y las de datos (D1, D2, D3). Si algo no está aquí, pregúntalo en el reporte («Pedidos al orquestador») en vez de inventarlo.

Base existente: `supabase/migrations/20261121000001_esquema_inicial.sql` (profiles, sectors, sports, places, place_sports, favorites, progress_entries, contact_messages, helpers `my_role()`, `is_admin()`, `is_staff()`, `touch_updated_at()`, RPC `admin_set_role`, `admin_list_users`, `delete_my_account`, buckets `body-photos` y `place-photos`).

## Convenciones

- Errores de negocio: `raise exception 'CODIGO' using errcode = 'P0001';` (permisos: errcode `'42501'`). El **mensaje es solo el código** en MAYÚSCULAS. `src/data/supabase/errors.ts` lo traduce a `AppError(codigo, mensaje en español)`.
- Toda función `security definer` lleva `set search_path = public` y `grant execute … to authenticated` (y `anon` solo si se dice).
- Tablas nuevas con `enable row level security`. Escrituras sensibles **solo por RPC** (sin políticas de insert/update directas) cuando se indica.
- `updated_at` con el trigger `touch_updated_at()` existente.
- Edad: `date_part('year', age(current_date, birth_date))::int`.

## Migración 2 — `20261121000002_fases_ficha_solicitudes.sql` (S1)

| Objeto | Definición |
|---|---|
| `app_settings` | `id int primary key default 1 check (id = 1)`, `phase1 bool not null default true`, `phase2 bool not null default false`, `phase3 bool not null default false`, `patient_limit int not null default 5 check (patient_limit between 0 and 100000)`, `updated_at timestamptz default now()`. Insertar la fila 1. RLS: select para todos; sin escritura directa. |
| `phase_on(n int) returns boolean` | stable, security definer. |
| `get_public_settings() returns json` | `{phase1, phase2, phase3, patient_limit, patients_count}` (`patients_count` = perfiles con rol `usuario`). Grant a `anon` y `authenticated`. |
| `admin_set_settings(p_phase1 bool, p_phase2 bool, p_phase3 bool, p_patient_limit int) returns json` | solo admin (`SOLO_ADMIN`); devuelve lo mismo que `get_public_settings()`. |
| `handle_new_user()` (reemplazar) | conserva `MENOR_DE_16`; **además**: si `not phase_on(3)` y pacientes (rol usuario) `>= patient_limit` → `CUPO_LLENO`. |
| `nutrition_requests` | `drop table … cascade` (y sus funciones `take_nutrition_request`, `answer_nutrition_request`). |
| `patient_intakes` | `user_id uuid pk references profiles(id) on delete cascade`, `weight_kg numeric(5,1) not null check (25–350)`, `height_cm numeric(5,1) not null check (100–250)`, `waist_cm numeric(5,1) check (40–250)`, `goal text` (mismos valores que profiles.goal), `activity_level text` (ídem), `health_notes text check (≤1000)`, `photo_path text`, `consent_photo bool not null default false`, `consent_at timestamptz`, `created_at`, `updated_at`; `check (photo_path is null or consent_photo)`. Trigger antes de insert/update: `phase_on(1)` o `FASE_NO_ACTIVA`; si hay foto y la edad < 18 → `FOTO_MENOR_18`; si `consent_photo` y `consent_at` es null → `consent_at = now()`. RLS: select `user_id = auth.uid() or is_admin() or is_my_patient(user_id)`; insert/update/delete solo `user_id = auth.uid()`. |
| `care_requests` | `id uuid pk default gen_random_uuid()`, `patient_id uuid not null references profiles on delete cascade`, `nutritionist_id uuid references profiles on delete set null`, `status text not null default 'abierta' check in (abierta, aceptada, finalizada, cancelada)`, `message text check (≤500)`, `created_at`, `accepted_at`, `closed_at`. Índice único parcial: un paciente con una sola `abierta`/`aceptada`. RLS select: `patient_id = auth.uid() or is_admin() or (is_staff() and (status = 'abierta' or nutritionist_id = auth.uid()))`. **Sin** insert/update directos. |
| `is_my_patient(p_patient uuid) returns boolean` | existe `care_requests` con ese paciente, `nutritionist_id = auth.uid()` y `status = 'aceptada'`. stable, security definer. |
| `request_care(p_message text) returns care_requests` | con sesión (`SIN_SESION`); `phase_on(2)` o `FASE_NO_ACTIVA`; rol `usuario` o `NO_PERMITIDO`; con ficha o `FALTA_FICHA`; sin otra activa o `YA_TIENES_SOLICITUD`. |
| `cancel_care_request(p_id uuid) returns void` | dueño y estado abierta/aceptada → `cancelada`, `closed_at = now()`; si no, `NO_EXISTE`. |
| `accept_care_request(p_id uuid) returns void` | `is_staff()` o `SOLO_NUTRICIONISTA`; `phase_on(2)`; `update … where status = 'abierta'`; si no actualiza → `YA_TOMADA`. (S4 lo reemplaza para exigir suscripción.) |
| `finish_care_request(p_id uuid) returns void` | nutricionista asignado o admin; `aceptada` → `finalizada`; si no, `NO_EXISTE`. |
| `my_care_request() returns json` | la `abierta`/`aceptada` más reciente del que llama, con `nutritionist_name`; `null` si no hay. |
| `my_nutritionist() returns json` | `{id, full_name}` del nutricionista de mi solicitud `aceptada`, o `null`. |
| `list_open_care_requests()` | `returns table(id uuid, patient_id uuid, status text, message text, created_at timestamptz, patient_name text, patient_age int, patient_sex text, patient_goal text)`; solo staff; abiertas, más antigua primero. (`patient_goal` = goal de la ficha o del perfil.) |
| `list_my_patients()` | `returns table(patient_id uuid, full_name text, age int, sex text, request_id uuid, accepted_at timestamptz, days_total int, days_done int, last_followup_date date)`; pacientes con solicitud `aceptada` conmigo (admin: todas las aceptadas). S1 devuelve `0, 0, null` en las 3 últimas; S3 lo reemplaza. |
| `rating_summary(p_target_type text, p_target_id text) returns json` | S1: `{"average": null, "count": 0}` (marcador). S4 lo reemplaza. Grant a anon. |
| `profiles` (política nueva) | quitar «staff ve todo»: `profiles_read` → `id = auth.uid() or is_admin() or is_my_patient(id)`. |
| Storage `body-photos` | lectura: dueño, admin o `is_my_patient(<carpeta>::uuid)` (reemplaza la política que dejaba ver a todo el staff). Además permitir `update` al dueño (para reemplazar). |

## Migración 3 — `20261121000003_seguimiento_calendario_avisos.sql` (S3)

| Objeto | Definición |
|---|---|
| `followups` | `id uuid pk`, `patient_id uuid not null references profiles on delete cascade`, `nutritionist_id uuid not null default auth.uid() references profiles`, `followup_date date not null default current_date`, `weight_kg numeric(5,1) check (25–350)`, `waist_cm numeric(5,1) check (40–250)`, `observations text not null check (2–2000)`, `recommendations text not null check (2–2000)`, `created_at`. Trigger: `phase_on(2)` o `FASE_NO_ACTIVA`; `is_my_patient(patient_id)` o admin, si no `NO_ES_TU_PACIENTE`. RLS: select paciente/nutricionista autor/admin/`is_my_patient`; insert `nutritionist_id = auth.uid()`; delete autor. |
| `plan_days` | `id uuid pk`, `patient_id uuid not null references profiles on delete cascade`, `nutritionist_id uuid not null default auth.uid() references profiles`, `day date not null`, `title text not null check (2–120)`, `meals text check (≤2000)`, `exercise text check (≤2000)`, `notes text check (≤1000)`, `done_at timestamptz`, `patient_note text check (≤500)`, `created_at`, `updated_at`, `unique (patient_id, day)`. Trigger antes de insert/update: `phase_on(2)`; si quien escribe no es el paciente: `is_my_patient(patient_id)` o admin (`NO_ES_TU_PACIENTE`). RLS: select paciente / `is_my_patient` / admin; insert/update/delete `is_my_patient(patient_id) or is_admin()`. |
| `set_plan_day_done(p_id uuid, p_done bool, p_note text) returns plan_days` | solo el paciente dueño (`NO_EXISTE`); pone/quita `done_at`, guarda `patient_note`. |
| `copy_plan_week(p_patient uuid, p_from date, p_to date) returns int` | `is_my_patient` o admin; copia 7 días (`p_from`..`p_from+6`) a `p_to`.. con `on conflict (patient_id, day) do update` (sin copiar `done_at`/`patient_note`); devuelve cuántos. |
| `list_my_patients()` | reemplazar: `days_total`, `days_done` (con `done_at`) y `last_followup_date` reales. |
| `notifications` | `id uuid pk`, `user_id uuid not null references profiles on delete cascade`, `kind text not null`, `title text not null`, `body text`, `link text`, `read_at timestamptz`, `created_at`. Índice `(user_id, created_at desc)`. RLS: select/update/delete solo `user_id = auth.uid()`. Sin insert directo. |
| `notify(p_user uuid, p_kind text, p_title text, p_body text, p_link text) returns void` | security definer, **sin** grant a clientes (solo la usan triggers). |
| `mark_all_notifications_read() returns void` | del que llama. |
| Triggers de avisos | `care_requests` insert → a todos los perfiles `nutricionista`/`admin`: `solicitud_nueva`, «Nueva solicitud de atención», link `/nutri/solicitudes`. `care_requests` pasa a `aceptada` → paciente: `solicitud_aceptada`, «Un nutricionista aceptó tu solicitud», `/mi-panel?tab=nutricionista`. `plan_days` insert → paciente: `dia_nuevo`, «Tu nutricionista agregó días a tu plan», `/mi-panel?tab=calendario` (no repetir si ya hay uno sin leer de la última hora). `plan_days` `done_at` pasa de null a valor → nutricionista: `dia_cumplido`, «<nombre> cumplió el día <dd/mm>», `/nutri/pacientes/<patient_id>`. `followups` insert → paciente: `seguimiento_nuevo`, «Nuevo seguimiento de tu nutricionista», `/mi-panel?tab=nutricionista`. |

## Migración 4 — `20261121000004_pagos_resenas.sql` (S4)

| Objeto | Definición |
|---|---|
| `subscription_plans` | `id uuid pk`, `name text unique not null check (2–60)`, `monthly_price numeric(8,2) not null check (>= 0)`, `patient_quota int not null check (> 0)`, `active bool not null default true`, `sort int not null default 0`. Semilla: «Básico» 10.00 / 10, «Pro» 25.00 / 40. RLS: select `active or is_admin()` (anon y authenticated); all para admin. |
| `subscriptions` | `id uuid pk`, `nutritionist_id uuid not null references profiles on delete cascade`, `plan_id uuid not null references subscription_plans`, `status text not null default 'pendiente' check in (pendiente, activa, vencida, cancelada)`, `current_period_end timestamptz`, `created_at`. Índice único parcial: una `pendiente`/`activa` por nutricionista. RLS select: dueño o admin. Escritura solo por RPC. |
| `invoices` | `id uuid pk`, `payer_id uuid not null references profiles on delete cascade`, `payee_id uuid references profiles on delete set null` (null = plataforma), `kind text not null check in (suscripcion, consulta)`, `subscription_id uuid references subscriptions on delete set null`, `concept text not null check (2–200)`, `amount numeric(10,2) not null check (> 0)`, `status text not null default 'pendiente' check in (pendiente, reportada, pagada, anulada)`, `payment_reference text check (≤100)`, `reported_at`, `paid_at`, `created_at`. RLS select: `payer_id = auth.uid() or payee_id = auth.uid() or is_admin()`. Escritura solo por RPC. |
| `subscription_active(p_user uuid) returns boolean` | `activa` y `current_period_end > now()`. |
| `choose_plan(p_plan uuid) returns invoices` | rol nutricionista o admin (`SOLO_NUTRICIONISTA`); `phase_on(2)`; plan activo (`NO_EXISTE`); si ya tiene `activa` vigente → `YA_TIENES_SUSCRIPCION`; si tiene `pendiente`, se cancela con su factura pendiente; crea suscripción `pendiente` + factura `suscripcion` (payee null, concepto «Suscripción <plan> – 1 mes», monto = precio). |
| `create_invoice(p_patient uuid, p_concept text, p_amount numeric) returns invoices` | `is_my_patient(p_patient)` o `NO_ES_TU_PACIENTE`; `phase_on(2)`; kind `consulta`, payer = paciente, payee = el que llama. |
| `report_invoice_paid(p_id uuid, p_reference text) returns void` | solo el que paga; `pendiente` → `reportada`; referencia 4–100 o `DATOS_INVALIDOS`. |
| `mark_invoice_paid(p_id uuid) returns void` | quien cobra o admin (si payee null: solo admin); `pendiente`/`reportada` → `pagada`, `paid_at`. Si es de suscripción: `activa`, `current_period_end = greatest(now(), coalesce(current_period_end, now())) + interval '30 days'`. |
| `cancel_invoice(p_id uuid) returns void` | quien cobra o admin; no si `pagada`; → `anulada` (y su suscripción `pendiente` → `cancelada`). |
| `my_invoices()` | `returns table(` columnas de invoices `+ payer_name text, payee_name text)`; donde pago o cobro; más nueva primero. |
| `admin_list_invoices()` | igual que `my_invoices` pero todas; solo admin. |
| `my_subscription() returns json` | la última no cancelada con `plan` anidado (o null). Si `activa` y vencida por fecha, devolver `status: 'vencida'`. |
| `admin_list_subscriptions()` | `returns table(id, nutritionist_id, plan_id, status, current_period_end, created_at, nutritionist_name text, plan_name text, monthly_price numeric, patient_quota int)`; solo admin. |
| `accept_care_request` (reemplazar) | además: rol `nutricionista` (no admin) necesita `subscription_active` (`SIN_SUSCRIPCION`) y pacientes `aceptada` < `patient_quota` del plan (`CUPO_PLAN_LLENO`). |
| `nutri_dashboard() returns json` | `{open_requests, my_patients, week_days_total, week_days_done, pending_invoices, subscription}` (semana = lunes a domingo actual; `pending_invoices` = facturas que cobro en `pendiente`/`reportada`; `subscription` = `my_subscription()`). |
| `reviews` | `id uuid pk`, `target_type text not null check in (nutricionista, lugar)`, `target_id text not null`, `author_id uuid not null default auth.uid() references profiles on delete cascade`, `stars int not null check (1–5)`, `comment text check (≤1000)`, `created_at`, `updated_at`, `unique (target_type, target_id, author_id)`. Trigger: `phase_on(3)` o `FASE_NO_ACTIVA`; nutricionista: el autor tuvo una solicitud `aceptada`/`finalizada` con él, si no `NO_PERMITIDO`; lugar: debe existir en `places` (`NO_EXISTE`). RLS: select para todos (anon incluido); insert/update/delete `author_id = auth.uid()`. |
| `rating_summary(...)` (reemplazar) | `{"average": <numeric 1 decimal o null>, "count": n}`. |
| `list_reviews(p_target_type text, p_target_id text)` | `returns table(id, target_type, target_id, author_id, stars, comment, created_at, author_name text)`; `author_name` = solo el primer nombre; más nueva primero. Grant a anon. |
| Avisos | factura nueva → payer `factura_nueva` (`/mi-panel?tab=pagos` para paciente, `/nutri/suscripcion` para nutricionista); reportada → payee (o todos los admin si payee null) `factura_reportada` (`/admin/pagos` o `/nutri/pacientes/<payer>`); pagada → payer `factura_pagada`. |

## Semilla — `supabase/seed.sql` (S2, solo local)

Sectores y deportes ya están en la migración 1. La semilla trae los 300 lugares de `src/data/mock/places.osm.json` (+ `place_sports`) y 3 cuentas locales de prueba (contraseñas de `docs/entrega/CUENTAS-DE-PRUEBA.md`): admin (`admin`), nutricionista (`nutricionista`), paciente (`usuario`). Las cuentas se crean en `auth.users` + `auth.identities` con `crypt(<clave>, gen_salt('bf'))` y `email_confirmed_at = now()`; el trigger crea el perfil y luego se actualiza el rol. **En la nube no se cargan las cuentas** (solo los lugares): por eso van en un bloque marcado `-- CUENTAS LOCALES`.

# Contrato BD — Semana gratis, guía y suscripción del paciente

Diseño: `docs/superpowers/specs/2026-11-21-semana-gratis-design.md`. Se suma a `2026-11-21-db-contrato.md` (migraciones 1–5 ya aplicadas: **no se editan**).

**Convención de errores:** `raise exception 'CODIGO' using errcode = 'P0001'`. Para falta de permiso: `errcode = '42501'`.
**RPC:**
- Todas las RPC son `security definer set search_path = public`.
- Grant `execute` a `authenticated`, salvo las que se indican.
- Revocar las funciones internas a `public, anon, authenticated`.

---

## Migración 6 — `supabase/migrations/20261121000006_semana_gratis.sql` (tarea S5)

### 6.1 Hora local
```sql
create or replace function public.gye_today() returns date
language sql stable as $$ select (now() at time zone 'America/Guayaquil')::date $$;
```
Grant: anon y authenticated.

### 6.2 Ficha: columnas nuevas
```sql
alter table public.patient_intakes
  add column allergies text check (char_length(allergies) <= 300),
  add column conditions text[] not null default '{}'
    check (conditions <@ array['diabetes','hipertension','embarazo','renal','otra']::text[]);
```

### 6.3 Plantillas (las define la nutricionista)
```sql
create table public.plan_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 80),
  description text check (char_length(description) <= 500),
  sex text not null default 'cualquiera' check (sex in ('cualquiera','femenino','masculino')),
  age_min int not null default 18 check (age_min between 0 and 120),
  age_max int not null default 120 check (age_max between 0 and 120),
  bmi_min numeric(4,1) not null default 0,
  bmi_max numeric(4,1) not null default 99,
  goal text check (goal in ('bajar_peso','ganar_musculo','mantener','resistencia','bienestar')), -- null = cualquiera
  kcal_base int not null default 2000 check (kcal_base between 1200 and 4000),
  author_name text not null default 'Pendiente de revisión' check (char_length(author_name) between 2 and 120),
  status text not null default 'borrador' check (status in ('borrador','aprobada')),
  is_fallback bool not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (age_min <= age_max), check (bmi_min < bmi_max)
);
create unique index plan_templates_one_fallback on public.plan_templates((true)) where is_fallback;
-- trigger touch_updated_at

create table public.plan_template_items (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.plan_templates(id) on delete cascade,
  day_number int not null check (day_number between 1 and 7),
  at_time time not null,
  kind text not null check (kind in ('comida','rutina','habito')),
  title text not null check (char_length(title) between 2 and 120),
  detail text check (char_length(detail) <= 1000),
  sort int not null default 0
);
create index plan_template_items_tpl on public.plan_template_items(template_id, day_number, at_time);
```
**RLS:**
- Lectura y escritura solo con `public.is_staff()` (nutricionista o admin).
- Los pacientes **nunca** leen plantillas: verían los días cerrados.

### 6.4 Semana del paciente
```sql
create table public.trials (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  template_id uuid references public.plan_templates(id) on delete set null,
  template_name text not null,
  template_status text not null,            -- copia: 'borrador' | 'aprobada'
  author_name text not null,
  kcal_target int not null,
  portion_factor numeric(3,2) not null,
  started_on date not null default public.gye_today(),
  created_at timestamptz not null default now()
);
create table public.trial_days (
  user_id uuid not null references public.trials(user_id) on delete cascade,
  day_number int not null check (day_number between 1 and 7),
  unlocked_on date,            -- null = cerrado; > gye_today() = se abre ese día
  completed_at timestamptz,
  primary key (user_id, day_number)
);
create table public.trial_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.trials(user_id) on delete cascade,
  day_number int not null check (day_number between 1 and 7),
  at_time time not null,
  kind text not null check (kind in ('comida','rutina','habito')),
  title text not null,
  detail text,
  sort int not null default 0,
  done_at timestamptz
);
create index trial_items_user_day on public.trial_items(user_id, day_number, at_time);
```

`trial_day_open(p_user uuid, p_day int) returns bool`:
- `stable security definer`;
- es verdadero si existe `trial_days` con `unlocked_on is not null and unlocked_on <= gye_today()`;
- sin grant a clientes.

**RLS (sin políticas de escritura: todo por RPC):**
- `trials` y `trial_days`, lectura: `user_id = auth.uid() or public.is_my_patient(user_id) or public.is_admin()`.
- `trial_items`, lectura: `(user_id = auth.uid() and public.trial_day_open(user_id, day_number)) or public.is_my_patient(user_id) or public.is_admin()`.

### 6.5 Chequeo diario
```sql
create table public.daily_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  checkin_date date not null default public.gye_today(),
  mood int not null check (mood between 1 and 5),
  weight_kg numeric(5,1) check (weight_kg between 25 and 350),
  water_glasses int check (water_glasses between 0 and 20),
  note text check (char_length(note) <= 500),
  created_at timestamptz not null default now(),
  unique (user_id, checkin_date)
);
```
**RLS:**
- Lectura: `user_id = auth.uid() or public.is_my_patient(user_id) or public.is_admin()`.
- Sin escritura directa.

### 6.6 Funciones de la semana

**`trial_evaluate(p_user uuid) returns void`** (interna, sin grant)
1. El día actual es el de menor `day_number` con `completed_at is null` y `unlocked_on <= gye_today()`. Si no hay, termina.
2. Se completa cuando se cumplen las dos condiciones:
   - `done >= ceil(total / 2.0)` (con `total = 0` cuenta como cumplido);
   - existe un `daily_checkins` del usuario con `checkin_date >= unlocked_on`.
3. Al completarse:
   - `completed_at = now()`;
   - si el día es < 7, el siguiente pasa a `unlocked_on = gye_today() + 1`, solo si era null;
   - si el día es 7, `notify(p_user, 'semana_completada', '¡Semana completada!', 'Suscríbete para seguir con tu nutricionista.', '/mi-plan/suscripcion')`.
4. Si se desmarcan ítems de un día ya completado, el día **no** se des-completa.

**`assign_trial() returns public.trials`**
- **Validaciones:**
  - sin sesión: `SIN_SESION` (42501);
  - fase 1 apagada: `FASE_NO_ACTIVA`;
  - sin ficha: `FALTA_FICHA`;
  - `conditions` no vacío: `REQUIERE_NUTRICIONISTA`.
- **Idempotente:** si ya existe `trials` del usuario, la devuelve sin cambios.
- **Elección y cálculo:**
  - plantilla y calorías según §3.1 del diseño; al calcular la edad, si falta `birth_date` se usa 30 años;
  - sin plantillas candidatas ni de respaldo: `SIN_PLANTILLA`;
  - la plantilla elegida debe tener ítems.
- **Escritura:**
  - inserta `trials`;
  - inserta `trial_days` 1–7, con el día 1 en `unlocked_on = gye_today()` y el resto en null;
  - copia los ítems a `trial_items`.

**`my_trial(p_user uuid default null) returns json`**
- **Quién la usa:**
  - `p_user` null: el usuario actual;
  - otro `p_user`: solo `is_my_patient(p_user) or is_admin()`; si no, `NO_ES_TU_PACIENTE` (42501).
- **Sin trial:** devuelve `null`.
- **Forma:**
```json
{ "template_name": "...", "template_status": "borrador", "author_name": "...", "kcal_target": 1850,
  "portion_factor": 0.93, "started_on": "2026-11-21", "today": "2026-11-21",
  "current_day": 1, "finished": false,
  "days": [ { "day_number": 1, "unlocked": true, "unlocked_on": "2026-11-21", "completed_at": null,
              "items_total": 6, "items_done": 2,
              "items": [ { "id": "…", "at_time": "08:00", "kind": "comida", "title": "…", "detail": "…", "done": false } ] },
            { "day_number": 2, "unlocked": false, "unlocked_on": null, "completed_at": null,
              "items_total": 6, "items_done": 0, "items": [] } ] }
```
- **Campos:**
  - `unlocked = unlocked_on <= today`;
  - para el propio paciente, `items` va **vacío** en los días cerrados; el nutricionista y el admin ven todos;
  - `current_day`: el primer día abierto y no completado (null si no hay);
  - `finished`: el día 7 está completado;
  - `at_time` en formato `'HH24:MI'`.

**`set_trial_item_done(p_id uuid, p_done bool) returns json`**
- Solo el dueño, y con el día abierto; si no, `NO_EXISTE`.
- Pone o quita `done_at`.
- Llama a `trial_evaluate(auth.uid())`.
- Devuelve `my_trial()`.

**`save_checkin(p_mood int, p_weight numeric, p_water int, p_note text) returns public.daily_checkins`**
- Sin sesión: `SIN_SESION`.
- `mood` fuera de 1–5: `DATOS_INVALIDOS`.
- Hace upsert por `(auth.uid(), gye_today())`.
- Llama a `trial_evaluate(auth.uid())`.
- Devuelve la fila.

### 6.7 Suscripción del paciente
```sql
alter table public.subscription_plans
  add column audience text not null default 'nutricionista' check (audience in ('nutricionista','paciente'));
insert into public.subscription_plans (name, monthly_price, patient_quota, sort, audience)
  values ('Seguimiento mensual', 15.00, 1, 10, 'paciente') on conflict (name) do nothing;

create table public.patient_subscriptions (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles(id) on delete cascade,
  plan_id uuid not null references public.subscription_plans(id),
  status text not null default 'pendiente' check (status in ('pendiente','activa','vencida','cancelada')),
  current_period_end timestamptz,
  created_at timestamptz not null default now()
);
create unique index patient_subscriptions_one_open on public.patient_subscriptions(patient_id)
  where status in ('pendiente','activa');
-- RLS lectura: patient_id = auth.uid() or is_admin() or is_my_patient(patient_id). Sin escritura directa.

alter table public.invoices drop constraint invoices_kind_check;
alter table public.invoices add constraint invoices_kind_check
  check (kind in ('suscripcion','consulta','suscripcion_paciente'));
alter table public.invoices add column patient_subscription_id uuid
  references public.patient_subscriptions(id) on delete set null;
```
> Si la restricción de `kind` tiene otro nombre, búscalo en `pg_constraint` y bórralo con un bloque `do $$ … $$`.

**`patient_subscription_active(p_user uuid) returns bool`** (`stable`)
- Es verdadero si hay una suscripción `activa` con `current_period_end > now()`.
- Grant: authenticated.

**`choose_patient_plan(p_plan uuid) returns public.invoices`**
- **Validaciones:**
  - sin sesión: `SIN_SESION`;
  - fase 2 apagada: `FASE_NO_ACTIVA`;
  - plan inexistente, inactivo o con `audience <> 'paciente'`: `NO_EXISTE`;
  - ya tiene una suscripción activa: `YA_TIENES_SUSCRIPCION`.
- **Limpieza:** anula la pendiente anterior y su factura (igual que `choose_plan`).
- **Inserción:**
  - una suscripción `pendiente`;
  - una factura `payer = auth.uid()`, `payee = null`, `kind 'suscripcion_paciente'`, `patient_subscription_id`, concepto `'Seguimiento mensual – 1 mes'` (usa el nombre del plan).

**`my_patient_subscription() returns table (id, plan_id, plan_name, monthly_price, status, current_period_end, created_at)`**
- Devuelve la más reciente que no esté cancelada, o ninguna fila.

**`mark_invoice_paid(p_id uuid)`**
- `create or replace`: **copia el cuerpo actual de la migración 4 y consérvalo todo**.
- Agrega el caso `kind = 'suscripcion_paciente'`:
  - activa `patient_subscriptions` con la misma regla de los 30 días;
  - si el paciente no tiene una `care_requests` abierta o aceptada, inserta una `('abierta', message 'Suscripción activa: continuar después de la semana gratis')`;
  - el trigger existente avisa al staff.
- Pagar la factura de un paciente ya lo puede hacer el admin, porque `payee` es null.

**`cancel_invoice`**
- `create or replace`, conservando el cuerpo actual.
- Además, si `patient_subscription_id` no es null, cancela esa suscripción si está pendiente.

**Lista de planes para el nutricionista:** el cliente filtra `audience = 'nutricionista'`. No hay cambio de SQL.

### 6.8 Agenda pagada: lectura del paciente
- Reemplaza la política `plan_days_read`:
  `using ((patient_id = auth.uid() and public.patient_subscription_active(auth.uid())) or public.is_my_patient(patient_id) or public.is_admin())`.
- `set_plan_day_done` exige además `patient_subscription_active(auth.uid())`; si no, `SIN_SUSCRIPCION`.
- Si `supabase/tests/02_*.sql` o `04_*.sql` fallan por esta regla, **ajusta esos tests** (solo las aserciones del paciente que lee o marca `plan_days`) dándole una suscripción activa al paciente de la prueba. Anótalo en el reporte.

### 6.9 Guía
```sql
create table public.guide_entries (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,60}$'),
  category text not null check (category in ('hidratacion','porciones','antes_entrenar','despues_entrenar','comer_fuera','descanso','compras')),
  title text not null check (char_length(title) between 2 and 120),
  summary text check (char_length(summary) <= 300),
  objective text check (char_length(objective) <= 600),
  do_items text[] not null default '{}',
  avoid_items text[] not null default '{}',
  steps text[] not null default '{}',
  source text check (char_length(source) <= 200),
  published bool not null default true,
  sort int not null default 0,
  updated_at timestamptz not null default now()
);
```
**RLS:**
- Lectura para anon y authenticated: `published or public.is_staff()`.
- Escritura (insert, update, delete): `public.is_staff()`.

### 6.10 Pruebas — `supabase/tests/05_semana_gratis.sql` (pgTAP)
Para las pruebas crea tus propias plantillas (la migración 7 trae las reales). Como mínimo:
1. `assign_trial` sin ficha devuelve `FALTA_FICHA`; con `conditions = {diabetes}` devuelve `REQUIERE_NUTRICIONISTA`.
2. Con dos plantillas (una general y otra para femenino 18–29 IMC 25–30 bajar_peso), una mujer de 25 años con IMC 27 que quiere bajar recibe la específica; un hombre recibe la general (o la de respaldo).
3. `assign_trial` dos veces devuelve el mismo trial y no duplica ítems.
4. El paciente lee los `trial_items` del día 1 pero **0 filas** del día 2. `my_trial()` devuelve el día 2 con `items: []` y `unlocked: false`.
5. Marcar la mitad de los ítems **sin** chequeo no completa el día. Con `save_checkin` el día 1 queda completado y el día 2 con `unlocked_on = gye_today() + 1`, todavía cerrado hoy.
6. `set_trial_item_done` sobre un ítem del día 2 devuelve `NO_EXISTE`. Otro paciente no ve nada de este.
7. El nutricionista asignado ve todos los ítems y los chequeos; otro nutricionista no.
8. `choose_patient_plan` con fase 2 apagada devuelve `FASE_NO_ACTIVA`. Encendida, crea una factura `suscripcion_paciente`; el admin la marca pagada y la suscripción queda activa y existe una `care_requests` abierta.
9. Sin suscripción, el paciente lee 0 `plan_days`; con suscripción activa los lee.
10. Guía: anon lee las publicadas; anon no puede insertar; un nutricionista sí.

---

## Migración 7 — `supabase/migrations/20261121000007_contenido_plantillas_guia.sql` (tarea S6)

Datos solo con `insert`, sin cambios de esquema. Debe poder aplicarse en la nube con `db push`.

**Plantillas:** 9 plantillas más 1 de respaldo (`is_fallback = true`, sin criterios).
- Todas con `status = 'borrador'` y `author_name = 'Pendiente de revisión'`.
- Combinaciones mínimas:
  - bajar_peso × (femenino, masculino) × IMC [25, 30) y [30, 99);
  - mantener × cualquiera × IMC [18.5, 25);
  - ganar_musculo × (femenino, masculino);
  - bienestar o resistencia × cualquiera, 50+ años.

**Ítems:** cada plantilla tiene los 7 días, y cada día lleva:
- 5 comidas: 07:30 desayuno · 10:30 media mañana · 13:00 almuerzo · 16:30 merienda · 19:30 cena;
- 1 rutina: caminar, trotar, fuerza con el propio peso, bicicleta o yoga, con minutos y nivel;
- 1 hábito: agua o sueño.

**Comida ecuatoriana real y variada**, por ejemplo:
- desayunos: bolón de verde al horno con huevo, tigrillo light, humita, avena con frutas;
- almuerzos y cenas: encebollado, seco de pollo, menestra con pescado a la plancha, caldo de gallina, ceviche de camarón, corvina al vapor, tortilla de verde.

Cada `detail` dice las porciones para `kcal_base`, en medidas caseras (taza, palma, puño).

**Guía:** 12 entradas en `guide_entries`.
- Categorías: al menos una por categoría, con `do_items`, `avoid_items` y `steps` de 3 a 5 elementos.
- `source`: fuentes generales reales (OMS, MSP Ecuador, Guías Alimentarias Basadas en Alimentos del Ecuador). No inventes citas textuales.

**Pruebas:** `supabase/tests/06_contenido.sql` (pgTAP). Comprueba que hay ≥ 10 plantillas y exactamente 1 de respaldo, que cada plantilla tiene ítems en los 7 días con al menos 5 comidas por día, ≥ 12 entradas de guía y todas las categorías cubiertas.

**Semilla local:** agrega a `supabase/seed.sql` un bloque `-- SEMANA GRATIS DEMO`, después de las cuentas, con una paciente demo `semana@activagye.test`, contraseña `ActivaSemana2026!` (agrégala a `docs/entrega/CUENTAS-DE-PRUEBA.md`).
- Tiene la ficha llena y el trial asignado directamente por SQL.
- Los días 1–7 están completados, para probar el muro de pago.
- Ese bloque es solo local: `seed.sql` no se sube a la nube.

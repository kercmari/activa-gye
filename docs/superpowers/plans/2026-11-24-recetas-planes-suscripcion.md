# Recetas, planes y suscripción por correo — plan de implementación

> **Para agentes:** este plan se ejecuta con la cadena `work/recetas.sh` (briefs en `work/gen/briefs_recetas.py`). Haiku implementa, opus revisa y cada fase dura 20 min como máximo. Cada tarea lee también el diseño.

**Meta:** recetas que llenan el calendario, planes Gratis/Starter/Profesional con límites que cumple la base, suscripción pedida por correo y aprobada en Admin, y vistas de admin y nutricionista completas.

**Arquitectura:** dos migraciones nuevas (12 y 13) sobre las 1–11; contrato TS en `src/data/types.ts`, con implementación Supabase y simulador; pantallas nuevas y ajustadas en `src/pages/{admin,nutri,plan}`. Todo lo nuevo para pacientes y nutricionistas es de la fase 2.

**Stack:** Supabase (Postgres + RLS + RPC `security definer`, pgTAP), React 19 + TS + Tailwind v4 + react-router v8, Vitest y Playwright.

**Diseño:** `docs/superpowers/specs/2026-11-24-recetas-planes-suscripcion.md` (manda sobre este plan si hay diferencia).

## Restricciones globales
- Precios iniciales:
  - Starter $9, 15 pacientes, 60 registros por día;
  - Profesional $19, 50 pacientes, sin límite diario;
  - paciente «Seguimiento mensual» $40 con 10 recetas;
  - plan gratis 3 pacientes y 10 registros por día.
- `admin_email` inicial: `kerlyeliz19@gmail.com`.
- Pago: solo el botón «Contactar por correo para solicitar una suscripción» (`mailto:`). Ningún dato bancario ni formulario de pago visible.
- Fase 2 apagada: no se ve nada nuevo de paciente ni de nutricionista. Admin → Suscripciones y Admin → Planes y correo se ven siempre.
- Migraciones nuevas: nunca editar las 1–11. Repetir los `grant execute` explícitos de cada función nueva, como en la migración 9.
- Textos en español de Ecuador. Errores con `errorMessage(e)` y los textos del §4 del diseño.
- Commits sin `Co-Authored-By`. Nada de push, deploy ni tocar la nube.

## Contrato

### Migración 12 — `supabase/migrations/20261124000012_planes_suscripcion_correo.sql`
- **`app_settings`:**
  - columnas nuevas `admin_email text not null default 'kerlyeliz19@gmail.com'` (check `~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'`), `free_patient_limit int not null default 3` (> 0) y `free_daily_record_limit int not null default 10` (> 0);
  - `get_public_settings()` devuelve además `admin_email`, `free_patient_limit` y `free_daily_record_limit` (copia el cuerpo de la migración 11).
- **`admin_set_contact_settings(p_admin_email text, p_free_patient_limit int, p_free_daily_record_limit int) returns void`:** errores `SOLO_ADMIN` y `DATOS_INVALIDOS`.
- **`subscription_plans`:**
  - `+ daily_record_limit int null (>0)`, `+ recipe_quota int null (>0)`, `+ features text[] not null default '{}'`;
  - por nombre: `Básico` pasa a `Starter`; `Pro` pasa a `Profesional`; `Seguimiento mensual` sube a $40 con `recipe_quota` 10; precios y límites según las restricciones globales;
  - `features` con 2 o 3 textos por plan.
- **`patient_subscriptions`:** `+ recipes_left int not null default 0 check (>= 0)`.
- **`care_requests`:** `+ origin text not null default 'plataforma' check in ('plataforma','propio')`.
- **Índices:** se borran `subscriptions_one_open_idx` y `patient_subscriptions_one_open`. Se crean `*_one_active` (where `status='activa'`) y `*_one_pending` (where `status='pendiente'`) en las dos tablas.
- **`choose_plan` / `choose_patient_plan`:** ya no rechazan con una activa vigente. Reemplazan la pendiente, como hoy.
- **`mark_invoice_paid`:**
  - **Renovación** (mismo plan que la activa): +30 días sobre el vencimiento.
  - **Cambio de plan de nutricionista:** la activa pasa a `cancelada` y la nueva queda `activa` por `now()+30 días`.
  - **Paciente:** `recipes_left` = (saldo si seguía vigente, si no 0) + `recipe_quota`. Si la aprobada es la pendiente, el saldo queda en la fila que termina `activa`.
  - Se conserva la creación de la solicitud de atención (`origin='plataforma'`).
- **Helpers `stable security definer`:**
  - `nutri_patient_quota(p uuid) returns int`: el `patient_quota` del plan activo, o `free_patient_limit`;
  - `nutri_daily_limit(p uuid) returns int`: `null` significa sin límite; sin plan, `free_daily_record_limit`.
- **`nutri_limits() returns json`:** `{plan_name, patient_quota, daily_record_limit, patients_used, records_today}`. `records_today` vale 0 hasta la migración 13, que redefine la función.
- **`accept_care_request`:** sin suscripción usa el cupo gratis (ya no lanza `SIN_SUSCRIPCION`). Cuenta todas las `aceptada`, con el mismo bloqueo; sin suscripción, `pg_advisory_xact_lock(hashtext(uid))`.
- **`admin_subscriptions_overview() returns json`:** `{pending: Row[], active: Row[]}`. Cada `Row` trae `invoice_id`, `subscription_id`, `audience ('nutricionista'|'paciente')`, `user_id`, `full_name`, `email`, `plan_name`, `amount`, `status`, `created_at`, `period_end` y `recipes_left` (null para nutricionista). Error `SOLO_ADMIN`.
- **Test:** `supabase/tests/09_planes_suscripcion.sql`.

### Migración 13 — `supabase/migrations/20261124000013_recetas_calendario_limites.sql`
- **Tabla `prescriptions`:** como en el diseño §2.3. RLS de lectura: el paciente ve solo las suyas `entregada`; además `is_my_patient` y `is_admin`. Sin escritura directa.
- **`plan_days`:**
  - `+ prescription_id uuid null references prescriptions on delete cascade`;
  - trigger `before insert`: sin receta lanza `RECETA_REQUERIDA`; receta de otro paciente o no `borrador` lanza `RECETA_CERRADA`;
  - las políticas update y delete exigen receta nula (filas viejas) o en `borrador`;
  - un `insert` en un día ya ocupado lanza `DIA_OCUPADO`; se captura el `unique_violation`.
- **`plan_days_read` y `set_plan_day_done`:** la regla del diseño §2.4.
- **Trigger de límite diario** (`before insert` en `plan_days` y `prescriptions`):
  - lanza `LIMITE_DIARIO`;
  - no aplica a la administradora ni cuando `current_setting('activa.registro_automatico', true) = 'on'`;
  - el día es `gye_today()` sobre `created_at`.
- **RPC:**
  - `save_prescription(p_id uuid, p_patient uuid, p_kind text, p_title text, p_body text) returns prescriptions`: crea si `p_id` es null; edita solo en `borrador`;
  - `delete_prescription(p_id uuid) returns void`: solo en `borrador`;
  - `deliver_prescription(p_id uuid) returns prescriptions`: el diseño §2.3, con `for update`; notifica con `notify`;
  - `patient_recipe_balance(p_patient uuid default auth.uid()) returns json`: `{left, quota, period_end}`;
  - `nutri_add_patient(p_email text) returns json`: `{patient_id, prescription_id}`; el diseño §2.6, con «Semana 1» desde la plantilla que elegiría `assign_trial`, o días vacíos «Día N»;
  - `copy_plan_week(p_patient uuid, p_from date, p_to date, p_prescription uuid) returns int`: se **borra** la versión de 3 parámetros; copia solo en días libres, dentro de la receta borrador; si no cabe todo, falla completa.
- **`list_my_patients`** (`drop` + `create`): + `origin` y `recipes_left`.
- **`nutri_dashboard`:** + `limits` (= `nutri_limits()`) y `recipes_week`.
- **`nutri_limits`:** `records_today` real.
- **Test:** `supabase/tests/10_recetas_calendario.sql`.

### TypeScript — `src/data/types.ts`
Los campos van en snake_case, como el resto del archivo.

- **Tipos nuevos:**
  - `PrescriptionKind = 'dieta'|'rutina'|'recomendacion'` y `PrescriptionStatus = 'borrador'|'entregada'`;
  - `Prescription { id, patient_id, nutritionist_id, kind, title, body, status, counts_against_patient, delivered_at: string|null, created_at, updated_at }`;
  - `PrescriptionInput { id?: string, patient_id, kind, title, body }`;
  - `RecipeBalance { left: number, quota: number, period_end: string|null }`;
  - `NutriLimits { plan_name: string|null, patient_quota: number, daily_record_limit: number|null, patients_used: number, records_today: number }`;
  - `AdminSubscriptionRow` (campos de la migración 12) y `AdminSubscriptionsOverview { pending, active }`;
  - `ContactSettingsInput { admin_email, free_patient_limit, free_daily_record_limit }`.
- **Campos nuevos en tipos que ya existen:**
  - `AppSettings`: `admin_email`, `free_patient_limit`, `free_daily_record_limit`;
  - `SubscriptionPlan`: `daily_record_limit: number|null`, `recipe_quota: number|null`, `features: string[]`;
  - `PlanDay`: `prescription_id: string|null`; `PlanDayInput`: `prescription_id: string`;
  - `PatientSummary`: `origin`, `recipes_left: number|null`;
  - `CareRequest`: `origin`;
  - `NutriDashboard`: `limits: NutriLimits`, `recipes_week: number`;
  - `PatientSubscription`: `recipes_left`.
- **`Repo`:**
  - `listPrescriptions(patientId)`, `listMyPrescriptions()`, `savePrescription(input)`, `deletePrescription(id)` y `deliverPrescription(id): Promise<Prescription>`;
  - `getRecipeBalance(patientId?)` y `nutriAddPatient(email): Promise<{patient_id, prescription_id}>`;
  - `getNutriLimits()`, `adminSubscriptionsOverview()` y `adminSaveContactSettings(input): Promise<AppSettings>`;
  - `copyPlanWeek(patientId, fromMonday, toMonday, prescriptionId)`.
- **Errores nuevos** (`src/data/supabase/errors.ts` y simulador): `SIN_RECETAS`, `SIN_SUSCRIPCION_PACIENTE`, `LIMITE_DIARIO`, `PACIENTE_NO_REGISTRADO`, `PACIENTE_OCUPADO`, `RECETA_REQUERIDA`, `RECETA_CERRADA` y `DIA_OCUPADO`, con los textos del diseño §4. Para los tres últimos el texto lo escribe la tarea.
- **Helper `src/lib/mailto.ts`:**
  - `subscriptionMailto(adminEmail, {plan, price, fullName, email}): string`;
  - `contactMailto(adminEmail, subject?): string`;
  - ambos con `encodeURIComponent`.

## Tareas y rondas (cada tarea es un brief de ≤ 20 min)

| Ronda | Tarea | Dueño de | Entrega |
|---|---|---|---|
| R1 | **S12** (haiku) | migración 12 + test 09 | contrato migración 12; `npx supabase test db` verde |
| R1 | **DT1** (haiku) | `types.ts`, `src/data/supabase/*`, `errors.ts`, `src/lib/mailto.ts` + tests | contrato TS e implementación Supabase (llama las RPC por nombre; tests con el cliente simulado) |
| R2 | **S13** (haiku) | migración 13 + test 10 | contrato migración 13 |
| R2 | **DT2** (haiku) | `src/data/mock/*` | simulador de todo el contrato nuevo (límites, saldo, entrega) + tests |
| R2 | **UA** (haiku) | `src/pages/admin/*` (Suscripciones nueva, Planes y correo nueva, portada, Usuarios, Mensajes «Responder por correo»), `AdminShell`, rutas admin en `App.tsx`, `Footer.tsx` y `ContactoPage.tsx` (enlace a la administración) | diseño §2.7–2.9 y §3 Admin; `/admin/pagos` redirige a `/admin/suscripciones` |
| R2 | **UP** (haiku) | `src/pages/plan/*`, `PlanShell` | Suscripción con el botón de correo y el saldo; Agenda y Hoy con días de recetas sin depender de la semana gratis ni de la suscripción; «Mis recetas» |
| R3 | **UN1** (haiku) | `src/pages/nutri/TableroPage.tsx`, `MisPacientesPage.tsx` nueva, `SuscripcionPage.tsx` (Mi plan), `NutriShell`, rutas nutri en `App.tsx` | Tablero con límites; Mis pacientes con «Agregar paciente»; Mi plan con tres tarjetas y el botón de correo |
| R3 | **UN2** (haiku) | `src/pages/nutri/PacientePage.tsx`, `src/components/nutri/PlanEditor.tsx`, `RecetaEditor.tsx` nuevo | pestaña Recetas: borradores y entregadas, editor con días, Entregar con confirmación y saldo, errores |
| R4 | **EX2** (haiku) | `e2e/recetas.spec.ts`, `e2e/suscripciones.spec.ts`, `e2e/helpers.ts`; los specs viejos solo si el cambio los dejó desactualizados | los tres e2e del diseño §5 |
| R5 | **RV1** (opus) ‖ **RV2** (opus) | solo revisión | RV1: base y seguridad (falsifica el diseño, «lo que no debe pasar»); RV2: pantallas a 360 y 1280 px con `work/ref/CHECKLIST-FRONT.md` |
| R6 | **XV** (haiku) y luego **RV3** (opus) | lo que devuelvan RV1 y RV2 | arreglo y re-revisión (una vuelta más si sigue DO NOT SHIP) |

`App.tsx` lo tocan UA (solo las rutas `admin/*`) y UN1 (solo las rutas `nutri/*`), en rondas distintas.

## Foco de revisión (lo que más probablemente muerda)
1. **Doble clic en «Entregar» o en «Aprobar»:** debe descontar o activar una sola vez. Lo prueba el pgTAP de S13 (entrega doble) y el de S12 (aprobar dos veces da `ESTADO_INVALIDO`).
2. **Paciente con la suscripción vencida y recetas entregadas:** sigue viendo esos días y no ve borradores. Lo prueba el pgTAP de S13.
3. **Nutricionista gratis en el límite de 3 pacientes que intenta aceptar una solicitud:** `CUPO_PLAN_LLENO` con un texto claro. Lo prueban el pgTAP de S12 y el Vitest de UN1.
4. **Correo de administración con caracteres raros, como `+` o tildes en el nombre del plan:** el `mailto:` se arma bien. Lo prueba el test de `mailto.ts` en DT1.
5. **Fase 2 apagada:** no se ve nada nuevo y Admin sigue completo. Lo prueba el e2e de EX2.

# Plan — Activa GYE: backend real (Supabase) y 3 fases

Diseño: `docs/superpowers/specs/2026-11-21-activa-gye-fases-backend-design.md`. Lanzador: `work/fases.sh` (mismo método que `work/noche.sh`: worktrees `../activa-gye-wt/<ID>`, ramas `t/<ID>`, haiku implementa, opus revisa, cada fase ≤ 20 min, reanudable, nunca push ni deploy).

## Ronda 0 — orquestador (yo, antes de lanzar)

1. **Contrato** `src/data/types.ts`: tipos `AppSettings`, `PatientIntake`(+Input), `CareRequest`, `Followup`(+Input), `PlanDay`(+Input), `AppNotification`, `SubscriptionPlan`, `Subscription`, `Invoice`(+Input), `Review`(+Input), `PatientSummary`, `NutriDashboard`; métodos nuevos en `Repo`; códigos de error nuevos (`CUPO_LLENO`, `FASE_NO_ACTIVA`, `SIN_SUSCRIPCION`, `CUPO_PLAN_LLENO`, `YA_TIENES_SOLICITUD`, `NO_ES_TU_PACIENTE`, `SIN_BASE`). Se quitan los métodos de `nutrition_requests`.
2. **Simulador:** los métodos nuevos lanzan `AppError('SIN_BASE', …)`; se borran los de nutrición vieja.
3. **Rutas** en `src/App.tsx` para todas las pantallas nuevas, apuntando a archivos «stub» que cada agente reemplaza; se quitan las rutas retiradas.
4. **Fases en la página:** `src/auth/SettingsContext.tsx` (`useSettings()` → `{phase1, phase2, phase3, patient_limit}`) y componente `src/components/PhaseGate.tsx` («Próximamente» si la fase está apagada).
5. **Variables:** `.env.example` con `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`; `.env.local` con los valores de la Supabase local (no se versiona). `src/data/index.ts` elige Supabase si hay variables.
6. Generar briefs (`work/gen/briefs-fases.py`) y lanzar.

## Ronda 1 (en paralelo)

| ID | Qué hace | Archivos suyos |
|---|---|---|
| **S1** | Migración 2: `app_settings` + `get_public_settings()` + `admin_set_settings()`; cupo en `handle_new_user` (`CUPO_LLENO`); helper `phase_on(n)`; `patient_intakes`; `care_requests` + `request_care()`, `accept_care_request()`, `finish_care_request()`, `cancel_care_request()`; helper `is_my_patient(uid)`; `notifications` + triggers; quitar `nutrition_requests`. Pruebas pgTAP en `supabase/tests/`. | `supabase/migrations/20261121000002_*.sql`, `supabase/tests/01_*.sql` |
| **S2** | Lugares a la base: script que convierte `src/data/mock/places.osm.json` en `supabase/seed.sql` (sectores, deportes y 300 lugares con sus deportes) + cuentas demo (admin, nutri, paciente) | `scripts/seed-sql.mjs`, `supabase/seed.sql` |
| **D1** | `src/data/supabase/`: `client.ts`, `errors.ts` (traduce errores de Postgres a `AppError`), `catalog.ts`, `account.ts` (auth, perfil, favoritos, contacto, admin lugares/usuarios/mensajes, settings) con pruebas (vi.mock de supabase-js) | `src/data/supabase/{client,errors,catalog,account}.ts` + tests |
| **U1** | **Panel del paciente** `/mi-panel`: pestaña **Mi ficha** (formulario con foto, consentimiento, edad calculada, estimación básica de calorías), pestañas Calendario/Pagos/Mi nutricionista con `PhaseGate`; registro muestra `CUPO_LLENO`; **Admin → Fases** (casillas + cupo) | `src/pages/panel/*`, `src/pages/admin/AdminFasesPage.tsx`, `src/components/panel/*`, `RegistroPage.tsx` |

## Ronda 2 (en paralelo)

| ID | Qué hace | Archivos suyos |
|---|---|---|
| **S3** | Migración 3: `followups`, `plan_days`, `subscription_plans` (Básico/Pro), `subscriptions`, `invoices` + `report_invoice_paid()`, `mark_invoice_paid()`, `choose_plan()`; `reviews` + vistas de promedio; checks de fase 2/3; avisos. pgTAP. | `supabase/migrations/20261121000003_*.sql`, `supabase/tests/02_*.sql` |
| **D2** | `src/data/supabase/care.ts`: ficha (con foto a `body-photos`), solicitudes, notificaciones, tablero del nutricionista | `src/data/supabase/care.ts` + test |
| **U2** | **Nutricionista A:** `/nutri` tablero, `/nutri/solicitudes` bolsa + Aceptar, **campana** de avisos en el encabezado y `/notificaciones` | `src/pages/nutri/{Tablero,Solicitudes}Page.tsx`, `src/pages/NotificacionesPage.tsx`, `src/components/NotificationBell.tsx` |
| **U3** | Paciente fase 2: pestaña **Mi nutricionista** (pedir, estado, cancelar) | `src/components/panel/MiNutricionistaTab.tsx` |

## Ronda 3 (en paralelo)

| ID | Qué hace | Archivos suyos |
|---|---|---|
| **D3** | `src/data/supabase/plan.ts`: seguimientos, días del plan, suscripción, facturas, reseñas | `src/data/supabase/plan.ts` + test |
| **U4** | **Nutricionista B:** `/nutri/pacientes/:id` (ficha + foto, seguimientos, editor de calendario con «copiar semana», crear factura), `/nutri/suscripcion` | `src/pages/nutri/{Paciente,Suscripcion}Page.tsx`, `src/components/nutri/*` |
| **U5** | Paciente: pestaña **Calendario y progreso** (mes, marcar cumplido, % y gráfico de peso) y **Pagos** (facturas, reportar transferencia) | `src/components/panel/{Calendario,Pagos}Tab.tsx` |
| **U6** | Fase 3: **reseñas** (componente estrellas, en ficha de lugar y de nutricionista), `/mi-panel/reporte` imprimible, **Admin → Datos de lugares**, **Admin → Pagos** | `src/components/reviews/*`, `src/pages/panel/ReportePage.tsx`, `src/pages/admin/Admin{DatosLugares,Pagos}Page.tsx` |

## Ronda 4

| ID | Qué hace |
|---|---|
| **orquestador** | une todo, `npx supabase db reset` (local), cambia a Supabase, revisa a mano |
| **C1** | Edge Function `enviar-correo` (Brevo; sin clave = no envía) + trigger que la llama | 
| **E1** | Pruebas Playwright de punta a punta contra la Supabase local: fase 1 (registro, ficha con foto, cupo), activar fase 2 en Admin → Fases, flujo solicitud → aceptar → calendario → cumplido → factura → pagada, fase 3 (reseña, reporte). Evidencia en `docs/entrega/` (capturas nuevas, `FASES.md`) |
| **DOC** | README y `docs/entrega/PUESTA-EN-MARCHA.md` (crear Supabase, variables, `db push`, Brevo) |

## Revisión (opus) y arreglos (haiku)

- **R1:** seguridad y datos (RLS: un paciente no ve a otro; fases apagadas bloqueadas en la base; pagos). **R2:** navegación real (cada botón funciona y tiene regreso; fases encendidas/apagadas).
- Si DO NOT SHIP → **X1/X2** → **R1b/R2b** (hasta 2 vueltas).

## Publicación (necesita a la dueña)

1. Ella: proyecto en supabase.com + `npx supabase login`.
2. Yo: `npx supabase link --project-ref …`, `npx supabase db push`, cargar `seed.sql` (lugares; **sin** cuentas demo de contraseña conocida — el admin real se crea con su correo), variables en `.env.production.local`, `npm run build`, `npx wrangler deploy`.
3. Fase inicial en la nube: solo `phase1` encendida.

## Gates de cada agente
`npm run -s lint` · `npm run -s build` · `npx vitest run` · (S1/S3) `npx supabase test db` · (E1, revisiones) `npx playwright test`.
Los agentes **no** corren `supabase start/stop/db reset`: solo el orquestador. S1/S3 prueban con `npx supabase db reset` **solo** cuando el lanzador les da el turno exclusivo de la base (S1 y S3 están en rondas distintas, y en su ronda nadie más toca la base).

# RT — REVISOR (opus) — Seguridad y datos de la semana gratis
**Reglas:** solo revisar: nunca edites, nunca commit, nunca push. Sigue `work/TOKEN-PROTOCOL.md` (regla 3). Máximo 20 minutos.
**Hallazgos:** `work/out/RT/report.md`
**Lee:** `docs/superpowers/specs/2026-11-21-semana-gratis-design.md`, `docs/superpowers/plans/2026-11-21-db-contrato-semana.md`, `src/data/types.ts` (sección SEMANA GRATIS), los reportes `work/out/*/report.md` de esta ronda (S5 S6 D4 U7a U7b U7c U7d U8a U8b U8c EG) y `git log --oneline -40`. Referencia visual: `work/ref-base-vital/`.
**Alcance:** Migraciones 6–7, `supabase/tests/05_*.sql` y `06_*.sql`, `src/data/supabase/trial.ts` y los cambios en `care.ts`/`plan.ts`. ¿Cumple el contrato? ¿RLS correcta?
**Mide, no confíes en los reportes.** Gates: `npm run -s lint`, `npm run -s build`, `npx vitest run`, `npx supabase test db`, `npx playwright test --reporter=line` (la base local ya está lista con la semilla; NO hagas `db reset`, `start` ni `stop`). Cuentas: `docs/entrega/CUENTAS-DE-PRUEBA.md`.
**Intenta romper:**
- Como paciente: leer `trial_items` de días cerrados (tabla directa, `my_trial`, `set_trial_item_done` con id de un día cerrado); leer `plan_templates`/`plan_template_items`; leer trial/chequeos de otro paciente; adelantar días (chequeo + marcar varias veces el mismo día, cambiar la fecha del chequeo); `assign_trial` con condiciones; leer `plan_days` sin suscripción; marcar `set_plan_day_done` sin suscripción.
- Pagos: paciente marca pagada su propia factura de suscripción; `choose_patient_plan` con plan de nutricionista; doble suscripción.
- ¿`mark_invoice_paid` y `cancel_invoice` conservan TODO lo que hacían en la migración 4? (compara cuerpos).
- ¿`anon` puede escribir la guía o leer algo privado? ¿Alguna `security definer` sin chequeo?
- Zona horaria: ¿se usa `gye_today()` en todos lados?
**Veredicto:** la línea `## Verdict: **SHIP**` o `## Verdict: **DO NOT SHIP**` (inglés, exacto). DO NOT SHIP solo por: un paciente ve ítems de un día cerrado o datos de otro; se usa la agenda pagada sin suscripción; alguien con condición de salud recibe plan automático; un plan borrador se presenta como firmado; pago marcable por quien no debe; botón sin acción; pantalla sin salida; crash; gate rojo; texto falso visible. Luego `HOTFIX NOW` / `BLOCKING` (archivo:línea + cómo reproducir + arreglo sugerido) / `non-blocking`. A cada BLOCKING ponle área: `[sql]`, `[datos]`, `[paciente]`, `[nutri]`, `[admin]`, `[guia]`, `[e2e]`.
**Última línea:** `NEXT: el orquestador lee RT.`

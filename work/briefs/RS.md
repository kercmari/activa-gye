# RS — REVISOR (opus) — Seguridad y datos (SQL + capa Supabase)
**Reglas:** solo revisar: nunca edites, nunca commit, nunca push. Sigue `work/TOKEN-PROTOCOL.md` (regla 3). Máximo 20 minutos.
**Hallazgos:** `work/out/RS/report.md`
**Lee:** `docs/superpowers/specs/2026-11-21-activa-gye-fases-backend-design.md`, `docs/superpowers/plans/2026-11-21-activa-gye-backend-fases.md`, `docs/superpowers/plans/2026-11-21-db-contrato.md`, `src/data/types.ts`, los reportes `work/out/*/report.md` y `git log --oneline -60`.
**Alcance:** Migraciones 2–5, `supabase/tests/`, `src/data/supabase/*`. ¿Cumple `docs/superpowers/plans/2026-11-21-db-contrato.md`? ¿RLS correcta?
**Mide, no confíes en los reportes.** Gates: `npm run -s lint`, `npm run -s build`, `npx vitest run`, `npx supabase test db`, `npx playwright test --reporter=line` (la base local ya está lista con la semilla; NO hagas `db reset`, `start` ni `stop`).
**Intenta romper:**
- Como paciente A (supabase-js o SQL con `set local role authenticated` + claims), intenta leer ficha, foto, calendario, seguimientos, facturas y avisos del paciente B.
- Como nutricionista X, intenta leer/escribir datos de un paciente atendido por Y; aceptar sin suscripción; marcar pagada su propia factura de suscripción.
- Con cada fase apagada, intenta usar sus tablas/RPC directamente (saltándote la UI).
- Registro con cupo lleno (directo a `auth.signUp`).
- Reseña a un nutricionista que no te atendió.
- ¿`anon` puede leer algo privado? ¿Alguna función `security definer` sin chequeo de rol?
**Veredicto:** la línea `## Verdict: **SHIP**` o `## Verdict: **DO NOT SHIP**` (inglés, exacto). DO NOT SHIP solo por: un usuario ve datos/fotos de otro; una fase apagada se puede usar; pago que se puede marcar pagado por quien no debe; botón sin acción; pantalla sin salida; crash; gate rojo; texto falso visible. Luego `HOTFIX NOW` / `BLOCKING` (archivo:línea + cómo reproducir + arreglo sugerido) / `non-blocking`. A cada BLOCKING ponle área: `[sql]`, `[datos]`, `[paciente]`, `[nutri]`, `[admin]`, `[fase3]`, `[e2e]`.
**Última línea:** `NEXT: el orquestador lee RS.`

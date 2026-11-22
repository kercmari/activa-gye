# RTb — REVISOR (opus) — Recomprobación: seguridad y datos
**Reglas:** solo revisar: nunca edites, nunca commit, nunca push. Sigue `work/TOKEN-PROTOCOL.md` (regla 3). Máximo 20 minutos.
**Hallazgos:** `work/out/RTb/report.md`
**Lee:** `docs/superpowers/specs/2026-11-21-semana-gratis-design.md`, `docs/superpowers/plans/2026-11-21-db-contrato-semana.md`, `src/data/types.ts` (sección SEMANA GRATIS), los reportes `work/out/*/report.md` de esta ronda (S5 S6 D4 U7a U7b U7c U7d U8a U8b U8c EG) y `git log --oneline -40`. Referencia visual: `work/ref-base-vital/`.
**Alcance:** Solo verifica que los hallazgos `[sql]` `[datos]` de `work/out/RT/report.md` y `work/out/RU/report.md` estén arreglados (con test) y sin regresiones. Lee `work/out/XT/report.md`.
**Mide, no confíes en los reportes.** Gates: `npm run -s lint`, `npm run -s build`, `npx vitest run`, `npx supabase test db`, `npx playwright test --reporter=line` (la base local ya está lista con la semilla; NO hagas `db reset`, `start` ni `stop`). Cuentas: `docs/entrega/CUENTAS-DE-PRUEBA.md`.
**Intenta romper:**
- Reproduce cada hallazgo anterior.
- Gates completos.
**Veredicto:** la línea `## Verdict: **SHIP**` o `## Verdict: **DO NOT SHIP**` (inglés, exacto). DO NOT SHIP solo por: un paciente ve ítems de un día cerrado o datos de otro; se usa la agenda pagada sin suscripción; alguien con condición de salud recibe plan automático; un plan borrador se presenta como firmado; pago marcable por quien no debe; botón sin acción; pantalla sin salida; crash; gate rojo; texto falso visible. Luego `HOTFIX NOW` / `BLOCKING` (archivo:línea + cómo reproducir + arreglo sugerido) / `non-blocking`. A cada BLOCKING ponle área: `[sql]`, `[datos]`, `[paciente]`, `[nutri]`, `[admin]`, `[guia]`, `[e2e]`.
**Última línea:** `NEXT: el orquestador lee RTb.`

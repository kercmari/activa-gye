# RNb — REVISOR (opus) — Recomprobación: navegación
**Reglas:** solo revisar: nunca edites, nunca commit, nunca push. Sigue `work/TOKEN-PROTOCOL.md` (regla 3). Máximo 20 minutos.
**Hallazgos:** `work/out/RNb/report.md`
**Lee:** `docs/superpowers/specs/2026-11-21-activa-gye-fases-backend-design.md`, `docs/superpowers/plans/2026-11-21-activa-gye-backend-fases.md`, `docs/superpowers/plans/2026-11-21-db-contrato.md`, `src/data/types.ts`, los reportes `work/out/*/report.md` y `git log --oneline -60`.
**Alcance:** Solo verifica que los hallazgos `[paciente]` `[nutri]` `[admin]` `[fase3]` `[e2e]` de RS/RN estén arreglados y sin regresiones. Lee `work/out/XN/report.md`.
**Mide, no confíes en los reportes.** Gates: `npm run -s lint`, `npm run -s build`, `npx vitest run`, `npx supabase test db`, `npx playwright test --reporter=line` (la base local ya está lista con la semilla; NO hagas `db reset`, `start` ni `stop`).
**Intenta romper:**
- Reproduce cada hallazgo anterior en el navegador.
- Recorrido de fases otra vez.
**Veredicto:** la línea `## Verdict: **SHIP**` o `## Verdict: **DO NOT SHIP**` (inglés, exacto). DO NOT SHIP solo por: un usuario ve datos/fotos de otro; una fase apagada se puede usar; pago que se puede marcar pagado por quien no debe; botón sin acción; pantalla sin salida; crash; gate rojo; texto falso visible. Luego `HOTFIX NOW` / `BLOCKING` (archivo:línea + cómo reproducir + arreglo sugerido) / `non-blocking`. A cada BLOCKING ponle área: `[sql]`, `[datos]`, `[paciente]`, `[nutri]`, `[admin]`, `[fase3]`, `[e2e]`.
**Última línea:** `NEXT: el orquestador lee RNb.`

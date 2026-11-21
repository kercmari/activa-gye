# RN — REVISOR (opus) — Navegación real y entrega (navegador)
**Reglas:** solo revisar: nunca edites, nunca commit, nunca push. Sigue `work/TOKEN-PROTOCOL.md` (regla 3). Máximo 20 minutos.
**Hallazgos:** `work/out/RN/report.md`
**Lee:** `docs/superpowers/specs/2026-11-21-activa-gye-fases-backend-design.md`, `docs/superpowers/plans/2026-11-21-activa-gye-backend-fases.md`, `docs/superpowers/plans/2026-11-21-db-contrato.md`, `src/data/types.ts`, los reportes `work/out/*/report.md` y `git log --oneline -60`.
**Alcance:** Toda la app en el navegador real a 360 y 1280 px con la base local, entrando con las 3 cuentas. Lee `docs/entrega/PRUEBA-DE-BOTONES.md` y `FASES.md`.
**Mide, no confíes en los reportes.** Gates: `npm run -s lint`, `npm run -s build`, `npx vitest run`, `npx supabase test db`, `npx playwright test --reporter=line` (la base local ya está lista con la semilla; NO hagas `db reset`, `start` ni `stop`).
**Intenta romper:**
- Recorre fase 1 → enciende fase 2 → fase 3 desde Admin → Fases: ¿todo lo apagado muestra «Próximamente» y lo encendido funciona?
- Cada botón nuevo: ¿hace algo y tiene regreso? ¿estados de cargando/vacío/error?
- El buscador, la ficha de lugar y «Cómo llegar» siguen funcionando (observación 1 del profesor) y la cuenta guarda datos de verdad (observación 2).
- ¿Queda texto «En construcción», «Pending» o datos inventados visibles?
**Veredicto:** la línea `## Verdict: **SHIP**` o `## Verdict: **DO NOT SHIP**` (inglés, exacto). DO NOT SHIP solo por: un usuario ve datos/fotos de otro; una fase apagada se puede usar; pago que se puede marcar pagado por quien no debe; botón sin acción; pantalla sin salida; crash; gate rojo; texto falso visible. Luego `HOTFIX NOW` / `BLOCKING` (archivo:línea + cómo reproducir + arreglo sugerido) / `non-blocking`. A cada BLOCKING ponle área: `[sql]`, `[datos]`, `[paciente]`, `[nutri]`, `[admin]`, `[fase3]`, `[e2e]`.
**Última línea:** `NEXT: el orquestador lee RN.`

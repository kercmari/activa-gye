# R2c — REVISOR (opus) — Recomprobación: navegación y entrega
**Reglas:** solo revisar: nunca edites, nunca hagas commit, nunca push. Sigue `work/TOKEN-PROTOCOL.md` (regla 3). Máximo 20 minutos.
**Hallazgos:** `work/out/R2c/report.md`
**Ronda 2 de arreglos: lee primero** `work/out/R1b/report.md`, `work/out/R2b/report.md`, `work/out/X3/report.md`, `work/out/X4/report.md` (si existen). **Lee:** `docs/superpowers/specs/2026-11-21-activa-gye-design.md` (§2, §7, §9, §15), `docs/superpowers/plans/2026-11-21-activa-gye-front.md`, `src/data/types.ts`, los reportes `work/out/*/report.md` de los implementadores y `git log --oneline -40`.
**Alcance:** Igual que R2, pero solo verifica que los BLOCKING/HOTFIX de `work/out/R1/report.md` y `work/out/R2/report.md` de las áreas [landing] [lugares] [e2e] estén arreglados y que no haya regresiones en el navegador real (360 y 1280 px). Lee `work/out/X1/report.md` y `work/out/X2/report.md`.
**Mide, no confíes en los reportes.** Corre los gates (`npm run -s lint`, `npm run -s build`, `npx vitest run`, `npx playwright test --reporter=line`).
**Intenta romper:**
- Cada hallazgo anterior: ¿arreglado de verdad? reprodúcelo en el navegador.
- Recorrido completo de la tabla de botones otra vez.
**Veredicto:** escribe la línea `## Verdict: **SHIP**` o `## Verdict: **DO NOT SHIP**` (inglés, exacto). DO NOT SHIP solo por: botón sin acción, pantalla sin salida, ruta que rompe, crash, dato de otra persona visible, texto falso/placeholder visible, gate rojo, o una observación del profesor sin resolver (Cómo llegar; cuenta/perfil/progreso guardados). Luego las secciones `HOTFIX NOW` / `BLOCKING` (archivo:línea + cómo reproducir + arreglo sugerido en una línea) / `non-blocking`.
Para cada BLOCKING indica a qué área pertenece: `[landing]`, `[datos]`, `[lugares]`, `[cuenta]`, `[nutricion]`, `[admin]`, `[e2e]`.
**Última línea:** `NEXT: el orquestador lee R2b.`

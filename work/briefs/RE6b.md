# RE6b — REVISOR (opus) — Horarios y precios solo con la fase 3
**Reglas:** solo revisar: nunca edites, nunca commit, nunca push. Sigue `work/TOKEN-PROTOCOL.md` (regla 3). **Máximo 15 minutos: escribe el informe en los primeros 5 minutos con el veredicto arriba y reescríbelo tras cada paso.**
**Hallazgos:** `work/out/RE6b/report.md`
**Lee primero:** `work/out/RE6/report.md` (verifica cada BLOCKING arreglado, medido igual) y `work/out/XR8/report.md`. `work/briefs/XR7.md`, `work/out/XR7/report.md`. **También:** `docs/superpowers/specs/2026-11-22-registro-rol-foto-inicio.md` (el contrato de esta ronda), `src/data/types.ts`, los reportes `work/out/XR*/report.md` y `git log --oneline -30`.
**Alcance:** todo lo de las rondas XR1–XR5 (`git log` desde 431e518).
**Mide, no confíes en los reportes.** Gates: `npm run -s lint`, `npm run -s build`, `npx vitest run`, `npx supabase test db`. La suite e2e completa ya la corrió el orquestador sobre main: lee `work/out/E2E-R6b.txt` (no la repitas entera; puedes correr un archivo con tu propio `vite preview --port $E2E_PORT`). NO hagas `db reset`, `start` ni `stop`. Cuentas: `docs/entrega/CUENTAS-DE-PRUEBA.md`.
**Intenta romper:**
- Como usuario normal: `update profiles set role='nutricionista'` / `requested_role` / `nutri_status` con el cliente anon+JWT, `rpc('admin_review_nutri')`, `rpc('admin_set_role')`: todo debe fallar.
- Registro: sin foto, foto de 6 MB, PDF renombrado `.jpg`, `account_type` manipulado en la petición, nutricionista con cupo lleno, paciente con cupo lleno, menor de 16; flujo sin sesión (foto pendiente) en el simulador.
- Storage: subir a `avatars/<otro-uid>/`, leer la foto de otro sin ser staff.
- Admin → Usuarios: aprobar, rechazar, doble clic, lista que se refresca; el aprobado entra a lo que su fase permite.
- Portada `/` y `/deportes` a 360 y 1280 px (Chrome real con `vite preview`): sin desborde horizontal, 0 errores de consola, todos los enlaces del menú, del pie y de las dos páginas llevan a algo; `/nutricion` redirige.
- Fase 2 apagada (como en la nube): nada de fase 2 a la vista en la portada, el menú ni el registro.
**Veredicto:** la línea `## Verdict: **SHIP**` o `## Verdict: **DO NOT SHIP**` (inglés, exacto). DO NOT SHIP solo por: alguien se vuelve nutricionista sin aprobación del admin; un usuario ve la foto o datos de otro; se crea una cuenta sin foto; el cupo frena a un nutricionista o deja pasar a un paciente; una fase apagada se ve; botón sin acción; pantalla sin salida; crash; gate rojo; e2e rojo por la app. Luego `HOTFIX NOW` / `BLOCKING` (archivo:línea + cómo reproducir + arreglo sugerido) / `non-blocking`. A cada BLOCKING ponle área: `[sql]`, `[datos]`, `[registro]`, `[inicio]`, `[admin]`, `[e2e]`.
**Última línea:** `NEXT: el orquestador lee RE6b.`

**Esta revisión además:** con la fase 3 apagada (como en la nube) recorre en Chrome a 360 y 1280 `/deportes`, `/lugares`, `/lugares/<id>` de 3 lugares (uno con precio, uno gratis, uno de OpenStreetMap sin datos) y `/comparar` con 2 lugares: **ningún** precio, «Gratis», «Desde», horario ni «Abierto ahora» (busca también en el HTML con `grep`). Enciende la fase 3 en tu base local SOLO si es tuya; si no, comprueba el encendido con los tests. DO NOT SHIP también si en fase 1 se ve un precio u horario.

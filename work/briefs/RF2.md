# RF2 — REVISOR (opus) — Front: nutricionista, admin y cuenta
**Reglas:** solo revisar: nunca edites código, nunca commit, nunca push, nunca la nube. Sigue `work/TOKEN-PROTOCOL.md` (regla 3). **Máximo 18 minutos.**
**Lee primero:** `work/ref/CHECKLIST-FRONT.md` (la vara de medir) y `README.md` (qué hace cada fase). Contexto reciente: `git log --oneline -25`.
**Pantallas (todas, a 360 y 1280 px):**
- Como admin: `/admin` y cada tarjeta: Usuarios (con el bloque de solicitudes de nutricionista), Fases, Lugares, `/admin/lugar/<uno>`, Datos de lugares, Plantillas, `/admin/plantillas/<una>`, Guía, Pagos, Mensajes.
- Como nutricionista: tablero, solicitudes, `/nutri/pacientes/<uno>`, suscripción.
- Encabezado con sesión (campana, avatar, menú) para admin y nutricionista a 360 px.
- Formularios del staff: editar lugar, plantilla (criterios e ítems), guía, fases: etiquetas, errores, doble envío, aviso de cambios sin guardar.
**Si una pantalla del staff no se ve con las fases actuales de la base, anótala en «No revisado» (no cambies fases).**
**Navegador:** levanta TU preview: `npm run -s build && (npx vite preview --port $E2E_PORT --strictPort --host 127.0.0.1 > /dev/null 2>&1 &)`. Recorre las pantallas con un script de Playwright tuyo en `work/out/RF2/recorrido.mjs` (usa `import { chromium } from '@playwright/test'`), a 360×800 y 1280×800, con sesión según la pantalla (cuentas en `docs/entrega/CUENTAS-DE-PRUEBA.md`). Guarda capturas en `work/out/RF2/capturas/<pantalla>-<ancho>.png`, mide `scrollWidth`, tamaños de lo clicable, `font-size` de los campos y errores de consola. **Mira las capturas** (Read de la imagen): lo visual cuenta tanto como lo medido. Mata tu preview al terminar (por PID, nunca `pkill -f`).
**Base local:** solo lectura. NO cambies `app_settings` ni hagas `db reset`/`start`/`stop` (otro revisor trabaja a la vez). Si necesitas datos, crea los tuyos con correos `@revision.test`.
**Informe** `work/out/RF2/report.md`, escrito en los primeros 8 minutos y reescrito tras cada tanda de pantallas:
- Arriba `## Verdict: **SHIP**` o `## Verdict: **DO NOT SHIP**` (inglés, exacto). DO NOT SHIP si hay al menos un hallazgo A.
- Lista numerada `S1`, `S2`… Cada hallazgo: prioridad **A** (rompe uso o se ve mal en la entrega: desborde, botón tapado o inalcanzable, texto cortado, campo sin etiqueta, error invisible, contraste ilegible, pantalla sin salida, consola con error, algo de fase apagada visible) o **B** (pulido), área `[publico]` `[paciente]` `[cuenta]` `[nutri]` `[admin]`, `archivo:línea`, ancho donde pasa, captura, y arreglo sugerido concreto (clases Tailwind o cambio exacto).
- Sección «Bien» con lo que revisaste y está correcto (para no revisarlo de nuevo) y «No revisado».
**Última línea:** `NEXT: el orquestador lee RF2.`

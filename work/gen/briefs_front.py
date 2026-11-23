"""Ronda 6 (23/11): revisión del front con la lista work/ref/CHECKLIST-FRONT.md, arreglos y re-revisión.
Uso: python3 -I work/gen/briefs_front.py"""
import importlib.util
from pathlib import Path
spec = importlib.util.spec_from_file_location('b4', Path(__file__).with_name('briefs_semana4.py'))
b4 = importlib.util.module_from_spec(spec); spec.loader.exec_module(b4)
b1 = b4.b1
OUT = b1.OUT
LISTA = 'work/ref/CHECKLIST-FRONT.md'

NAV = """**Navegador:** levanta TU preview: `npm run -s build && (npx vite preview --port $E2E_PORT --strictPort --host 127.0.0.1 > /dev/null 2>&1 &)`. Recorre las pantallas con un script de Playwright tuyo en `work/out/{name}/recorrido.mjs` (usa `import {{ chromium }} from '@playwright/test'`), a 360×800 y 1280×800, con sesión según la pantalla (cuentas en `docs/entrega/CUENTAS-DE-PRUEBA.md`). Guarda capturas en `work/out/{name}/capturas/<pantalla>-<ancho>.png`, mide `scrollWidth`, tamaños de lo clicable, `font-size` de los campos y errores de consola. **Mira las capturas** (Read de la imagen): lo visual cuenta tanto como lo medido. Mata tu preview al terminar (por PID, nunca `pkill -f`).
**Base local:** solo lectura. NO cambies `app_settings` ni hagas `db reset`/`start`/`stop` (otro revisor trabaja a la vez). Si necesitas datos, crea los tuyos con correos `@revision.test`."""

FORMATO = """**Informe** `work/out/{name}/report.md`, escrito en los primeros 8 minutos y reescrito tras cada tanda de pantallas:
- Arriba `## Verdict: **SHIP**` o `## Verdict: **DO NOT SHIP**` (inglés, exacto). DO NOT SHIP si hay al menos un hallazgo A.
- Lista numerada `{pref}1`, `{pref}2`… Cada hallazgo: prioridad **A** (rompe uso o se ve mal en la entrega: desborde, botón tapado o inalcanzable, texto cortado, campo sin etiqueta, error invisible, contraste ilegible, pantalla sin salida, consola con error, algo de fase apagada visible) o **B** (pulido), área `[publico]` `[paciente]` `[cuenta]` `[nutri]` `[admin]`, `archivo:línea`, ancho donde pasa, captura, y arreglo sugerido concreto (clases Tailwind o cambio exacto).
- Sección «Bien» con lo que revisaste y está correcto (para no revisarlo de nuevo) y «No revisado».
**Última línea:** `NEXT: el orquestador lee {name}.`"""


def revisor(name, pref, titulo, pantallas, extra=''):
    text = f"""# {name} — REVISOR (opus) — Front: {titulo}
**Reglas:** solo revisar: nunca edites código, nunca commit, nunca push, nunca la nube. Sigue `work/TOKEN-PROTOCOL.md` (regla 3). **Máximo 18 minutos.**
**Lee primero:** `{LISTA}` (la vara de medir) y `README.md` (qué hace cada fase). Contexto reciente: `git log --oneline -25`.
**Pantallas (todas, a 360 y 1280 px):**
{pantallas}
{extra}
{NAV.format(name=name)}
{FORMATO.format(name=name, pref=pref)}
"""
    (OUT / f'{name}.md').write_text(text)


revisor('RF1', 'P', 'público, registro y paciente', """- Sin sesión: `/` (portada Nutrición), `/deportes`, `/lugares` (buscador con filtros), `/lugar/<uno>`, `/deporte/<uno>`, `/comparar`, `/guia`, `/conocenos`, `/contacto`, `/privacidad`, `/ingresar`, `/registro` (paciente y `?tipo=nutricionista`; prueba errores: vacío, correo malo, sin foto), `/recuperar`, una ruta inexistente.
- Encabezado, menú móvil, pie y círculo de cuenta en todas.
- Como paciente (`semana@activagye.test` u otro de las cuentas): `/perfil`, `/perfil/editar` (foto), `/mi-plan/hoy`, `/mi-plan/agenda`, `/mi-plan/progreso`, `/mi-plan/suscripcion`, `/mi-panel` y sus pestañas, `/notificaciones`.""")

revisor('RF2', 'S', 'nutricionista, admin y cuenta', """- Como admin: `/admin` y cada tarjeta: Usuarios (con el bloque de solicitudes de nutricionista), Fases, Lugares, `/admin/lugar/<uno>`, Datos de lugares, Plantillas, `/admin/plantillas/<una>`, Guía, Pagos, Mensajes.
- Como nutricionista: tablero, solicitudes, `/nutri/pacientes/<uno>`, suscripción.
- Encabezado con sesión (campana, avatar, menú) para admin y nutricionista a 360 px.
- Formularios del staff: editar lugar, plantilla (criterios e ítems), guía, fases: etiquetas, errores, doble envío, aviso de cambios sin guardar.""",
        '**Si una pantalla del staff no se ve con las fases actuales de la base, anótala en «No revisado» (no cambies fases).**')

b1.impl('XF1', 'Arreglos del front: público, registro y paciente',
 '`src/pages/*.tsx` de la raíz de `src/pages/` (portada, deportes, lugares, lugar, deporte, comparar, guía, conócenos, contacto, privacidad, ingresar, registro, recuperar, perfil, perfil editar, notificaciones, no encontrada), `src/pages/plan/*`, `src/pages/panel/*`, `src/components/**` EXCEPTO `src/components/admin/**` y `src/components/nutri/**`, `src/index.css`, y sus `*.test.tsx`. NO toques `supabase/`, `src/data/`, ni `e2e/`.',
 f"""Lee `{LISTA}` y los informes `work/out/RF1/report.md` y `work/out/RF2/report.md`.
- Arregla TODOS los hallazgos **A** que caen en tus archivos, de los dos informes (un componente compartido como el encabezado es tuyo aunque lo reporte RF2). Luego los **B** baratos (≤ 10 min en total) de tus archivos.
- Cambia lo mínimo: clases Tailwind, etiquetas, `aria-label`, `min-h-11`/`min-w-11` para 44 px, `text-base` en campos, `truncate`/`min-w-0`, `overflow-x-auto` en tablas, estados vacíos. No rediseñes pantallas ni cambies textos aprobados salvo que el hallazgo lo pida.
- Lo que no es tuyo (admin/nutri, base, e2e): no lo toques; anótalo en «Pedidos al orquestador».
- En el reporte, una tabla: hallazgo (P1, S3…) → arreglado / no tuyo / no reproducido, con archivo:línea.""",
 """- Los tests existentes siguen verdes; si un texto o rol cambió por un hallazgo, actualiza su test sin debilitarlo.
- Un test nuevo por cada cambio de comportamiento (por ejemplo, el foco al primer error o un `aria-label`). Los cambios puramente de clases no necesitan test.""",
 'XF2 y la re-revisión RF3')

b1.impl('XF2', 'Arreglos del front: nutricionista y admin; e2e rojas',
 '`src/pages/admin/*`, `src/pages/nutri/*`, `src/components/admin/**` y `src/components/nutri/**` si existen, sus `*.test.tsx`, y `e2e/*.spec.ts` + `e2e/helpers.ts`. NO toques `supabase/`, `src/data/`, ni otros componentes compartidos (son de XF1).',
 f"""Lee `{LISTA}`, `work/out/RF2/report.md`, `work/out/RF1/report.md` (por si algo cae en tus archivos) y la suite e2e más reciente (`ls -t work/out/E2E-*.txt | head -1`).
- Arregla TODOS los hallazgos **A** que caen en tus archivos; luego los **B** baratos (≤ 10 min en total). Cambia lo mínimo (mismas pautas: 44 px, `text-base` en campos, `overflow-x-auto` en tablas, etiquetas, errores junto al campo, estados vacíos). Lo que no es tuyo → «Pedidos al orquestador».
- **E2E rojas en la suite más reciente** (en `E2E-R5b.txt` eran `navegacion.spec.ts` «botones del Panel … actividades lleva al panel» y `fase1.spec.ts` «admin pone cupo …»; mira si siguen y si hay otras). Averigua la causa. Si la prueba quedó vieja tras mover el inicio a `/deportes` (ronda 5), actualiza la prueba sin debilitarla. Si choca con otras pruebas por la base compartida (cupo de 5 lleno por otro worker), hazla independiente: `test.describe.configure({{ mode: 'serial' }})` en ese archivo, datos propios con correo único, o restaurar el cupo en `afterEach`. Si el fallo es de la app y cae fuera de tus archivos, anótalo.
- Verifica SOLO tus specs con TU preview (`npm run -s build && (npx vite preview --port $E2E_PORT --strictPort --host 127.0.0.1 > /dev/null 2>&1 &)` y `E2E_PORT=$E2E_PORT npx playwright test e2e/navegacion.spec.ts e2e/fase1.spec.ts --reporter=line`); mata tu preview por PID. No corras la suite completa ni `db reset`.
- En el reporte, una tabla: hallazgo (S1, P4…) → arreglado / no tuyo / no reproducido, con archivo:línea.""",
 """- Los tests existentes siguen verdes; un test nuevo por cada cambio de comportamiento.
- `navegacion.spec.ts` y `fase1.spec.ts` verdes con tu preview (pega el resumen en el reporte).""",
 'la re-revisión RF3')

RE_TXT = """# {name} — REVISOR (opus) — Front: ¿quedó arreglado?
**Reglas:** solo revisar: nunca edites código, nunca commit, nunca push, nunca la nube. Sigue `work/TOKEN-PROTOCOL.md` (regla 3). **Máximo 15 minutos; informe escrito en los primeros 5 y reescrito tras cada paso.**
**Lee:** `{lista}`, {reportes}, `work/out/gate-*.txt` y `work/out/{e2e}.txt` (suite e2e completa ya medida por el orquestador sobre este main; no la repitas).
**Alcance:** cada hallazgo **A** de {fuentes}: ¿está arreglado de verdad en el navegador? Mira el diff (`git log -p --since=6.hours -- src e2e`). Y que los arreglos no rompieron nada a la vista: pasada rápida a 360 px de portada, registro, `/mi-plan/hoy`, `/admin`, `/admin/usuarios`, `/admin/pagos`.
""" + NAV + """
**Veredicto:** `## Verdict: **SHIP**` o `## Verdict: **DO NOT SHIP**` (inglés, exacto). DO NOT SHIP solo si queda algún hallazgo A sin arreglar, un arreglo rompió otra pantalla, un gate está rojo o la e2e está roja por la app. Luego una tabla hallazgo → arreglado / sigue (con archivo:línea, captura y arreglo sugerido) y `BLOCKING` nuevos con área `[publico]` `[paciente]` `[cuenta]` `[nutri]` `[admin]` `[e2e]`.
**Última línea:** `NEXT: el orquestador lee {name}.`
"""
(OUT / 'RF3.md').write_text(RE_TXT.format(name='RF3', lista=LISTA, e2e='E2E-F1',
    reportes='`work/out/RF1/report.md`, `work/out/RF2/report.md`, `work/out/XF1/report.md`, `work/out/XF2/report.md`',
    fuentes='RF1 y RF2'))

b1.impl('XF3', 'Lo que la re-revisión RF3 devolvió',
 'Los archivos que nombre `work/out/RF3/report.md` en sus hallazgos que siguen o BLOCKING, con sus `*.test.tsx` y `e2e/*`. NO toques `supabase/` ni `src/data/` (si hace falta, «Pedidos al orquestador»).',
 f"""Lee `{LISTA}` y `work/out/RF3/report.md`. Arregla cada hallazgo marcado «sigue» y cada BLOCKING, con el cambio mínimo. Si tocas e2e, verifica solo esas specs con TU preview en `$E2E_PORT` y mátalo por PID. En el reporte, una tabla hallazgo → arreglado con archivo:línea.""",
 """- Los tests existentes siguen verdes; un test nuevo por cada cambio de comportamiento.""",
 'la re-revisión RF4')

(OUT / 'RF4.md').write_text(RE_TXT.format(name='RF4', lista=LISTA, e2e='E2E-F2',
    reportes='`work/out/RF3/report.md`, `work/out/XF3/report.md`', fuentes='RF3 (los que seguían y los BLOCKING)').replace(
    '# RF4 — REVISOR (opus) — Front: ¿quedó arreglado?', '# RF4 — REVISOR (opus) — Front: segunda re-revisión'))

IDS = ['RF1', 'RF2', 'XF1', 'XF2', 'RF3', 'XF3', 'RF4']
print('ok front', [i for i in IDS if (OUT / f'{i}.md').exists()])

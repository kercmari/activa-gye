"""Ronda 2 de la semana gratis: arreglos de los hallazgos conocidos + revisiones cortas (22/11/2026).
Por qué existe: en la ronda 1 RT, RU y RUb agotaron sus 20 min corriendo la suite e2e completa (con choques de puerto);
RTb dio DO NOT SHIP. Ahora el orquestador corre la e2e UNA vez y deja el resultado en work/out/E2E-R2.txt;
los revisores NO corren la suite completa y cada uno tiene un alcance chico.
"""
import importlib.util
from pathlib import Path

spec = importlib.util.spec_from_file_location('b1', Path(__file__).with_name('briefs_semana.py'))
b1 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(b1)  # regenera los briefs de la ronda 1 (idénticos) y expone helpers
OUT, COMMON, GATES, SQL_RULES, DESIGN, DB, REF = b1.OUT, b1.COMMON, b1.GATES, b1.SQL_RULES, b1.DESIGN, b1.DB, b1.REF
impl = b1.impl

H = 'work/out/HALLAZGOS-R2.md'
E2E = 'work/out/E2E-R2.txt'

impl('XT2', 'Renovar una suscripción de paciente vencida',
     '`supabase/migrations/20261122000008_renovar_suscripcion.sql` (NUEVA) y `supabase/tests/07_renovar_suscripcion.sql` (NUEVO). Nada más.',
     f"""Lee `{H}`, hallazgos **H1** y **H6**. Nunca edites la migración 6.
- **H1:** en una migración nueva redefine `choose_patient_plan` (copia el cuerpo actual de la migración 6 y agrega, antes de cualquier insert, `update public.patient_subscriptions set status = 'vencida' where patient_id = <el paciente> and status = 'activa' and current_period_end <= now();`). Si el `check` de `patient_subscriptions.status` no admite `'vencida'`, amplíalo en la misma migración. Redefine `my_patient_subscription()` para que devuelva `'vencida'` como `status` cuando `status = 'activa'` y `current_period_end <= now()` (mismas columnas, mismo orden, mismo grant).
- **H6:** redefine `assign_trial` (copia el cuerpo de la migración 6) para que además responda `REQUIERE_NUTRICIONISTA` cuando `patient_intakes.health_conditions` (texto libre heredado) tenga texto no vacío tras `trim`, aunque `conditions` esté vacío.""",
     """- pgTAP `07_renovar_suscripcion.sql`: (a) paciente con suscripción `activa` y `current_period_end = now() - interval '1 day'` → `my_patient_subscription()` devuelve `vencida`; (b) ese paciente llama `choose_patient_plan` sin error y queda una suscripción `pendiente` + factura `suscripcion_paciente` pendiente; (c) una suscripción `activa` vigente sigue devolviendo `activa`; (d) `assign_trial` con `health_conditions = 'hipertensión'` y `conditions = '{}'` → `REQUIERE_NUTRICIONISTA`; (e) con `health_conditions` vacío o nulo y sin condiciones sigue asignando.
- `npx supabase test db`: los 6 archivos anteriores siguen verdes.""",
     'la recomprobación R2', SQL_RULES)

impl('XU2a', 'Pantalla de suscripción: fecha y suscripción vencida',
     '`src/pages/plan/SuscribirmePage.tsx`, su test (`*.test.tsx` junto a la página o en `src/pages/plan/`), y `src/components/profile/labels.ts` SOLO para agregar una función nueva (no cambies las existentes). NO toques `supabase/`.',
     f"""Lee `{H}`, hallazgos **H2** y **H3**. No hagas `db reset`.
- **H3 «Invalid Date»:** `formatDateLong` espera `YYYY-MM-DD`, pero `current_period_end` (y otros `timestamptz`) llega como `2026-12-21T15:00:00+00:00`. Agrega en `labels.ts` `formatDateTimeLong(iso)` que acepte timestamp completo (usa `new Date(iso)` y zona `America/Guayaquil`) y úsala en toda fecha de tipo timestamp de esta página. Busca con `grep -rn "formatDateLong(.*\\(period_end\\|_at\\)" src/` otros usos con timestamp y corrígelos también si están en `src/pages/plan/` (anota el resto en «Pedidos al orquestador»).
- **H2 suscripción vencida:** trata como activa SOLO si `status === 'activa'` y `current_period_end` es futuro. Con `status === 'vencida'` (lo devuelve la base tras XT2) o `activa` con fecha pasada: aviso «Tu suscripción venció el <fecha>» + la lista de planes con «Suscribirme» (el mismo componente de planes que ya usa la página para quien no tiene suscripción). Agrega `'vencida'` al tipo de estado si el tipo no lo admite (en `src/data/types.ts` SOLO ampliar esa unión; no toques nada más del contrato).""",
     """- Vitest: suscripción activa vigente → «activa hasta el …» con fecha legible (no «Invalid Date»); `vencida` → aviso de vencida + botón «Suscribirme» que llama `repo.choosePatientPlan`; `activa` con fecha pasada → mismo aviso de vencida; prueba de `formatDateTimeLong` con `'2026-12-21T15:00:00+00:00'`.""",
     'la recomprobación R2')

impl('XU2b', 'Desbordes a 360 px y e2e rojas',
     '`src/components/Header.tsx` (o el componente del encabezado con sesión), `src/pages/admin/AdminPagosPage.tsx` y los componentes que use para la tabla, sus tests, y los archivos `e2e/*.spec.ts` que fallen SOLO si la prueba está mal (no la app). NO toques `supabase/`, ni `src/pages/plan/SuscribirmePage.tsx`.',
     f"""Lee `{H}`, hallazgos **H4**, **H5** y **H7**, y `{E2E}` (resultado de la suite completa medido por el orquestador). No hagas `db reset`.
- **H4:** con sesión, a 360 px el encabezado desborda ~9 px (campana + avatar + menú). Que quepa sin scroll horizontal (achica gap/padding, oculta el nombre largo, `min-w-0` + `truncate`).
- **H5:** `/admin/pagos` a 360 px desborda ~392 px. La tabla va dentro de `overflow-x-auto` o se vuelve tarjetas en móvil; la página no debe tener scroll horizontal.
- **H7:** cada prueba roja de `{E2E}`: si el fallo es de la app, arréglalo en la app (dentro de tus archivos; si cae fuera, anótalo en «Pedidos al orquestador»); si es de la prueba (selector frágil, espera corta, dato de otra prueba), arregla la prueba sin debilitar lo que verifica.
- Para verificar: levanta TU preview en el puerto `$E2E_PORT` (`npm run -s build && npx vite preview --port $E2E_PORT --strictPort --host 127.0.0.1 &`) y corre SOLO las specs afectadas: `E2E_PORT=$E2E_PORT npx playwright test e2e/<archivo> --reporter=line`. Mata tu preview al terminar. **No** corras la suite completa.""",
     """- Vitest donde aplique. Para H4/H5 una prueba e2e chica (`e2e/desborde.spec.ts`, nuevo, tuyo) que a 360 px con sesión de admin abra `/` y `/admin/pagos` y verifique `document.documentElement.scrollWidth <= 360`.
- Las specs que estaban rojas en `E2E-R2.txt`, verdes (reporta cuáles).""",
     'la recomprobación R2')


def review2(name, title, scope, falsify):
    text = f"""# {name} — REVISOR (opus) — {title}
**Reglas:** solo revisar: nunca edites, nunca commit, nunca push. Sigue `work/TOKEN-PROTOCOL.md` (regla 3). **Máximo 15 minutos: escribe el informe a los 12 aunque no hayas terminado** (lo no revisado va en «no revisado»).
**Hallazgos:** `work/out/{name}/report.md`
**Lee:** `{H}` (hallazgos de la ronda 1), `work/out/XT2/report.md`, `work/out/XU2a/report.md`, `work/out/XU2b/report.md`, `work/out/E2E-R2-final.txt` (suite e2e completa ya medida por el orquestador sobre este mismo main) y `work/out/gate-*.txt`. Diseño: `{DESIGN}`; contrato BD: `{DB}`.
**Alcance (solo esto):** {scope}
**NO corras** `npx playwright test` completo, ni `db reset`/`start`/`stop`, ni lint/build/vitest (ya están medidos en `work/out/gate-*.txt`). Si necesitas navegador: `npm run -s build && npx vite preview --port $E2E_PORT --strictPort --host 127.0.0.1 &` (TU puerto) y como mucho UNA spec concreta o un script de Playwright corto; mata tu preview al terminar. Para SQL: `psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres"` con transacciones que terminan en `rollback`. Cuentas: `docs/entrega/CUENTAS-DE-PRUEBA.md`.
**Intenta romper:**
{falsify}
**Veredicto:** `## Verdict: **SHIP**` o `## Verdict: **DO NOT SHIP**` (inglés, exacto). DO NOT SHIP solo por: un paciente ve ítems de un día cerrado o datos de otro; agenda pagada sin suscripción; alguien con condición de salud recibe plan automático; borrador presentado como firmado; pago marcable por quien no debe; botón sin acción; pantalla sin salida; crash; gate o e2e rojo; texto falso visible. Luego `HOTFIX NOW` / `BLOCKING` (archivo:línea + cómo reproducir + arreglo sugerido, con área `[sql]` `[paciente]` `[nutri]` `[admin]` `[guia]` `[e2e]`) / `non-blocking` / `no revisado`.
**Última línea:** `NEXT: el orquestador lee {name}.`
"""
    (OUT / f'{name}.md').write_text(text)


review2('RT2', 'Base de datos tras los arreglos',
        'H1 y H6 arreglados con test (migración 8 y `07_*.sql`), y que la migración 8 no perdió nada de los cuerpos que redefine (compárala con la 6). Sondas de la ronda 1 que deben seguir pasando: ítems de días cerrados, datos de otro paciente, agenda pagada sin suscripción, factura de suscripción marcable solo por admin.',
        '- Reproduce H1 (suscripción vencida → `choose_patient_plan`) y H6.\n- Suscripción vencida: ¿`plan_days` sigue cerrado? ¿la renovación pagada vuelve a abrirlo y no crea una segunda solicitud de atención si ya hay una aceptada?')
review2('RU2a', 'Pantallas del paciente',
        'Como `semana@activagye.test` y como un paciente nuevo, a 360 y 1280 px: `/mi-plan/hoy`, `/mi-plan/agenda`, `/mi-plan/progreso`, `/mi-plan/suscripcion` (H2, H3) y `/guia`. Compara la Agenda con `' + REF + '`.',
        '- «Invalid Date» o fechas raras en cualquier pantalla del paciente.\n- Suscripción vencida (prepárala con psql en una transacción que NO hagas rollback solo si luego la deshaces a mano; mejor usa un paciente creado por ti) → aviso + «Suscribirme» funciona.\n- Botones sin acción, pantallas sin salida, barra inferior tapando contenido, scroll horizontal a 360 px.')
review2('RU2b', 'Pantallas del staff y lo que ya existía',
        'Como admin y nutricionista a 360 y 1280 px: encabezado con sesión (H4), `/admin/pagos` (H5), `/admin/plantillas`, `/admin/plantillas/:id`, `/admin/guia`, `/nutri/pacientes/:id` (bloque Semana gratis). Y que siga vivo: buscador de lugares, Mi panel, bolsa de solicitudes.',
        '- Scroll horizontal a 360 px en cualquier página del staff.\n- Editor de plantillas: guardar criterios e ítems, borrar con confirmación, errores visibles.\n- Las specs que XU2b dice haber arreglado: ¿arreglo real o prueba debilitada? (lee el diff con `git log -p`).')

IDS = ['XT2', 'XU2a', 'XU2b', 'RT2', 'RU2a', 'RU2b']
print('ok r2', [i for i in IDS if (OUT / f'{i}.md').exists()])

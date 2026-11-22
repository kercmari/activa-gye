"""Briefs de la semana gratis estilo Base Vital (haiku implementa, opus revisa). Uso: python3 -I work/gen/briefs_semana.py"""
from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / 'briefs'
OUT.mkdir(exist_ok=True)
DESIGN = 'docs/superpowers/specs/2026-11-21-semana-gratis-design.md'
DB = 'docs/superpowers/plans/2026-11-21-db-contrato-semana.md'
REF = 'work/ref-base-vital/'

COMMON = f"""**Proyecto:** Activa GYE, plataforma de **seguimiento nutricional** intermediaria (tipo Uber), sin IA. Al llenar su ficha, el paciente recibe **gratis 7 días** de comidas y rutinas sacados de **plantillas de nutricionista** guardadas en la base (elegidas por IMC, edad, género y objetivo). Los días **se abren uno a uno con el progreso diario** (chequeo + mitad de los ítems → el siguiente se abre mañana). Desde el día 8 hay que **suscribirse**. La interfaz copia el concepto de **Base Vital** (Hoy · Progreso · Agenda · Guía con barra inferior). Ya existe y NO se rompe: buscador de lugares, ficha, solicitudes, nutricionista, pagos manuales, reseñas, fases.
**Lee primero:** `work/TOKEN-PROTOCOL.md` (reglas y gates, obligatorio); `{DESIGN}` (todo); `{DB}` (nombres exactos de tablas y funciones: NO inventes otros); `src/data/types.ts`, sección «SEMANA GRATIS» y los métodos nuevos al final de `Repo` (el contrato: NO lo cambies).
**Referencia visual (solo lectura, NO se importa ni se copia la carpeta):** `{REF}` tiene las pantallas originales de Base Vital (React 18 + CSS propio). Tradúcelas a React 19 + Tailwind con los colores de Activa GYE; textos en español; sin voz, sin 3D, sin IA.
**Convenciones fijas:**
- Stack: React 19 + TypeScript + Vite + Tailwind v4 + `react-router` v8 (importa SIEMPRE desde `'react-router'`). Íconos `lucide-react`. **No hay recharts**: gráficos con SVG propio o `src/components/profile/WeightChart`. Tests: Vitest + Testing Library (jsdom, `src/test/setup.ts`), con `vi.mock` del repo.
- Datos: SOLO con `import {{ repo }} from '<ruta>/data'`. Sesión: `useAuth()` de `src/auth/AuthContext`. Fases: `usePhase(n)` de `src/auth/SettingsContext` y `src/components/PhaseGate.tsx`.
- UI reutilizable: `src/components/ui/` (`Button`, `LinkButton`, `BackButton`, `PageHeader`, `States` → `Loading`, `EmptyState`, `ErrorState`, `errorMessage`; `Field` → `TextField`, `SelectField`, `TextArea`; `Badge`), `src/components/profile/` (`ConfirmDialog`, `WeightChart`, `useAsync`), `src/components/admin/AdminShell.tsx`, `src/components/panel/PagosTab.tsx` (facturas y reporte de transferencia). Míralos antes de crear algo parecido.
- Estilo: el de las páginas existentes (`bg-navy-900`, `text-navy-900`, `bg-brand-orange`, `text-brand-orange`, `bg-surface`, tarjetas `rounded-[1.75rem] bg-white shadow-xl shadow-navy-900/5`, `.display`, `.eyebrow`, `mx-auto max-w-6xl px-4`). Bien a 360 px y a 1280 px.
- Cada carga: cargando (`role="status"`), vacío (mensaje + acción), error (mensaje + «Reintentar»). **Ningún botón sin acción ni pantalla sin salida.**
- Textos en español de Ecuador. Errores con `errorMessage(e)`; agrega a mano mensajes claros para `REQUIERE_NUTRICIONISTA`, `SIN_PLANTILLA`, `FALTA_FICHA`, `SIN_SUSCRIPCION` donde apliquen. Sin datos inventados presentados como reales: si la plantilla es `borrador`, muestra «Plan de muestra pendiente de revisión por una nutricionista».
- Marcadores (`Pending`) de tu tarea: reemplázalos por completo.
- **Commits sin la línea `Co-Authored-By`** (regla de la dueña). No cambies el autor.
"""

GATES = """**Tiempo:** máximo 20 minutos. Commit apenas algo funcione con gates verdes; luego sigue. Lo commiteado vale.
**Gates antes de cada commit:** `npm run -s lint` (0 errores), `npm run -s build` (exit 0), `npx vitest run` (verde). Reporta los números.
"""

SQL_RULES = f"""**Reglas SQL:**
- Solo tus archivos SQL (nombres exactos del contrato). Nunca edites migraciones anteriores.
- Sigue `{DB}` al pie de la letra. Si algo no cuadra, anótalo en «Pedidos al orquestador».
- **Tienes la base local para ti solo en esta ronda:** `npx supabase db reset` (migraciones + `supabase/seed.sql`) y `npx supabase test db`. NUNCA `supabase start/stop`, NUNCA `db push`, NUNCA `link`.
- pgTAP: `begin; select plan(n); … select * from finish(); rollback;`. Para actuar como usuario: crea usuarios con `insert into auth.users(id, email, raw_user_meta_data, …)` y luego `set local role authenticated; select set_config('request.jwt.claims', json_build_object('sub', '<uuid>', 'role', 'authenticated')::text, true);`. `reset role;` para preparar datos. Mira `supabase/tests/0*.sql` para copiar el patrón exacto.
- Gates: `db reset` sin errores + `test db` verde + lint/build/vitest.
"""


def impl(name, title, owns, body, tests, nxt, extra=''):
    fix = lambda t: t.replace('{{', '{').replace('}}', '}')
    owns, body, tests, extra = fix(owns), fix(body), fix(tests), fix(extra)
    text = f"""# {name} — IMPLEMENTADOR (haiku) — {title}
**Reporte:** `work/out/{name}/report.md` (qué hiciste, archivos, gates con números, «Pedidos al orquestador», pendientes).
**Commits:** empiezan con `{name}: `.
{COMMON}
{extra}
**Archivos que son tuyos (solo estos):** {owns}

## Qué construir
{body}

## Tests obligatorios
{tests}

{GATES}
**Última línea del reporte:** `NEXT: la cadena sigue con {nxt}.`
"""
    (OUT / f'{name}.md').write_text(text)


def review(name, title, scope, falsify):
    text = f"""# {name} — REVISOR (opus) — {title}
**Reglas:** solo revisar: nunca edites, nunca commit, nunca push. Sigue `work/TOKEN-PROTOCOL.md` (regla 3). Máximo 20 minutos.
**Hallazgos:** `work/out/{name}/report.md`
**Lee:** `{DESIGN}`, `{DB}`, `src/data/types.ts` (sección SEMANA GRATIS), los reportes `work/out/*/report.md` de esta ronda (S5 S6 D4 U7a U7b U7c U7d U8a U8b U8c EG) y `git log --oneline -40`. Referencia visual: `{REF}`.
**Alcance:** {scope}
**Mide, no confíes en los reportes.** Gates: `npm run -s lint`, `npm run -s build`, `npx vitest run`, `npx supabase test db`, `npx playwright test --reporter=line` (la base local ya está lista con la semilla; NO hagas `db reset`, `start` ni `stop`). Cuentas: `docs/entrega/CUENTAS-DE-PRUEBA.md`.
**Intenta romper:**
{falsify}
**Veredicto:** la línea `## Verdict: **SHIP**` o `## Verdict: **DO NOT SHIP**` (inglés, exacto). DO NOT SHIP solo por: un paciente ve ítems de un día cerrado o datos de otro; se usa la agenda pagada sin suscripción; alguien con condición de salud recibe plan automático; un plan borrador se presenta como firmado; pago marcable por quien no debe; botón sin acción; pantalla sin salida; crash; gate rojo; texto falso visible. Luego `HOTFIX NOW` / `BLOCKING` (archivo:línea + cómo reproducir + arreglo sugerido) / `non-blocking`. A cada BLOCKING ponle área: `[sql]`, `[datos]`, `[paciente]`, `[nutri]`, `[admin]`, `[guia]`, `[e2e]`.
**Última línea:** `NEXT: el orquestador lee {name}.`
"""
    (OUT / f'{name}.md').write_text(text)


# ================================================================== RONDA A
impl('S5', 'Migración 6: semana gratis, chequeo, suscripción del paciente y guía (esquema)',
     '`supabase/migrations/20261121000006_semana_gratis.sql`, `supabase/tests/05_semana_gratis.sql`; y SOLO las aserciones de `supabase/tests/02_*.sql` / `04_*.sql` que rompa la regla §6.8 del contrato.',
     f"""Implementa TODA la sección «Migración 6» de `{DB}` en orden: 6.1 → 6.9. Lee antes las migraciones 2–5 (`supabase/migrations/`) para reutilizar `is_staff`, `is_admin`, `is_my_patient`, `phase_on`, `notify`, `touch_updated_at`, y para **copiar el cuerpo actual** de `mark_invoice_paid` y `cancel_invoice` antes de ampliarlos (no pierdas nada de lo que hacían).
Grants exactos: los del contrato. Funciones internas (`trial_evaluate`, `trial_day_open`) revocadas a `public, anon, authenticated`.""",
     f'Los 10 casos de §6.10 de `{DB}` en `supabase/tests/05_semana_gratis.sql`, más todo `npx supabase test db` verde (01–05).',
     'S6 en la ronda B', SQL_RULES)

impl('D4', 'Capa Supabase de la semana gratis',
     '`src/data/supabase/trial.ts` + `src/data/supabase/trial.test.ts`; en `src/data/supabase/care.ts` SOLO el mapeo de `allergies`/`conditions` de la ficha (leer y guardar); en `src/data/supabase/plan.ts` SOLO que `listPlans` devuelva los de `audience = \'nutricionista\'`.',
     f"""Implementa en `trialPart` TODOS los métodos nuevos del `Repo` (sección «Semana gratis», «Suscripción del paciente», «Plantillas», «Guía»), con los nombres de RPC y tablas de `{DB}`:
- `getMyTrial` → rpc `my_trial` (sin argumento); `getPatientTrial(id)` → rpc `my_trial` con `p_user`; `startMyTrial` → rpc `assign_trial` y luego `my_trial`; `setTrialItemDone` → rpc `set_trial_item_done` (devuelve json). Convierte el json a `Trial` (números con `Number`, `at_time` 'HH:MM').
- `getTodayCheckin` → select en `daily_checkins` del usuario con `checkin_date = ` hoy en Guayaquil (calcula la fecha con `Intl.DateTimeFormat('en-CA', {{ timeZone: 'America/Guayaquil' }})`); `saveTodayCheckin` → rpc `save_checkin`; `listCheckins(patientId, days)` → select por `user_id` y fecha ≥ hoy − days, ascendente.
- `listPatientPlans` → `subscription_plans` activos con `audience = 'paciente'`; `getMyPatientSubscription` → rpc `my_patient_subscription` (primera fila o null); `choosePatientPlan` → rpc `choose_patient_plan`.
- Plantillas: CRUD directo sobre `plan_templates` y `plan_template_items` (RLS de staff). `items_count` con `select('*, plan_template_items(count)')`. `at_time` se guarda 'HH:MM' y se lee recortado a 5 caracteres.
- Guía: `listGuide` (publicadas, orden category, sort), `adminListGuide` (todas), `adminSaveGuideEntry` (upsert por id), `adminDeleteGuideEntry`.
- Errores con `toAppError`/`unwrap` de `src/data/supabase/errors.ts`. Si falta un código nuevo en la tabla de mensajes de `errors.ts` (`REQUIERE_NUTRICIONISTA`, `SIN_PLANTILLA`), agrégalo ahí (ese archivo también es tuyo para eso).""",
     '`trial.test.ts` con `vi.mock` del cliente supabase (mira `plan.test.ts` y `care.test.ts`): conversión del json de `my_trial` (día cerrado con items vacío), `startMyTrial` propaga `REQUIERE_NUTRICIONISTA`, `listPlans` filtra audience, `listCheckins` ordena ascendente, guardar plantilla y guía.',
     'la ronda B', extra='**Archivo extra tuyo:** `src/data/supabase/errors.ts` (solo para agregar mensajes de códigos nuevos).')

impl('U7a', 'Marco «Mi plan» con barra inferior + pantalla Hoy',
     '`src/components/plan/PlanShell.tsx`, `src/components/plan/BottomNav.tsx`, `src/components/plan/CheckinCard.tsx`, `src/components/plan/TrialItemRow.tsx`, `src/components/plan/useTrial.ts`, `src/pages/plan/HoyPage.tsx` y sus `*.test.tsx`.',
     f"""Referencias: `{REF}BottomNav.tsx`, `{REF}Home.tsx`, `{REF}CheckIn.tsx`.
1. **`PlanShell`** (ruta padre `/mi-plan`, ya en `src/App.tsx`): renderiza `<Outlet />` dentro del contenedor de la página y **`BottomNav`**: en celular barra fija abajo (Hoy · Progreso · Agenda · Guía, íconos lucide `Home`, `HeartPulse`, `CalendarDays`, `BookOpen`, activo en naranja); en ≥ 768 px pestañas arriba. Guía enlaza a `/guia` (pública). Deja espacio inferior para que la barra no tape contenido. Enlace «Volver a Mi panel» (`/mi-panel`).
2. **`useTrial()`**: hook que carga `repo.getMyTrial()` y expone `{{ trial, loading, error, reload, setItemDone }}` (`setItemDone` llama `repo.setTrialItemDone` y reemplaza el estado con lo que devuelve). Lo usan Hoy, Agenda y Progreso (otras tareas lo importan: exporta exactamente ese nombre y forma).
3. **`HoyPage`** (`/mi-plan/hoy`):
   - Sin trial: si no hay ficha (`repo.getMyIntake()` null) → tarjeta «Llena tu ficha para recibir tu semana gratis» con enlace a `/mi-panel?tab=ficha`; si hay ficha → botón «Generar mi semana gratis» (`repo.startMyTrial()`); error `REQUIERE_NUTRICIONISTA` → explicación + enlace a `/mi-panel?tab=nutricionista`.
   - Con trial: «Día N de 7» (current_day), nombre de la plantilla, «≈ X kcal · Porciones ×F», aviso de borrador; lista de ítems del día actual con hora, ícono por tipo (comida/rutina/hábito), detalle desplegable y casilla (`TrialItemRow`); barra de progreso del día; **`CheckinCard`**: «¿Cómo te sientes hoy?» 1–5 (5 botones grandes con emoji), peso opcional, vasos de agua (− / +), nota; guarda con `repo.saveTodayCheckin` y luego `reload()`; si ya hay chequeo hoy (`repo.getTodayCheckin()`) muestra el resumen con «Editar».
   - Mensaje de lo que falta: «Para abrir el Día N+1: haz tu chequeo y marca al menos K de T» → cuando se cumple: «¡Listo! El Día N+1 se abre mañana». Si `current_day` es null y no terminó: «Vuelve mañana: tu Día N se abre el <fecha>». Si `finished`: tarjeta «¡Semana completada!» + `LinkButton` a `/mi-plan/suscripcion`.""",
     '- `PlanShell`/`BottomNav`: 4 enlaces, el activo marcado (`aria-current`).\n- `HoyPage`: sin ficha / generar / REQUIERE_NUTRICIONISTA / día con ítems y marcar uno llama `setTrialItemDone` / chequeo guardado llama `saveTodayCheckin` / mensaje «se abre mañana» / semana completada.',
     'la ronda B')

impl('U7b', 'Agenda estilo Base Vital con candados y muro de pago',
     '`src/pages/plan/AgendaPage.tsx`, `src/components/plan/MonthCalendar.tsx`, `src/components/plan/DayActivities.tsx`, `src/components/plan/Paywall.tsx` y sus `*.test.tsx`.',
     f"""Referencias: `{REF}Agenda.tsx` y `{REF}agenda-002.css` (mira la estructura y el aspecto, no copies el CSS: tradúcelo a Tailwind).
- Dos columnas en ≥ 1024 px (en celular, una debajo de otra), como la captura de Base Vital: **izquierda** tarjeta «Planificación diaria» con el mes (lunes primero, nombres en español, flechas ‹ ›, días de otros meses atenuados, hoy resaltado, el día elegido en `bg-navy-900 text-white`), punto naranja en días con actividades y 🔒 (`Lock`) en días de la semana gratis aún cerrados; leyenda «Días con actividades». **Derecha** tarjeta «Actividades del día» con la fecha larga («Sábado, 21 de noviembre de 2026»), «N actividades», y la lista hora + punto + título (+ detalle en gris). Botón «Volver a hoy» arriba a la derecha.
- Fechas de la semana gratis: el día k cae en `unlocked_on` si existe; si no, en la fecha proyectada (fecha del último día abierto + días restantes). Usa `useTrial()` de `src/components/plan/useTrial.ts` (lo crea U7a; si aún no existe en tu árbol, crea tú un archivo con esa misma firma y anótalo en el reporte: el orquestador conserva el de U7a).
- Elegir un día cerrado → tarjeta con candado «Este día se abre cuando completes el anterior» (sin ítems). Elegir un día posterior al 7 → **`Paywall`**: «Tu semana gratis termina en el Día 7. Suscríbete para que una nutricionista siga tu plan» + `LinkButton` a `/mi-plan/suscripcion`. Si `repo.getMyPatientSubscription()` está `activa`, en lugar del muro muestra los `repo.listPlanDays(miId, desde, hasta)` del mes (título, comidas, ejercicio) — fase 2 con `usePhase(2)`; con fase 2 apagada, el muro dice «Próximamente».
- Marcar ítems desde la Agenda también funciona (solo en días abiertos).""",
     '- Mes correcto (noviembre 2026 empieza en domingo → primera fila con 26–31 de octubre atenuados).\n- Día abierto muestra ítems; día cerrado muestra candado sin ítems; día 8+ muestra el muro con enlace a suscripción; con suscripción activa muestra `listPlanDays`.\n- «Volver a hoy» selecciona hoy.',
     'la ronda B')

impl('U7c', 'Guía de nutrición pública + editor de la guía',
     '`src/pages/GuiaPage.tsx`, `src/components/guide/*`, `src/pages/admin/AdminGuiaPage.tsx` y sus `*.test.tsx`.',
     f"""Referencias: `{REF}Guide.tsx` y `{REF}guide.es.ts` (estructura de ficha: objetivo, equipo, restricciones GO/NO-GO, pasos).
- **`/guia`** (pública): encabezado tipo manual («Guía de nutrición Activa GYE», subtítulo, etiqueta «Revisada por nutricionistas» SOLO si quieres poner «Contenido general; no reemplaza a tu nutricionista»), chips de categoría con conteo («Todas (12)», Hidratación, Porciones, Antes de entrenar, Después de entrenar, Comer fuera, Descanso, Compras) y buscador «Buscar en la guía…» (título, resumen, ítems). Tarjeta por entrada: ícono por categoría, título, **Objetivo**, **✅ Sí** (fondo verde suave, insignia «SÍ»), **⛔ Evita** (fondo rojo suave, insignia «EVITA»), **Pasos** numerados, **Fuente**. Datos con `repo.listGuide()`; vacío: «Aún no hay entradas en la guía».
- **`/admin/guia`** (nutricionista y admin, dentro de `AdminShell`): lista con publicada/no, crear/editar en un formulario (slug, categoría, título, resumen, objetivo, listas Sí/Evita/Pasos una por línea, fuente, publicada, orden), borrar con `ConfirmDialog`. `repo.adminListGuide`, `adminSaveGuideEntry`, `adminDeleteGuideEntry`.""",
     '- Filtrar por categoría y buscar reducen las tarjetas.\n- Tarjeta muestra Sí/Evita/Pasos.\n- Editor: guardar llama `adminSaveGuideEntry` con las listas partidas por línea; borrar pide confirmación.',
     'la ronda B')

impl('U7d', 'Progreso + ficha con alergias y condiciones',
     '`src/pages/plan/ProgresoPage.tsx`, `src/components/plan/MiniLineChart.tsx`, y en `src/components/panel/` SOLO `FichaForm.tsx`, `FichaTab.tsx`, `ficha.ts` y sus tests.',
     f"""Referencia: `{REF}History.tsx`.
1. **`/mi-plan/progreso`**: resumen arriba (días completados x/7, % de ítems cumplidos, ánimo promedio, cambio de peso desde el primer chequeo); gráficos de línea SVG simples (`MiniLineChart`, accesibles con `<title>` y tabla oculta) para **ánimo** (1–5), **peso** y **agua** de `repo.listCheckins(miId, 30)`; barras por día de la semana gratis (items_done/items_total) con `useTrial()` de `src/components/plan/useTrial.ts` (lo crea U7a; si no existe en tu árbol, crea uno con la misma firma `{{ trial, loading, error, reload, setItemDone }}` y anótalo); historial «Registro de chequeos» (fecha, emoji del ánimo, peso, agua, nota). Vacío: «Aún no hay chequeos: haz el primero en Hoy» con enlace.
2. **Ficha** (`FichaForm`): agrega «Alergias o comidas que no comes» (texto ≤ 300) y «Condiciones de salud» (casillas: Diabetes, Hipertensión, Embarazo, Enfermedad renal, Otra), con nota: «Si marcas alguna, una nutricionista arma tu plan en lugar del plan automático». Envía `allergies` y `conditions` en `PatientIntakeInput`. Tras guardar con éxito (`FichaTab`), muestra `LinkButton` «Ver mi semana gratis» → `/mi-plan/hoy`.""",
     '- Progreso: con chequeos dibuja 3 gráficos y la tabla; sin chequeos muestra el vacío con enlace.\n- Ficha: envía allergies/conditions; tras guardar aparece «Ver mi semana gratis».\n- Los tests existentes de la ficha siguen verdes.',
     'la ronda B')

# ================================================================== RONDA B
impl('S6', 'Migración 7: plantillas de nutricionista y guía (contenido) + semilla demo',
     '`supabase/migrations/20261121000007_contenido_plantillas_guia.sql`, `supabase/tests/06_contenido.sql`, el bloque nuevo `-- SEMANA GRATIS DEMO` al final de `supabase/seed.sql`, y una fila nueva en `docs/entrega/CUENTAS-DE-PRUEBA.md`.',
     f"""Implementa la sección «Migración 7» de `{DB}` completa (10 plantillas con 7 días × 7 ítems cada una, guía de 12 entradas, semilla demo). Comida ecuatoriana real y variada, porciones en medidas caseras; ninguna plantilla repite el mismo almuerzo dos días seguidos. Todas `borrador` / «Pendiente de revisión». Usa `insert … select` con CTEs o `values` largos; un solo archivo. Puedes generar el SQL con un script de Node propio en `scripts/plan-content.mjs` (también tuyo) si te es más fácil.
La paciente demo: crea el usuario como las cuentas existentes del bloque `-- CUENTAS LOCALES` de `seed.sql`, su ficha (`patient_intakes`), llama `assign_trial` como ella (con `set_config('request.jwt.claims', …)` y `set local role authenticated`) o inserta `trials`/`trial_days`/`trial_items` a mano, y deja los 7 días completados (`completed_at`, `unlocked_on` en fechas pasadas) y 7 chequeos.""",
     '`supabase/tests/06_contenido.sql` con lo de §Migración 7 + `npx supabase test db` verde (01–06) tras `npx supabase db reset`. Comprueba también que `assign_trial` para una paciente nueva de 25 años, IMC 27, bajar_peso, recibe una plantilla específica (no la de respaldo).',
     'la ronda C', SQL_RULES)

impl('U8a', 'Suscripción del paciente + accesos a «Mi plan»',
     '`src/pages/plan/SuscribirmePage.tsx` (+ test), y en `src/pages/panel/MiPanelPage.tsx` SOLO una tarjeta/enlace «Mi plan» arriba de las pestañas; en `src/pages/NutricionPage.tsx` SOLO un bloque «Empieza tu semana gratis».',
     """- **`/mi-plan/suscripcion`** dentro de `PhaseGate phase={{2}}`: estado actual (`repo.getMyPatientSubscription()`): activa (hasta fecha), pendiente (con su factura) o ninguna. Sin suscripción: tarjetas de `repo.listPatientPlans()` (nombre, precio/mes, qué incluye: «Una nutricionista toma tu caso», «Agenda personalizada cada semana», «Seguimiento y chequeos») y botón «Suscribirme» → `repo.choosePatientPlan` → muestra la factura creada y cómo pagar: instrucciones de transferencia (texto: «Te enviaremos los datos de la cuenta por correo; luego informa aquí tu número de comprobante») y el formulario de referencia con `repo.reportInvoicePaid` (reutiliza lo de `src/components/panel/PagosTab.tsx` si puedes importarlo sin editarlo). Resumen de la semana gratis arriba con `repo.getMyTrial()` (x/7 días completados). Salida: «Volver a Hoy».
- **`MiPanelPage`**: tarjeta destacada «Mi semana gratis» → `/mi-plan/hoy`.
- **`NutricionPage`** (pública): bloque «Empieza tu semana gratis: 7 días de comidas y rutinas armados por nutricionistas según tu peso, edad y objetivo» con botón a `/registro` (sin sesión) o `/mi-plan/hoy` (con sesión).""",
     '- Sin suscripción: lista planes y suscribirse llama `choosePatientPlan`; pendiente: muestra factura y reportar llama `reportInvoicePaid`; activa: muestra hasta cuándo.\n- Fase 2 apagada: «Próximamente».\n- Tests existentes de MiPanel y Nutricion verdes.',
     'la ronda C')

impl('U8b', 'Editor de plantillas de la semana gratis',
     '`src/pages/admin/AdminPlantillasPage.tsx`, `src/pages/admin/AdminPlantillaPage.tsx`, `src/components/templates/*` y sus tests.',
     """Dentro de `AdminShell` (nutricionista y admin):
- **`/admin/plantillas`**: tabla/tarjetas con nombre, para quién (género, edad, IMC, objetivo en palabras), kcal base, estado (insignia «Borrador» gris / «Aprobada» verde), «Respaldo», nº de ítems; botón «Nueva plantilla»; filtro por estado.
- **`/admin/plantillas/:id`** (`nuevo` = crear): formulario de criterios (nombre, descripción, género, edad mín/máx, IMC mín/máx, objetivo o «Cualquiera», kcal base, autora, estado, respaldo) → `repo.adminSaveTemplate`; editor de **7 días** en pestañas Día 1…Día 7: lista de ítems ordenada por hora (hora, tipo, título, detalle) con agregar/editar/borrar (`adminSaveTemplateItem`, `adminDeleteTemplateItem`, `ConfirmDialog`); botón «Copiar este día a…» (copia los ítems a otro día con varias llamadas a `adminSaveTemplateItem`). Al poner «Aprobada» pide confirmar: «¿Una nutricionista revisó este plan? Se mostrará como firmado por <autora>». Borrar plantilla con confirmación. Regreso a la lista.""",
     '- Lista muestra estados; crear plantilla llama `adminSaveTemplate`; agregar ítem al Día 3 llama `adminSaveTemplateItem` con `day_number: 3`; aprobar pide confirmación; copiar día llama N veces.',
     'la ronda C')

impl('U8c', 'Nutricionista: semana gratis y chequeos del paciente + etiquetas de pagos',
     '`src/components/nutri/TrialProgress.tsx` (+ test); en `src/pages/nutri/PacientePage.tsx` SOLO insertar `<TrialProgress patientId=… />`; en `src/components/panel/PagosTab.tsx` y `src/pages/admin/AdminPagosPage.tsx` SOLO la etiqueta del tipo `suscripcion_paciente` («Suscripción del paciente») y que no rompan con ese tipo.',
     """- **`TrialProgress`**: con `repo.getPatientTrial(id)` y `repo.listCheckins(id, 30)`: plantilla asignada (+ insignia borrador), kcal objetivo, 7 cuadritos de días (completado ✓ / abierto / cerrado 🔒) con items_done/items_total, últimos chequeos (fecha, ánimo, peso, agua, nota) y alergias/condiciones de la ficha si vienen en el detalle del paciente. Sin semana: «Este paciente no tiene semana gratis». Se muestra en la ficha del paciente del nutricionista.
- Tipos de factura: agrega `suscripcion_paciente` a las etiquetas donde se listan facturas (el tipo `Invoice['kind']` ya lo incluye).""",
     '- `TrialProgress`: con semana muestra 7 días y chequeos; sin semana, el vacío.\n- Tests existentes de PacientePage/PagosTab/AdminPagos verdes.',
     'la ronda C')

# ================================================================== RONDA C
impl('EG', 'Pruebas de punta a punta de la semana gratis + evidencia',
     '`e2e/semana.spec.ts`, `e2e/guia.spec.ts`, `e2e/helpers.ts` (solo agregar), `docs/entrega/SEMANA-GRATIS.md`, `docs/entrega/PRUEBA-DE-BOTONES.md` (solo agregar filas), `scripts/capturas-semana.mjs`, `docs/entrega/capturas/*` nuevas, y en `README.md` SOLO una sección «Semana gratis» bajo «Entrega por fases».',
     """La base local ya tiene migraciones 1–7 y la semilla (incluida `semana@activagye.test`). Tu árbol tiene `.env.local`. **No** hagas `db reset`/`start`/`stop`. Deja las fases como estaban al terminar (fase 1 sí, 2 y 3 no).
- `e2e/semana.spec.ts`: registro nuevo (correo único) → ficha sin condiciones → «Ver mi semana gratis» → Hoy muestra «Día 1 de 7» con ítems → marcar la mitad + chequeo → «se abre mañana» → Agenda: Día 1 con ítems, Día 2 con candado, un día > 7 con el muro «Suscríbete». Otra prueba: ficha con «Diabetes» → «Generar» muestra el mensaje de nutricionista. Otra: `semana@activagye.test` ve «¡Semana completada!» → con fase 2 encendida (Admin → Fases) se suscribe → admin marca pagada en Admin → Pagos → nutricionista ve una solicitud nueva.
- `e2e/guia.spec.ts`: `/guia` sin sesión, filtrar categoría, buscar; nutricionista edita una entrada en `/admin/guia`; plantillas visibles en `/admin/plantillas`.
- Evidencia: `scripts/capturas-semana.mjs` → `docs/entrega/capturas/` `semana-hoy.png`, `semana-agenda.png`, `semana-agenda-candado.png`, `semana-muro-pago.png`, `semana-progreso.png`, `guia.png`, `admin-plantillas.png` a 1280 px y `semana-hoy-movil.png` a 390 px. Míralas con Read y commitea las que se vean bien. `SEMANA-GRATIS.md`: qué es, regla de desbloqueo, cómo probarlo con las cuentas, capturas.""",
     '- `npx playwright test --reporter=line`: todo verde (reporta el número). Si algo falla por un error REAL de la app, NO lo tapes: anótalo con archivo:línea y cómo reproducirlo.',
     'las revisiones', '**Tiempo extra:** este brief puede usar 25 minutos.')

review('RT', 'Seguridad y datos de la semana gratis',
       'Migraciones 6–7, `supabase/tests/05_*.sql` y `06_*.sql`, `src/data/supabase/trial.ts` y los cambios en `care.ts`/`plan.ts`. ¿Cumple el contrato? ¿RLS correcta?',
       """- Como paciente: leer `trial_items` de días cerrados (tabla directa, `my_trial`, `set_trial_item_done` con id de un día cerrado); leer `plan_templates`/`plan_template_items`; leer trial/chequeos de otro paciente; adelantar días (chequeo + marcar varias veces el mismo día, cambiar la fecha del chequeo); `assign_trial` con condiciones; leer `plan_days` sin suscripción; marcar `set_plan_day_done` sin suscripción.
- Pagos: paciente marca pagada su propia factura de suscripción; `choose_patient_plan` con plan de nutricionista; doble suscripción.
- ¿`mark_invoice_paid` y `cancel_invoice` conservan TODO lo que hacían en la migración 4? (compara cuerpos).
- ¿`anon` puede escribir la guía o leer algo privado? ¿Alguna `security definer` sin chequeo?
- Zona horaria: ¿se usa `gye_today()` en todos lados?""")
review('RU', 'Navegación real y fidelidad a Base Vital',
       'Toda la experiencia del paciente (Hoy, Agenda, Progreso, Suscripción, Guía) y del staff (plantillas, guía, ficha del paciente) en el navegador real a 360 y 1280 px con la base local. Compara con `' + REF + '`.',
       """- Recorre el flujo de `e2e/semana.spec.ts` a mano. ¿Se entiende qué falta para abrir el día siguiente? ¿El muro de pago aparece y lleva a suscribirse?
- ¿La Agenda se parece a Base Vital (mes izquierda, actividades del día con hora derecha, «Volver a hoy», puntos, candados)? ¿La barra inferior funciona en celular y no tapa contenido?
- Cada botón nuevo: ¿hace algo y tiene regreso? ¿cargando/vacío/error?
- ¿Se muestra el aviso de plan borrador? ¿Queda «Pending»/«En construcción» o texto falso?
- Lo anterior sigue funcionando: buscador de lugares, Mi panel, nutricionista, pagos.""")
impl('XT', 'Arreglos de la revisión: seguridad y datos',
     'Los archivos que señalen los BLOCKING/HOTFIX con área `[sql]` o `[datos]` (una migración NUEVA `supabase/migrations/20261121000008_arreglos_semana.sql` si hace falta SQL: nunca edites una migración ya aplicada; tests en `supabase/tests/07_arreglos_semana.sql`).',
     'Lee `work/out/RT/report.md` y `work/out/RU/report.md`. Arregla TODOS los HOTFIX y BLOCKING de áreas `[sql]` y `[datos]`, cada uno con su test (pgTAP o Vitest).',
     '- Un test por hallazgo arreglado, con el nombre del hallazgo.', 'la recomprobación RTb/RUb', SQL_RULES)
impl('XU', 'Arreglos de la revisión: pantallas y navegación',
     'Los archivos que señalen los BLOCKING/HOTFIX con área `[paciente]`, `[nutri]`, `[admin]`, `[guia]` o `[e2e]`. NO toques `supabase/`.',
     'Lee `work/out/RT/report.md` y `work/out/RU/report.md`. Arregla TODOS los HOTFIX y BLOCKING de esas áreas, cada uno con su test. **No** hagas `db reset` (la base es de XT).',
     '- Un test por hallazgo arreglado.', 'la recomprobación RTb/RUb')
review('RTb', 'Recomprobación: seguridad y datos',
       'Solo verifica que los hallazgos `[sql]` `[datos]` de `work/out/RT/report.md` y `work/out/RU/report.md` estén arreglados (con test) y sin regresiones. Lee `work/out/XT/report.md`.',
       '- Reproduce cada hallazgo anterior.\n- Gates completos.')
review('RUb', 'Recomprobación: navegación',
       'Solo verifica que los hallazgos `[paciente]` `[nutri]` `[admin]` `[guia]` `[e2e]` de RT/RU estén arreglados y sin regresiones. Lee `work/out/XU/report.md`.',
       '- Reproduce cada hallazgo anterior en el navegador.\n- Recorrido de la semana gratis otra vez.')

IDS = ['S5', 'D4', 'U7a', 'U7b', 'U7c', 'U7d', 'S6', 'U8a', 'U8b', 'U8c', 'EG', 'RT', 'RU', 'XT', 'XU', 'RTb', 'RUb']
print('ok', [i for i in IDS if (OUT / f'{i}.md').exists()])

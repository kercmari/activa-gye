"""Genera los briefs de Activa GYE (implementadores haiku, revisores opus). Uso: python3 -I work/gen/briefs.py"""
from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / 'briefs'
OUT.mkdir(exist_ok=True)
DESIGN = 'docs/superpowers/specs/2026-11-21-activa-gye-design.md'
PLAN = 'docs/superpowers/plans/2026-11-21-activa-gye-front.md'

COMMON = f"""**Proyecto:** Activa GYE, web para encontrar dónde hacer deporte en Guayaquil (entrega académica, Fase 5). Esta noche: **solo frontend con datos simulados** (todo se guarda en `localStorage` del navegador). Mañana se conecta Supabase con el MISMO contrato.
**Lee primero:** `work/TOKEN-PROTOCOL.md` (reglas y gates — obligatorio); `{PLAN}` (reparto y convenciones); `src/data/types.ts` (el contrato `Repo` y los tipos — NO lo cambies); el diseño `{DESIGN}` en las secciones que te indique tu brief; las capturas `docs/diseno/capturas/*.png` (míralas con la herramienta Read) cuando hagas pantallas.
**Convenciones fijas:**
- Stack: React 19 + TypeScript + Vite + Tailwind v4 + `react-router` v8 (importa SIEMPRE desde `'react-router'`: `Link`, `NavLink`, `useNavigate`, `useParams`, `useSearchParams`, `useLocation`). Íconos: `lucide-react`. Mapa: `react-leaflet` + `leaflet`. Tests: Vitest + Testing Library (`src/**/*.test.tsx`), entorno jsdom ya configurado (`src/test/setup.ts`).
- Datos: SOLO a través de `import {{ repo }} from '<ruta>/data'` (archivo `src/data/index.ts`). Nunca leas `localStorage` desde una pantalla.
- Sesión: `import {{ useAuth }} from '<ruta>/auth/AuthContext'` → `{{ session, loading, refresh }}`. `session.profile.role` es `'usuario' | 'nutricionista' | 'admin'`.
- Estilo (copiar las capturas): colores con las clases del tema (`bg-navy-900`, `text-navy-900`, `bg-brand-orange`, `hover:bg-brand-orange-dark`, `bg-brand-blue`, `text-sky-tag`, `bg-surface`), tarjetas `rounded-[1.75rem] bg-white shadow-xl shadow-navy-900/5`, títulos `.display` (extra-bold, apretado), etiquetas `.eyebrow`. Contenedor de página: `mx-auto max-w-6xl px-4`. Todo debe verse bien a 360 px y a 1280 px.
- Cada pantalla que carga datos tiene 4 estados: cargando (`role="status"`), vacío (mensaje + botón útil), error (mensaje del `AppError` + botón "Reintentar"), contenido.
- **Ningún botón sin acción y ninguna pantalla sin salida**: toda página interna tiene el botón "Volver" (`BackButton`) o un enlace claro de regreso.
- Textos en español de Ecuador, sin datos inventados. Errores: muestra `error.message` si es `AppError`, si no "Algo salió mal. Inténtalo de nuevo."
- Los archivos `src/pages/*.tsx` que hoy muestran `<Pending …/>` son marcadores: reemplaza SOLO los de tu tarea, por completo (sin importar `_Pending`).
"""

GATES_TIME = """**Tiempo:** máximo 20 minutos. Haz commit en cuanto algo funcione (gates verdes), luego sigue. Si se acaba el tiempo, lo commiteado vale.
**Gates antes de cada commit:** `npm run -s lint` (0 errores), `npm run -s build` (exit 0), `npx vitest run` (verde). Reporta los números.
"""


def impl(name, title, owns, body, tests, nxt):
    fix = lambda t: t.replace('{{', '{').replace('}}', '}')
    owns, body, tests = fix(owns), fix(body), fix(tests)
    text = f"""# {name} — IMPLEMENTADOR (haiku) — {title}
**Reporte:** `work/out/{name}/report.md` (qué hiciste, archivos, gates con números, pedidos al orquestador, pendientes).
**Commits:** empiezan con `{name}: `.
{COMMON}
**Archivos que son tuyos (solo estos):** {owns}

## Qué construir
{body}

## Tests obligatorios (uno por punto, nombres exactos)
{tests}

{GATES_TIME}
**Última línea del reporte:** `NEXT: la cadena sigue con {nxt}.`
"""
    (OUT / f'{name}.md').write_text(text)


def review(name, title, scope, falsify):
    text = f"""# {name} — REVISOR (opus) — {title}
**Reglas:** solo revisar: nunca edites, nunca hagas commit, nunca push. Sigue `work/TOKEN-PROTOCOL.md` (regla 3). Máximo 20 minutos.
**Hallazgos:** `work/out/{name}/report.md`
**Lee:** `{DESIGN}` (§2, §7, §9, §15), `{PLAN}`, `src/data/types.ts`, los reportes `work/out/*/report.md` de los implementadores y `git log --oneline -40`.
**Alcance:** {scope}
**Mide, no confíes en los reportes.** Corre los gates (`npm run -s lint`, `npm run -s build`, `npx vitest run`, `npx playwright test --reporter=line`).
**Intenta romper:**
{falsify}
**Veredicto:** escribe la línea `## Verdict: **SHIP**` o `## Verdict: **DO NOT SHIP**` (inglés, exacto). DO NOT SHIP solo por: botón sin acción, pantalla sin salida, ruta que rompe, crash, dato de otra persona visible, texto falso/placeholder visible, gate rojo, o una observación del profesor sin resolver (Cómo llegar; cuenta/perfil/progreso guardados). Luego las secciones `HOTFIX NOW` / `BLOCKING` (archivo:línea + cómo reproducir + arreglo sugerido en una línea) / `non-blocking`.
Para cada BLOCKING indica a qué área pertenece: `[landing]`, `[datos]`, `[lugares]`, `[cuenta]`, `[nutricion]`, `[admin]`, `[e2e]`.
**Última línea:** `NEXT: el orquestador lee {name}.`
"""
    (OUT / f'{name}.md').write_text(text)


# ---------------------------------------------------------------- RONDA 1
impl('F1', 'Encabezado, pie, kit de UI, landing y páginas fijas',
     '`src/components/layout/*` (reemplaza `Layout.tsx`), `src/components/ui/*`, `src/components/home/*`, `src/components/places/PlaceCard.tsx`, `src/components/ContactForm.tsx`, `src/lib/format.ts`, `src/lib/icons.ts`, `src/pages/HomePage.tsx`, `ConocenosPage.tsx`, `ContactoPage.tsx`, `PrivacidadPage.tsx`, `NotFoundPage.tsx`, `SinAccesoPage.tsx` y sus `*.test.tsx`.',
     """Diseño: §7 (mapa de páginas y tabla de botones), §9.6, §10, §11 del diseño. Imágenes ya listas: `/img/logo.png`, `/img/hero.jpg`, `/img/sports/<id>.jpg` (ids: gimnasios, funcional, yoga, baile, natacion, boxeo, colectivos, otras), `/img/lugar-gimnasio.jpg`, `/img/lugar-yoga.jpg`, `/img/lugar-boxeo.jpg`.

1. **Kit de UI** en `src/components/ui/`:
   - `Button.tsx`: `Button` (props de `<button>` + `variant: 'primary'|'secondary'|'blue'|'ghost'|'danger'`, `size: 'md'|'lg'`), y `LinkButton` (igual pero con `to` de react-router). primary = naranja con sombra naranja suave y texto blanco extra-bold redondeado (`rounded-2xl`); secondary = borde `border-white/20` sobre oscuro o `border-slate-300` sobre claro (prop `onDark?: boolean`); blue = azul `bg-brand-blue`. Íconos opcionales a la derecha (`iconRight`).
   - `BackButton.tsx`: botón "← Volver"; si `window.history.state?.idx > 0` hace `navigate(-1)`, si no `navigate(fallback)` (prop `fallback`, por defecto `'/'`).
   - `PageHeader.tsx`: franja azul marino con `eyebrow`, título `.display` blanco, subtítulo opcional y `BackButton` arriba (prop `back?: string | false`).
   - `States.tsx`: `Loading` (texto "Cargando…", `role="status"`), `EmptyState({{title, text, action?}})`, `ErrorState({{message, onRetry}})` con botón "Reintentar".
   - `Field.tsx`: `TextField`, `SelectField`, `TextArea` con `label` en mayúsculas pequeñas (como "NOMBRE" en la captura 05), `error?: string` debajo en rojo, `id` ligado a `label` (accesible).
   - `Badge.tsx`: pastilla redondeada (`tone: 'blue'|'orange'|'slate'|'green'`).
2. **`src/lib/icons.ts`**: `sportIcon(name: string)` → componente lucide por nombre (`Dumbbell, Zap, Sparkles, HeartPulse, Waves, Swords, Users, Bike`; si no existe, `Activity`).
3. **`src/lib/format.ts`**: `formatPrice(p: Place)` → `'Gratis'` si 0, `'Desde $25'` (sin decimales si es entero, si no `$7,50`), `'Consultar precio'` si null. `summarizeHours(h: Hours | null)` → `'Horario por confirmar'` si null; si lun–vie tienen la misma franja: `'Lun–Vie · 06:00–22:00'` (+ `' · Sáb 07:00–14:00'` si sábado tiene); si no, la franja del primer día abierto con su nombre corto. `DAY_LABELS: Record<DayKey,string>` (Lunes…Domingo) y `DAY_SHORT` (Lun…Dom). `placeImage(p: Place)` → `p.photo_url` o `/img/sports/<primer sport_id>.jpg` o `/img/lugar-gimnasio.jpg`.
4. **`src/components/places/PlaceCard.tsx`** (`{{ place, sectorName, sportName, distanceKm?, compare?: {{checked, onChange, disabled}} }}`): como la captura 04 **sin la etiqueta DEMO**: foto (`placeImage`), pastilla blanca con el deporte arriba a la izquierda, nombre, `MapPin` + sector en azul, descripción (o `"Lugar deportivo en {{sector}}"`), línea fina, reloj + `summarizeHours`, precio en negrita (`formatPrice`), botón flecha azul claro → `/lugares/{{id}}` con `aria-label="Ver {{nombre}}"`. Si `source==='osm'` y no hay precio: pequeña nota "Datos de OpenStreetMap". Si `distanceKm` viene: "a 1,2 km". Si `compare` viene: casilla "Comparar". Toda la tarjeta es clicable (enlace) salvo la casilla.
5. **Layout** (`src/components/layout/Layout.tsx`, `Header.tsx`, `Footer.tsx`): reemplaza el esqueleto (mantén `<Outlet />` dentro de `<main id="contenido">`). Añade un enlace "Saltar al contenido".
   - Header (captura 01): barra `bg-navy-900`, logo `/img/logo.png` (alto 44 px, fondo blanco redondeado) + texto "ACTIVA" blanco cursiva extra-bold y "GYE" azul cursiva → `/`. Menú `NavLink`: Inicio `/`, Conócenos `/conocenos`, Explorar deportes `/deportes`, Buscar lugares `/lugares`, Nutricionista `/nutricion`, Contacto `/contacto` (activo = texto blanco + subrayado naranja). Botón naranja "Explorar actividades →" → `/deportes`. **Botón de cuenta**: sin sesión → "Ingresar" (ícono `User`) → `/ingresar`; con sesión → círculo con la inicial del nombre que abre un menú: "Mi perfil" `/perfil`, "Mi plan nutricional" `/nutricion`, "Panel" `/admin` (solo si rol nutricionista o admin), "Salir" (`await repo.signOut()` y `navigate('/')`). El menú se cierra con Escape, clic fuera o al navegar.
   - Menor a `lg`: botón hamburguesa (`aria-label="Abrir menú"`, `aria-expanded`) que abre un panel con todos los enlaces + cuenta; se cierra al navegar.
   - Footer: fondo `bg-navy-950`, logo, frase "Tu guía deportiva en Guayaquil.", columnas Explora (Deportes, Buscar lugares, Nutricionista), Tu cuenta (Ingresar o Mi perfil según sesión, Crear cuenta si no hay sesión), Activa GYE (Conócenos, Contacto, Privacidad y términos); línea "© 2026 Activa GYE · Guayaquil, Ecuador · Proyecto académico".
6. **HomePage** (capturas 01–05, en este orden):
   a. Hero: fondo `bg-navy-900` con `/img/hero.jpg` a la derecha (cubre, con degradado hacia la izquierda), pastilla con `MapPin` "TU GUÍA DEPORTIVA EN GUAYAQUIL", título "Encuentra tu espacio, **activa** tu pasión." ("activa" naranja), párrafo de la captura, botones "Explorar lugares →" (`/lugares`) y "Conoce más ›" (`/conocenos`).
   b. Buscador (`src/components/home/SearchCard.tsx`, captura 02) que se monta sobre el borde del hero: eyebrow "ENCUENTRA TU PRÓXIMO LUGAR", título "¿Cómo quieres moverte hoy?", campos NOMBRE (texto, placeholder "Ej. Olympic Gym"), ZONA O SECTOR (`repo.listSectors()`, primera opción "Todas las zonas"), ACTIVIDAD (`repo.listSports()`, "Todas las actividades"), PRECIO ("Todos los precios", "Gratis", "Hasta $20", "$20 a $40", "Más de $40"), HORARIO ("Cualquier horario", "Mañana (5:00–12:00)", "Tarde (12:00–18:00)", "Noche (18:00–23:00)"). Ícono de filtros (`SlidersHorizontal`, `aria-label="Más filtros"`, `aria-expanded`) que muestra/oculta: casilla "Cerca de mí" y casillas de servicios (Duchas, Parqueo, Entrenador personal, Casilleros, Clases grupales, Piscina, Wi-Fi, Cafetería → ids `duchas, parqueo, entrenador, casilleros, clases_grupales, piscina, wifi, cafeteria`). Botón azul ancho "Buscar lugares" → `navigate('/lugares?' + buildSearchParams(state))`. Exporta la función pura `buildSearchParams` desde `src/components/home/searchParams.ts`: claves `nombre, sector, deporte, precio, horario, servicios` (separados por coma), `cerca=1`; omite las vacías.
   c. "MUÉVETE A TU MANERA" / "Explora por deporte" + texto a la derecha; grilla 4×2 (2 columnas en celular) de tarjetas con imagen `/img/sports/<id>.jpg`, degradado azul abajo, ícono naranja (`sportIcon`), nombre y `ChevronRight` → `/deportes/<id>`.
   d. "SELECCIÓN LOCAL" / "Lugares recomendados" + pastilla "N resultados": `repo.searchPlaces({{}})`, muestra 6 (primero los que tienen `hours`, luego por nombre) con `PlaceCard`; botón "Ver todos los lugares →" (`/lugares`). Sin etiqueta DEMO.
   e. Banda nutricionista: fondo azul `bg-brand-blue`, "¿Quieres un plan de alimentación?" + texto corto ("Cuéntanos tus medidas y objetivo y recibe una guía orientativa. Un nutricionista puede revisar tu caso.") + botón naranja "Conectar con un nutricionista" → `/nutricion`.
   f. Contacto (captura 05) usando `ContactForm` con `id="contacto"`.
7. **`src/components/ContactForm.tsx`** (captura 05): panel azul a la izquierda ("HABLEMOS", "¿Tienes una consulta o sugerencia?", texto, ítems: `Mail` "Escríbenos con este formulario", `MapPin` "Guayaquil, Ecuador", `MessageCircle` "Respuesta en 1–2 días hábiles"). Formulario NOMBRE, CORREO ELECTRÓNICO, ASUNTO, MENSAJE; validación en el cliente (nombre ≥2, correo válido, asunto ≥2, mensaje ≥5) con mensajes en español bajo cada campo; enviar → `repo.sendContact`; botón deshabilitado con "Enviando…" mientras tanto; éxito: "¡Gracias! Te responderemos en 1–2 días hábiles." + botón "Enviar otro mensaje" que limpia; error: mensaje del AppError.
8. **ConocenosPage**: `PageHeader` ("CONÓCENOS", "Hacemos fácil empezar a moverte"), qué es Activa GYE, misión, "Cómo funciona" en 3 pasos (Busca → Compara → Ve con la ruta "Cómo llegar"), sección cuenta (guarda favoritos, progreso y tu plan), sección nutricionista, nota "Proyecto académico desarrollado en Guayaquil, 2026.", botones "Buscar lugares" y "Crear mi cuenta" (`/registro`).
9. **ContactoPage**: `PageHeader` + `ContactForm`.
10. **PrivacidadPage**: secciones: Qué datos guardamos; Para qué; Tu foto (opcional, solo mayores de 18, "se envía de forma privada a un servicio de IA (Groq) solo para generar tu guía y la puede ver el nutricionista"); Quién ve tus datos (tú; nutricionista y admin solo lo necesario); Cómo borrar tu cuenta (Editar perfil → Borrar mi cuenta); Aviso de salud ("Orientación general. No reemplaza a un profesional de la salud."); **"Versión de prueba: por ahora tus datos se guardan solo en este navegador."**
11. **NotFoundPage** ("No encontramos esta página" + "Ir al inicio" + "Buscar lugares") y **SinAccesoPage** ("No tienes acceso a esta sección" + "Ir al inicio" + "Mi perfil").
""",
     """- `src/components/home/searchParams.test.ts` → `buildSearchParams omite vacíos y une servicios con coma` (entrada con nombre "Olympic", sector "norte", servicios ["duchas","parqueo"], cerca true → `nombre=Olympic&sector=norte&servicios=duchas%2Cparqueo&cerca=1`).
- `src/lib/format.test.ts` → `formatPrice` (0→"Gratis", 25→"Desde $25", 7.5→"Desde $7,50", null→"Consultar precio"); `summarizeHours` (null→"Horario por confirmar"; lun–vie 06:00–22:00 + sáb 07:00–14:00 → "Lun–Vie · 06:00–22:00 · Sáb 07:00–14:00").
- `src/components/layout/Header.test.tsx` (envuelve en `MemoryRouter`; `vi.mock` de `../../auth/AuthContext` para controlar la sesión) → `muestra Ingresar sin sesión`, `muestra Panel solo a nutricionista o admin`, `el menú móvil abre y cierra`.
- `src/components/ContactForm.test.tsx` (`vi.mock('../data')` con `repo.sendContact`) → `valida campos vacíos sin llamar a sendContact`, `muestra gracias tras enviar`.""",
     'F2a y F2b (en paralelo); luego la ronda 2')

impl('F2a', 'Lugares reales de OpenStreetMap + simulador del catálogo',
     '`scripts/import-osm.mjs`, `scripts/osm-map.mjs`, `scripts/osm-map.test.mjs`, `src/data/mock/places.osm.json`, `src/data/mock/catalog.ts` (reemplaza el marcador), `src/data/mock/catalog.test.ts`, `src/lib/geo.ts`, `src/lib/hours.ts` y sus tests. Usa `src/data/mock/store.ts` (ya existe, no lo cambies).',
     """Diseño: §8 (lugares), §9.1, §9.7, §15 punto 6.

1. **`scripts/osm-map.mjs`** (funciones puras, exportadas):
   - `parseOpeningHours(text)` → `Hours | null`. Soporta: `"Mo-Fr 06:00-22:00"`, `"Mo-Fr 06:00-22:00; Sa 07:00-14:00"`, `"Mo-Sa 06:00-21:00; Su 08:00-12:00"`, `"Mo,We,Fr 18:00-20:00"`, `"24/7"` (todos los días `[["00:00","23:59"]]`), varias franjas `"Mo-Fr 06:00-12:00,15:00-21:00"`. Días OSM `Mo Tu We Th Fr Sa Su` → `mon tue wed thu fri sat sun`. Días no mencionados = `[]`. Cualquier otra cosa (p. ej. "PH off", meses, texto) → `null`.
   - `mapSports(tags)` → lista de ids de deporte: `leisure=fitness_centre` o `sport` contiene fitness/weightlifting → `gimnasios`; `sport` crossfit/functional/calisthenics o `leisure=fitness_station` → `funcional`; yoga/pilates → `yoga`; `leisure=dance` o sport dance → `baile`; swimming o `leisure=swimming_pool` → `natacion`; boxing/martial_arts/karate/judo/taekwondo/kickboxing/mma → `boxeo`; soccer/basketball/volleyball/tennis/padel/futsal/baseball/softball → `colectivos`; cualquier otro (climbing, cycling, skating, bowling, etc.) o `sports_centre` sin otro → `otras`. Sin duplicados; nunca vacío (mínimo `otras`).
   - `nearestSector(lat, lng)` con estos centros (id: lat, lng): norte −2.130,−79.900; centro −2.192,−79.884; sur −2.230,−79.900; urdesa −2.170,−79.908; kennedy −2.165,−79.897; alborada −2.137,−79.902; sauces −2.122,−79.894; ceibos −2.163,−79.940; via-costa −2.185,−79.985; via-daule −2.100,−79.930; samborondon −2.140,−79.865; duran −2.172,−79.830. Devuelve el más cercano (usa `distanceKm`).
   - `mapElement(el)` → `Place` (forma de `src/data/types.ts`) o `null` si no tiene `name`: `id = 'osm-' + el.type + '-' + el.id`, `osm_id = el.type + '/' + el.id`, lat/lng de `el.lat/lon` o `el.center`, `address` = `addr:street` + `addr:housenumber` (null si no hay), `phone` = `phone` o `contact:phone`, `website` = `website` o `contact:website`, `instagram` = `contact:instagram`, `description` = `description` o null, `hours = parseOpeningHours(opening_hours)`, `price_from = null`, `services`: `["piscina"]` si es piscina o `swimming_pool`, si no `[]`, `source = 'osm'`, `published = true`, `verified_at = null`, `photo_url = null`, `gallery = []`, `sport_ids = mapSports(tags)`, `sector_id = nearestSector`, `created_at/updated_at = '2026-11-21T00:00:00.000Z'`, resto null/[].
   - `dedupe(places)`: quita los que tienen el mismo nombre (sin mayúsculas ni tildes) a menos de 80 m; conserva el que tiene horario.
   - Excluir nombres genéricos que no sirven como lugar: exactamente "Área Social", "Area Social", "Cancha", "Canchas", "Piscina", "Gimnasio" (sin más texto).
2. **`scripts/import-osm.mjs`**: consulta Overpass (POST `https://overpass-api.de/api/interpreter`, respaldo `https://overpass.kumi.systems/api/interpreter`; cabecera `User-Agent: ActivaGYE-import/1.0 (proyecto academico)`), con esta consulta exacta:
   `[out:json][timeout:60];(nwr["leisure"~"fitness_centre|sports_centre|swimming_pool|sports_hall|dance|fitness_station"]["name"](-2.30,-80.05,-2.05,-79.80);nwr["sport"~"yoga|pilates|boxing|martial_arts|swimming|crossfit|fitness|dance|padel|tennis|climbing|soccer|basketball|volleyball"]["name"](-2.30,-80.05,-2.05,-79.80););out center tags;`
   → `mapElement` → filtra null y genéricos → `dedupe` → ordena por nombre → máximo 300 → escribe `src/data/mock/places.osm.json` (JSON con 2 espacios). Imprime cuántos y cuántos con horario. **Córrelo de verdad** (`npm run -s import:osm`) y commitea el JSON. (Se probó a las 02:00: devuelve ~300 elementos.) Si la red falla en ambas URLs, NO inventes lugares: reporta el bloqueo.
3. **`src/lib/geo.ts`**: `distanceKm(a: {{lat,lng}}, b: {{lat,lng}})` (fórmula de haversine, radio 6371) y `formatKm(km)` → `"a 850 m"` si < 1, si no `"a 1,2 km"` (coma decimal, 1 decimal). `scripts/osm-map.mjs` puede tener su propia copia de haversine (los scripts no importan TS).
4. **`src/lib/hours.ts`**: `DAY_KEYS` (mon…sun), `dayKeyOf(date)` (domingo = sun), `isOpenNow(hours, date = new Date())` (franja de hoy que contenga la hora local; null → false), `matchesSchedule(hours, range)`: true si algún día tiene una franja que se cruce con mañana 05:00–12:00 / tarde 12:00–18:00 / noche 18:00–23:00; `hours` null → false.
5. **`src/data/mock/catalog.ts`**: exporta `catalogPart` (tipo `Pick<Repo, 'listSectors'|'listSports'|'searchPlaces'|'getPlace'|'getPlaces'|'sendContact'|'adminListPlaces'|'adminSavePlace'|'adminSetPublished'|'adminListMessages'|'adminMarkMessageRead'>`).
   - Sectores y deportes: copia exacta de la semilla de `supabase/migrations/20261121000001_esquema_inicial.sql` (mismos ids, nombres, orden, íconos); `image_url = '/img/sports/<id>.jpg'`.
   - Lugares = `places.osm.json` + cambios del admin guardados con `store.ts` (tabla `'places_admin'`: lista de `Place` completos que reemplazan por id o se agregan).
   - `searchPlaces(f)`: solo `published`; `name`: contiene, sin mayúsculas ni tildes (normaliza con `normalize('NFD').replace(/\\p{{Diacritic}}/gu,'')`); `sector`; `sport` (en `sport_ids`); `price`: gratis = 0, hasta20 = ≤20, 20a40 = >20 y ≤40, mas40 = >40 (con filtro de precio, los de precio null quedan fuera); `schedule` → `matchesSchedule`; `services`: debe tenerlos todos. Orden por nombre (`localeCompare('es')`).
   - `getPlace(id)`: publicado, o cualquiera si `currentUser()?.profile.role === 'admin'`; si no, null. `getPlaces(ids)`: publicados en el orden pedido.
   - `sendContact`: valida (mismas reglas que la tabla `contact_messages`) → `AppError('DATOS_INVALIDOS', '…')`; más de 5 del mismo correo en 1 hora → `AppError('DEMASIADOS_MENSAJES','Enviaste muchos mensajes. Intenta en una hora.')`; guarda en tabla `'contact_messages'`.
   - Admin (todas exigen `currentUser()?.profile.role === 'admin'`, si no `AppError('SOLO_ADMIN','Solo el administrador puede hacer esto.')`): `adminListPlaces(search?)` (todos, incluye no publicados, filtro por nombre); `adminSavePlace(input)` valida nombre 2–160, lat −2.6…−1.8 y lng −80.3…−79.5 (Guayaquil y alrededores) → si no `DATOS_INVALIDOS`; sin id → nuevo `id = 'adm-' + crypto.randomUUID()`, `source='admin'`, `osm_id=null`; con id → conserva `source`/`osm_id`/`created_at`; `updated_at = now`; devuelve el `Place`. `adminSetPublished`. `adminListMessages` (más nuevo primero), `adminMarkMessageRead`.
   - Todas las funciones son `async` y llaman `await wait()` de `store.ts` (simula red; 0 ms en tests).
""",
     """- `scripts/osm-map.test.mjs` → `parseOpeningHours` (los 6 formatos de arriba + "PH off" → null), `mapSports` (gimnasio, piscina, academia de baile, cancha de fútbol, sports_centre solo → otras), `nearestSector` (−2.137,−79.902 → alborada), `mapElement sin name → null`, `dedupe quita duplicados a menos de 80 m`.
- `src/lib/hours.test.ts` → `isOpenNow` (lunes 07:00 con Lun–Vie 06–22 → true; domingo → false), `matchesSchedule` (franja 18:00–20:00 → noche true, mañana false; null → false).
- `src/lib/geo.test.ts` → `distanceKm` Centro (−2.192,−79.884) a Samborondón (−2.140,−79.865) ≈ 6,1 km (±0,3), `formatKm(0.85)` → "a 850 m", `formatKm(1.23)` → "a 1,2 km".
- `src/data/mock/catalog.test.ts` → `searchPlaces sin filtros devuelve solo publicados`, `filtra por nombre sin tildes`, `filtro de precio excluye precio null`, `admin oculta un lugar y deja de aparecer`, `usuario normal no puede adminSavePlace (SOLO_ADMIN)`, `sendContact rechaza el sexto mensaje en una hora`. Para simular la sesión de admin escribe en el store con `setSessionUserId` y `writeTable('users', [...])` (ver `store.ts`).""",
     'la ronda 2 (lugares, cuenta, nutrición, admin)')

impl('F2b', 'Simulador de cuentas, perfil, favoritos, progreso y nutrición + guía básica',
     '`src/data/mock/accounts.ts` (reemplaza el marcador), `src/data/mock/accounts.test.ts`, `src/data/mock/seed-users.ts`, `src/lib/nutrition/guide.ts`, `src/lib/nutrition/guide.test.ts`, `src/lib/image.ts`, `docs/entrega/CUENTAS-DE-PRUEBA.md`. Usa `src/data/mock/store.ts` (ya existe, no lo cambies).',
     """Diseño: §6 (roles), §8, §9.4, §9.5, §15 (decisiones 3, 5, 7).

1. **`src/lib/nutrition/guide.ts`** → `buildBasicGuide(i: {{ age, sex, height_cm, weight_kg, activity_level, goal, restrictions, health_conditions }}): NutritionGuide`. Reglas EXACTAS:
   - IMC = peso / (altura_m²), 1 decimal. Etiqueta: <18,5 "Bajo peso"; <25 "Peso saludable"; <30 "Sobrepeso"; si no "Obesidad".
   - Metabolismo basal (Mifflin-St Jeor): `10*peso + 6.25*altura_cm − 5*edad` + (masculino **+5**; femenino **−161**; otro / prefiero_no_decir **−78**).
   - Factor: sedentario 1.2, ligero 1.375, moderado 1.55, intenso 1.725. Objetivo: bajar_peso ×0.85, ganar_musculo ×1.10, resto ×1.
   - Piso: femenino 1200, todos los demás 1500. `daily_kcal = Math.round(max(piso, kcal) / 50) * 50` (aplica el piso ANTES de redondear).
   - Proteína g/kg: ganar_musculo 1.8, bajar_peso 1.6, resistencia 1.4, resto 1.2 → `protein_g = Math.round(peso * f)`. Grasa: `fat_g = Math.round(daily_kcal * 0.28 / 9)`. Carbohidratos: `carbs_g = Math.max(0, Math.round((daily_kcal − protein_g*4 − fat_g*9) / 4))`.
   - `summary`: 1–2 frases en español con IMC, etiqueta, objetivo y kcal.
   - `recommendations`: 4 frases por objetivo (escríbelas: claras, sin prohibir alimentos, comida local: verde, menestra, pescado, frutas como papaya, guineo, maracuyá, piña).
   - `sample_day`: 5 comidas: "Desayuno", "Media mañana", "Almuerzo", "Media tarde", "Merienda", 2–4 alimentos cada una, de Guayaquil y saludables (ej. "Bolón de verde al horno con huevo", "Encebollado con poco aceite", "Menestra de lenteja con arroz integral y pescado a la plancha", "Ceviche de pescado", "Yogur natural con papaya").
   - `hydration`: `"Bebe alrededor de " + round1(peso*0.035) + " litros de agua al día (más si entrenas o hace calor)."` (coma decimal, p. ej. "2,5").
   - `activity` (ids de `sports`): bajar_peso → funcional "3 veces por semana", natacion "2 veces por semana", baile "1–2 veces por semana"; ganar_musculo → gimnasios "3–4 veces por semana", funcional "1–2 veces por semana"; mantener → colectivos "2 veces por semana", yoga "1–2 veces por semana"; resistencia → natacion "2–3 veces por semana", funcional "2 veces por semana", otras "1 vez por semana (ciclismo o trote)"; bienestar → yoga "2–3 veces por semana", baile "1–2 veces por semana". Cada una con `reason` corta.
   - `warnings`: si `health_conditions` no vacío → "Por tus condiciones de salud, consulta a un profesional antes de cambiar tu alimentación."; si IMC < 18,5 o ≥ 35 → "Te recomendamos una valoración presencial con un nutricionista."; si `restrictions` no vacío → "Adapta el menú a tus restricciones: " + texto. Si edad < 18 → "Por tu edad, sigue esta guía con acompañamiento de un adulto o profesional."
   - `disclaimer`: "Orientación general generada automáticamente. No reemplaza la consulta con un profesional de la salud."
2. **`src/lib/image.ts`** → `downscaleToDataUrl(file: File, maxSide = 800): Promise<string>`: valida tipo `image/jpeg|png|webp` y tamaño ≤ 5 MB (si no, `AppError('FOTO_INVALIDA','La foto debe ser JPG, PNG o WebP de hasta 5 MB.')`), dibuja en `<canvas>` reducida a lado máximo 800 y devuelve `toDataURL('image/jpeg', 0.8)`. (En tests, haz un mock de la función.)
3. **`src/data/mock/seed-users.ts`**: `ensureSeedUsers()` crea, si no existen, 3 cuentas de prueba (contraseñas con el mismo hash que `signUp`): `admin@activagye.test` / `ActivaAdmin2026!` (rol admin, "Administración Activa GYE"), `nutri@activagye.test` / `ActivaNutri2026!` (rol nutricionista, "Lcda. Nutrición Demo"), `usuario@activagye.test` / `ActivaUser2026!` (usuario, "Usuario de prueba", fecha 2000-05-10, objetivo bajar_peso, 4 registros de progreso de las últimas 4 semanas con peso 78 → 76,5). Documenta las 3 cuentas en `docs/entrega/CUENTAS-DE-PRUEBA.md` (para el video y las capturas; aclara que solo existen en el simulador del navegador).
4. **`src/data/mock/accounts.ts`** → exporta `accountsPart` con todos los métodos de `Repo` que NO están en catálogo: `getSession, onAuthChange, signUp, signIn, signOut, requestPasswordReset, updateProfile, deleteMyAccount, listFavorites, isFavorite, toggleFavorite, listProgress, addProgress, deleteProgress, createNutritionRequest, listMyNutritionRequests, getNutritionRequest, getNutritionPhotoUrl, listAllNutritionRequests, takeNutritionRequest, answerNutritionRequest, adminListUsers, adminSetRole`. Usa `store.ts` (`readTable/writeTable`, `currentUser`, `setSessionUserId`, `hashPassword`, `wait`, `nowIso`). Llama `ensureSeedUsers()` al inicio de cada método (es idempotente y barato).
   - `signUp`: correo válido (minúsculas, sin espacios) o `DATOS_INVALIDOS`; contraseña ≥ 8; nombre ≥ 2; `birth_date` válida y edad ≥ 16 o `AppError('MENOR_DE_16','Debes tener al menos 16 años para registrarte.')`; correo repetido → `AppError('CORREO_EN_USO','Ya existe una cuenta con ese correo.')`. Crea usuario con perfil (`role:'usuario'`, resto null) y deja la sesión iniciada. Avisa a los oyentes de `onAuthChange`.
   - `signIn`: correo+contraseña correctos o `AppError('CREDENCIALES','Correo o contraseña incorrectos.')`. `signOut`: borra sesión, avisa. `requestPasswordReset`: siempre resuelve (en el simulador no se envía correo).
   - `updateProfile(patch)`: sin sesión → `SIN_SESION`; valida (nombre 2–120, teléfono ≤ 30, edad ≥ 16 si cambia fecha) ; nunca cambia `role` ni `id`; avisa a oyentes.
   - `deleteMyAccount`: borra usuario, favoritos, progreso, solicitudes y fotos suyas; cierra sesión; avisa.
   - Favoritos: tabla `'favorites'` `{{user_id, place_id, created_at}}`; `listFavorites` devuelve los `Place` publicados usando `catalogPart.getPlaces` (impórtalo de `./catalog`; si aún es el marcador, el test lo simula con `vi.mock('./catalog')`).
   - Progreso: valida como la tabla `progress_entries` (peso 20–400, minutos 0–1440, al menos uno de los dos, nota ≤ 280, actividad ≤ 80, fecha no futura) → `DATOS_INVALIDOS`; lista por fecha ascendente; borrar solo lo propio.
   - `createNutritionRequest(input)`: sin sesión → `SIN_SESION`; edad desde `profile.birth_date` (si falta → `AppError('DATOS_INVALIDOS','Completa tu fecha de nacimiento en Editar perfil.')`); valida rangos de la tabla `nutrition_requests`; si hay `photo`: sin `consent_photo` → `AppError('FOTO_SIN_CONSENTIMIENTO','Debes aceptar el uso de tu foto.')`, edad < 18 → `AppError('FOTO_MENOR_18','La foto solo se permite a mayores de 18 años.')`; guarda la foto reducida (`downscaleToDataUrl`) en tabla `'photos'` `{{path, user_id, data_url}}` con `path = user_id + '/' + crypto.randomUUID() + '.jpg'`. Genera `ai_guide = buildBasicGuide(...)`, `ai_kind='basica'`, `ai_status='lista'`, `status='guia_lista'`, `consent_at` si hay consentimiento. Devuelve la solicitud.
   - `listMyNutritionRequests` (más nueva primero). `getNutritionRequest(id)`: del dueño o staff (rol nutricionista/admin); si no, null. `getNutritionPhotoUrl(req)`: dueño o staff → `data_url`; si no, null.
   - Staff (`nutricionista` o `admin`, si no `AppError('SOLO_NUTRICIONISTA','Solo un nutricionista puede hacer esto.')`): `listAllNutritionRequests` (todas, más nueva primero, con `requester_name`), `takeNutritionRequest` (ya tiene `nutritionist_id` → `AppError('YA_TOMADA','Otra persona ya tomó esta solicitud.')`), `answerNutritionRequest(id, plan)` (plan recortado < 20 caracteres → `AppError('PLAN_MUY_CORTO','Escribe un plan de al menos 20 caracteres.')`; si está asignada a otra persona y quien responde no es admin → `AppError('NO_ASIGNADA_A_TI','Esta solicitud la tomó otra persona.')`; si no tenía asignado, se asigna a quien responde; `status='respondida'`, `responded_at`).
   - Admin (solo `admin`, si no `SOLO_ADMIN`): `adminListUsers(search?)` (filtra por correo o nombre), `adminSetRole(userId, role)` (a sí mismo → `AppError('NO_PUEDES_CAMBIAR_TU_ROL','No puedes cambiar tu propio rol.')`; inexistente → `NO_EXISTE`).
""",
     """- `src/lib/nutrition/guide.test.ts` → `mujer 30 años 165 cm 70 kg moderado bajar_peso` (IMC 25,7 "Sobrepeso"; kcal 1850; proteína 112; grasa 58; carbos 220), `hombre 25 años 180 cm 75 kg intenso ganar_musculo` (kcal 3350; proteína 135; grasa 104; carbos 469), `piso de 1200 para mujer` (60 años 150 cm 40 kg sedentario bajar_peso → 1200), `advertencias por condiciones de salud y por IMC bajo`, `siempre 5 comidas y disclaimer`.
- `src/data/mock/accounts.test.ts` → `registro inicia sesión y crea perfil usuario`, `rechaza menor de 16`, `rechaza correo repetido`, `ingreso con contraseña mala falla`, `updateProfile no cambia el rol`, `progreso: agrega, lista ordenado y valida peso`, `favoritos: alterna`, `nutrición: crea solicitud con guía básica`, `nutrición: foto sin consentimiento falla`, `otro usuario no ve mi solicitud`, `nutricionista toma y responde; otro nutricionista no puede responder`, `admin cambia rol de otro pero no el suyo`, `deleteMyAccount borra todo y cierra sesión`, `cuentas de prueba existen y entran`.""",
     'la ronda 2 (lugares, cuenta, nutrición, admin)')

# ---------------------------------------------------------------- RONDA 2
impl('G1', 'Páginas de deportes, búsqueda, ficha del lugar (Cómo llegar) y comparar',
     '`src/pages/DeportesPage.tsx`, `DeportePage.tsx`, `LugaresPage.tsx`, `LugarPage.tsx`, `CompararPage.tsx`, `src/components/places/*` (salvo `PlaceCard.tsx`, que puedes usar pero no cambiar salvo un arreglo menor que anotes), `src/lib/directions.ts`, `src/lib/useGeolocation.ts` y sus tests.',
     """Diseño: §7, §9.1, §9.2, §9.3, §15 punto 6. **Esta tarea resuelve la observación del profesor "No hay guía de cómo llegar".** Usa el kit de `src/components/ui/*`, `PlaceCard`, `src/lib/format.ts`, `src/lib/geo.ts`, `src/lib/hours.ts`, `sportIcon`.

1. **`src/lib/directions.ts`**: `googleDirectionsUrl(p)` → `https://www.google.com/maps/dir/?api=1&destination=${{lat}},${{lng}}` (+ `&travelmode=driving` NO, déjalo sin modo); `osmUrl(p)` → `https://www.openstreetmap.org/?mlat=${{lat}}&mlon=${{lng}}#map=17/${{lat}}/${{lng}}`. Gratis, sin clave.
2. **`src/lib/useGeolocation.ts`**: hook `useGeolocation()` → `{{ position, status: 'idle'|'asking'|'ok'|'denied'|'unavailable', request() }}` con `navigator.geolocation.getCurrentPosition` (timeout 10 s). Sin `navigator.geolocation` → `unavailable`.
3. **DeportesPage** (`/deportes`): `PageHeader` ("MUÉVETE A TU MANERA", "Explora por deporte"), grilla de las 8 tarjetas (igual a la de inicio, con conteo "N lugares" de `searchPlaces({{sport}})`), cada una → `/deportes/:id`.
4. **DeportePage** (`/deportes/:slug`): deporte inexistente → mensaje "Ese deporte no existe" + "Ver todos los deportes". Si existe: `PageHeader` con nombre e imagen, lista de `PlaceCard` de ese deporte, botón "Buscar con más filtros" → `/lugares?deporte=<id>`; `BackButton` con fallback `/deportes`.
5. **LugaresPage** (`/lugares`): lee los filtros de la URL (`nombre, sector, deporte, precio, horario, servicios, cerca`) y los muestra en una barra de filtros editable (mismos campos que el buscador de inicio; al cambiar, actualiza la URL con `setSearchParams` para que "Volver" los respete). Resultado: "N lugares encontrados". **Cerca de mí**: botón (`LocateFixed`) que pide ubicación; si `ok`, ordena por distancia y pasa `distanceKm` a cada tarjeta; si `denied`/`unavailable` muestra "No pudimos usar tu ubicación. Elige un sector." y enfoca el selector de sector. Interruptor **Lista / Mapa** (`aria-pressed`): mapa con `react-leaflet` (`MapContainer` centrado en −2.17,−79.90 zoom 12, `TileLayer` de `https://{{s}}.tile.openstreetmap.org/{{z}}/{{x}}/{{y}}.png` con atribución "© OpenStreetMap", un `CircleMarker` por lugar —no uses los íconos de imagen por defecto de Leaflet, se rompen con Vite— y `Popup` con nombre + enlace "Ver lugar"). Casilla **Comparar** en cada tarjeta (máximo 3; al llegar a 3 las demás se deshabilitan con texto "Máximo 3"); barra fija abajo cuando hay ≥ 2: "Comparar (N)" → `/comparar?ids=a,b,c` y "Limpiar". Sin resultados: `EmptyState` "No encontramos lugares con esos filtros" + botón "Quitar filtros" (→ `/lugares`). Paginación simple: muestra 24 y botón "Ver más".
6. **LugarPage** (`/lugares/:id`): inexistente → "Este lugar no existe o ya no está publicado" + "Buscar lugares". Contenido: `BackButton` (fallback `/lugares`), foto grande (`placeImage`), pastillas de deportes, nombre `.display`, sector y dirección (o "Dirección por confirmar"), estado **"Abierto ahora" (verde) / "Cerrado ahora"** con `isOpenNow` (si `hours` null: "Horario por confirmar"), tabla de horario Lunes…Domingo ("Cerrado" si vacío), precio (`formatPrice`) + `price_note`, promociones, servicios con íconos (o "Servicios por confirmar"), contacto (teléfono `tel:`, WhatsApp `https://wa.me/593…` si viene, web, Instagram) — solo los que existan. **Mapa** (react-leaflet, `CircleMarker` naranja en el lugar, zoom 16). **Botón principal naranja "Cómo llegar"** → `googleDirectionsUrl` en pestaña nueva (`target="_blank" rel="noopener noreferrer"`), botón secundario "Ver en OpenStreetMap" → `osmUrl`. Botón **♥ Guardar en favoritos** (`aria-pressed`): sin sesión → `navigate('/ingresar?volver=/lugares/<id>')`; con sesión → `repo.toggleFavorite` y cambia el texto ("Guardado en favoritos"). Si `source==='osm'`: aviso "Datos de OpenStreetMap. Confirma precios y horarios con el lugar." Si `verified_at`: "Datos verificados el DD/MM/AAAA".
7. **CompararPage** (`/comparar?ids=`): `repo.getPlaces(ids)`; con < 2 lugares: mensaje "Elige al menos 2 lugares para comparar" + "Buscar lugares". Tabla (en celular, tarjetas apiladas) con filas: Foto+nombre, Sector, Precio, Horario (`summarizeHours`), Abierto ahora, Servicios (✓/—), Promociones, y por columna botones "Ver lugar" y "Quitar" (quita el id de la URL). `BackButton` fallback `/lugares`.
""",
     """- `src/lib/directions.test.ts` → `googleDirectionsUrl usa destino lat,lng`, `osmUrl`.
- `src/pages/LugaresPage.test.tsx` (`vi.mock` de `../data` con 3 lugares; `MemoryRouter initialEntries={{['/lugares?deporte=yoga']}}`; mockea `react-leaflet` con componentes vacíos) → `lee filtros de la URL y llama searchPlaces con sport yoga`, `sin resultados muestra Quitar filtros`, `comparar habilita el botón con 2 y bloquea el cuarto`.
- `src/pages/LugarPage.test.tsx` → `muestra Cómo llegar con el enlace de Google Maps correcto`, `favorito sin sesión lleva a ingresar`, `lugar inexistente muestra mensaje y enlace de búsqueda`.
- `src/pages/CompararPage.test.tsx` → `con menos de 2 pide elegir`, `quitar actualiza la URL`.""",
     'G2, G3, G4 en paralelo; luego E1')

impl('G2', 'Cuenta: ingresar, registro, recuperar, Mi perfil (favoritos, plan, progreso) y editar perfil',
     '`src/pages/IngresarPage.tsx`, `RegistroPage.tsx`, `RecuperarPage.tsx`, `PerfilPage.tsx`, `PerfilEditarPage.tsx`, `src/components/profile/*` y sus tests.',
     """Diseño: §6, §7, §9.4, §15 punto 3. **Esta tarea resuelve la observación del profesor "¿Cómo guardo los datos de mi plan y progreso? Un lugar donde tenga mi cuenta con mis datos".** Usa el kit `src/components/ui/*` y `useAuth`.

1. **Diseño de las páginas de acceso**: tarjeta blanca centrada sobre fondo azul marino con el logo, título `.display`, y enlaces entre ellas.
2. **IngresarPage** (`/ingresar`): correo + contraseña (con botón mostrar/ocultar `aria-label`), "Ingresar" → `repo.signIn` → `await refresh()` → `navigate(volver ?? '/perfil', {{ replace: true }})` donde `volver` es `?volver=` **solo si empieza con `/` y no con `//`** (evita redirecciones a otros sitios). Enlaces "¿Olvidaste tu contraseña?" (`/recuperar`) y "Crear cuenta" (`/registro`, conservando `volver`). Recuadro discreto "Cuentas de prueba" con los 3 correos de `docs/entrega/CUENTAS-DE-PRUEBA.md` (solo correos y contraseñas de prueba del simulador).
3. **RegistroPage** (`/registro`): nombre completo, correo, contraseña (≥ 8, indicador simple de fuerza), confirmar contraseña, fecha de nacimiento (`type="date"`, mensaje "Debes tener al menos 16 años"), casilla obligatoria "Acepto los términos y la política de privacidad" con enlace a `/privacidad` (`target="_blank"`). Valida en el cliente con mensajes por campo; `repo.signUp` → `refresh()` → `navigate('/perfil?bienvenida=1')`.
4. **RecuperarPage** (`/recuperar`): correo → `repo.requestPasswordReset` → mensaje "Si el correo está registrado, te enviaremos un enlace para crear una nueva contraseña." + "Volver a ingresar". Nota pequeña: "En la versión de prueba no se envían correos."
5. **PerfilPage** (`/perfil`): cabecera azul marino con inicial grande, nombre, correo, rol (pastilla si no es usuario) y botones "Editar perfil" (`/perfil/editar`) y "Salir". Si `?bienvenida=1`: aviso verde "¡Tu cuenta está lista! Completa tus datos para recibir mejores recomendaciones." Pestañas accesibles (`role="tablist"`, flechas izquierda/derecha) que se guardan en `?tab=`:
   - **Mis datos**: lista de los datos del perfil ("Sin completar" si falta) con nombres legibles (objetivo, nivel de actividad, sector por nombre).
   - **Mis favoritos**: `repo.listFavorites()` → `PlaceCard`; vacío: "Aún no guardas lugares" + "Buscar lugares".
   - **Mi plan**: última solicitud de `repo.listMyNutritionRequests()`: resumen de la guía (kcal, IMC) y, si existe, "Plan de tu nutricionista" destacado; botones "Ver guía completa" (`/nutricion/<id>`) y "Nueva solicitud" (`/nutricion/nueva`); vacío: "Todavía no tienes un plan" + "Conectar con un nutricionista" (`/nutricion`).
   - **Mi progreso**: formulario en línea (fecha —hoy por defecto, no futura—, peso kg, minutos activos, actividad, nota) → `repo.addProgress`; lista (más nueva arriba) con botón borrar (`aria-label="Borrar registro del <fecha>"`, pide confirmar con un diálogo propio, NO `window.confirm`); **gráfico SVG propio** (`src/components/profile/WeightChart.tsx`, sin librerías) de peso en el tiempo con ejes simples y puntos; con < 2 pesos: "Agrega al menos 2 registros con peso para ver tu gráfico". Resumen: "Minutos activos esta semana: N".
6. **PerfilEditarPage** (`/perfil/editar`): campos nombre, fecha de nacimiento, sexo, teléfono, sector, objetivo, nivel de actividad (selects con nombres legibles) → `repo.updateProfile` → `refresh()` → aviso "Cambios guardados" + volver a `/perfil`. `BackButton` fallback `/perfil`. **Zona de peligro**: "Borrar mi cuenta" → diálogo propio que pide escribir "BORRAR" → `repo.deleteMyAccount` → `refresh()` → `navigate('/')`.
""",
     """- `src/pages/IngresarPage.test.tsx` → `ingresa y va a volver si es ruta interna`, `ignora volver externo (//evil.com) y va a /perfil`, `muestra error de credenciales`.
- `src/pages/RegistroPage.test.tsx` → `valida contraseñas distintas y términos sin llamar a signUp`, `registro exitoso navega a /perfil?bienvenida=1`.
- `src/pages/PerfilPage.test.tsx` → `muestra pestaña progreso desde ?tab=progreso`, `agregar progreso llama addProgress y refresca la lista`, `favoritos vacíos muestran Buscar lugares`.
- `src/components/profile/WeightChart.test.tsx` → `con menos de 2 pesos muestra el mensaje`, `dibuja un punto por registro`.
- `src/pages/PerfilEditarPage.test.tsx` → `borrar cuenta exige escribir BORRAR`.""",
     'E1 después de G1–G4')

impl('G3', 'Sección nutricionista: explicación, formulario con foto y resultado',
     '`src/pages/NutricionPage.tsx`, `NutricionNuevaPage.tsx`, `NutricionDetallePage.tsx`, `src/components/nutrition/*` y sus tests.',
     """Diseño: §9.5, §11, §15 puntos 4 y 5. Usa el kit `src/components/ui/*`, `useAuth`, tipos `NutritionGuide`/`NutritionRequest`.

1. **`src/components/nutrition/GuideView.tsx`** (`{{ guide: NutritionGuide, kind: 'ia'|'basica' }}`): tarjetas: resumen; 3 cifras grandes (IMC + etiqueta, kcal/día, agua); barras de macros (proteína/carbohidratos/grasa en g); recomendaciones (lista con ✓); "Ejemplo de un día" (5 comidas); "Actividad sugerida" (cada `sport_id` con su ícono y nombre de deporte, `per_week`, `reason`, y botón "Ver lugares" → `/lugares?deporte=<id>`); advertencias en amarillo; disclaimer siempre visible. Pastilla "Guía básica calculada" si `kind==='basica'`, "Guía con IA" si `ia`.
2. **NutricionPage** (`/nutricion`): `PageHeader` ("NUTRICIÓN", "Conecta con un nutricionista"), cómo funciona en 3 pasos (Cuéntanos tus medidas → Recibe tu guía → Un nutricionista revisa tu caso), qué recibes, aviso fijo "Orientación general. No reemplaza a un profesional de la salud.", botón "Empezar" → `/nutricion/nueva` (si no hay sesión, el guard ya lleva a ingresar y vuelve). Con sesión: lista "Mis solicitudes" (`listMyNutritionRequests`: fecha, objetivo, estado legible: "Guía lista", "Respondida por nutricionista", "Enviada") → `/nutricion/<id>`.
3. **NutricionNuevaPage** (`/nutricion/nueva`): formulario en **4 pasos** con indicador (1 Medidas, 2 Objetivo y hábitos, 3 Foto, 4 Confirmar), botones "Atrás"/"Siguiente" y `BackButton` (fallback `/nutricion`). Paso 1: sexo, altura cm (100–250), peso kg (25–400), cintura cm (opcional, 40–250); la edad sale del perfil: si el perfil no tiene fecha de nacimiento, muestra aviso con botón "Completar mi perfil" (`/perfil/editar`) y no deja continuar. Paso 2: objetivo, nivel de actividad, restricciones/alergias (≤ 500), condiciones de salud (≤ 500). Paso 3: foto **opcional** (`accept="image/jpeg,image/png,image/webp"`, ≤ 5 MB, vista previa con `URL.createObjectURL` y botón "Quitar foto"); casilla obligatoria si hay foto: "Acepto que mi foto se envíe de forma privada a un servicio de IA (Groq) solo para generar mi guía y que la vea un nutricionista."; si edad < 18: la subida está desactivada con el texto "La foto solo se permite a mayores de 18 años." y se puede seguir sin foto. Paso 4: resumen de todo + "Enviar" → `repo.createNutritionRequest` (botón "Generando tu guía…" deshabilitado) → `navigate('/nutricion/<id>')`. Errores del `AppError` visibles en el paso actual.
4. **NutricionDetallePage** (`/nutricion/:id`): `getNutritionRequest`; null → "No encontramos esta solicitud" + "Volver a nutrición". Muestra fecha, estado, datos enviados (plegable), la foto si existe (`getNutritionPhotoUrl`, con texto alternativo "Tu foto enviada"), `GuideView`, y si `nutritionist_plan`: tarjeta destacada "Plan de tu nutricionista" (texto con saltos de línea, fecha de respuesta); si no: "Un nutricionista revisará tu caso pronto." Botones "Ver lugares para mi objetivo" (`/lugares?deporte=<primer activity.sport_id>`), "Volver a mi perfil" (`/perfil?tab=plan`).
""",
     """- `src/components/nutrition/GuideView.test.tsx` → `muestra kcal, IMC y las 5 comidas`, `botón Ver lugares lleva al deporte`, `pastilla Guía básica calculada`.
- `src/pages/NutricionNuevaPage.test.tsx` (`vi.mock` de data y de AuthContext) → `sin fecha de nacimiento pide completar perfil`, `no avanza del paso 1 con altura fuera de rango`, `con foto exige consentimiento`, `menor de 18 no puede subir foto`, `envía y navega al detalle`.
- `src/pages/NutricionDetallePage.test.tsx` → `muestra plan del nutricionista cuando existe`, `solicitud inexistente muestra mensaje`.""",
     'E1 después de G1–G4')

impl('G4', 'Panel de administración y del nutricionista',
     '`src/pages/admin/*` y `src/components/admin/*` y sus tests.',
     """Diseño: §6, §9.5 (punto 5), §9.7, §15 punto 7. Usa el kit `src/components/ui/*` y `useAuth`. Las rutas ya están protegidas en `src/App.tsx` (`/admin` y `/admin/nutricion*` → nutricionista o admin; el resto → solo admin).

1. **`src/components/admin/AdminShell.tsx`**: diseño de panel: barra lateral (en celular, pestañas arriba) con enlaces: Resumen `/admin`, Solicitudes `/admin/nutricion`, y solo admin: Lugares `/admin/lugares`, Mensajes `/admin/mensajes`, Usuarios `/admin/usuarios`; enlace "← Volver al sitio" (`/`). Título de la sección y `children`.
2. **AdminHomePage** (`/admin`): tarjetas con conteos: solicitudes nuevas sin asignar, solicitudes mías sin responder; y solo admin: lugares publicados / ocultos, mensajes sin leer, usuarios. Cada tarjeta enlaza a su sección.
3. **AdminNutricionPage** (`/admin/nutricion`): filtros "Sin asignar", "Mías", "Respondidas", "Todas" (en `?filtro=`); tabla/tarjetas: fecha, nombre (`requester_name`), objetivo, IMC (de `ai_guide`), estado, asignada a (yo / otra persona / nadie); botón "Ver" → `/admin/nutricion/<id>`.
4. **AdminNutricionDetallePage** (`/admin/nutricion/:id`): datos completos (medidas, objetivo, restricciones, condiciones de salud), foto si hay (`getNutritionPhotoUrl`), la guía automática (usa `GuideView` de `src/components/nutrition/GuideView.tsx` si ya existe en tu árbol; si no, muestra resumen, kcal y recomendaciones en una lista simple — anótalo en el reporte), botón **"Tomar solicitud"** si no está asignada (`takeNutritionRequest`; error `YA_TOMADA` visible), y si está asignada a mí (o soy admin): área de texto "Plan del nutricionista" (≥ 20 caracteres, contador) + "Enviar plan" → `answerNutritionRequest` → aviso "Plan enviado. La persona lo verá en Mi plan." Si está asignada a otra persona y no soy admin: "Esta solicitud la atiende otra persona." `BackButton` fallback `/admin/nutricion`.
5. **AdminLugaresPage** (`/admin/lugares`): buscador, filtro Publicados/Ocultos/Todos, tabla con nombre, sector, deportes, precio, horario (sí/no), origen (OSM/Admin), interruptor Publicado (`adminSetPublished`, `role="switch"`), botón "Editar" → `/admin/lugares/<id>`; botón "Nuevo lugar" → `/admin/lugares/nuevo`. Paginación de 50.
6. **AdminLugarPage** (`/admin/lugares/nuevo` y `/admin/lugares/:id`): formulario con TODOS los campos de `PlaceInput`: nombre, descripción, dirección, sector, lat, lng (con un mapa react-leaflet donde un clic mueve el punto; `CircleMarker`, sin íconos de imagen), teléfono, WhatsApp, web, Instagram, URL de foto, precio desde (vacío = consultar), nota de precio, promociones, servicios (casillas), deportes (casillas, al menos 1), **horario por día** (para cada día: casilla "Abierto" + hora abre/cierra; botón "Copiar lunes a todos los días hábiles"; casilla general "Horario por confirmar" que deja `hours: null`), publicado, y botón "Marcar verificado hoy" (pone `verified_at` = ahora). Guardar → `adminSavePlace` → aviso y vuelve a la lista. Errores por campo. `BackButton` fallback `/admin/lugares`.
7. **AdminMensajesPage** (`/admin/mensajes`): lista (no leídos primero, en negrita), al abrir uno se ve completo y se marca leído; botón "Marcar como no leído"; enlace `mailto:` para responder.
8. **AdminUsuariosPage** (`/admin/usuarios`): buscador por correo/nombre, tabla correo, nombre, rol, fecha; selector de rol por fila (deshabilitado en tu propia fila con texto "Tú") → `adminSetRole` con confirmación (diálogo propio) y aviso de éxito o error.
""",
     """- `src/pages/admin/AdminNutricionDetallePage.test.tsx` (`vi.mock` data + AuthContext) → `muestra Tomar solicitud si no está asignada`, `plan corto muestra error y no llama answer`, `asignada a otra persona oculta el formulario para nutricionista`.
- `src/pages/admin/AdminLugarPage.test.tsx` (mock `react-leaflet`) → `horario por confirmar guarda hours null`, `copiar lunes a días hábiles`, `exige al menos un deporte`.
- `src/pages/admin/AdminUsuariosPage.test.tsx` → `no deja cambiar tu propio rol`.
- `src/components/admin/AdminShell.test.tsx` → `nutricionista no ve Lugares, Mensajes ni Usuarios`.""",
     'E1 después de G1–G4')

# ---------------------------------------------------------------- RONDA 3
impl('E1', 'Pruebas de navegación de punta a punta (Playwright) y evidencia para la entrega',
     '`e2e/*.spec.ts`, `docs/entrega/*` (salvo `CUENTAS-DE-PRUEBA.md`, que puedes completar), y SOLO arreglos mínimos de una línea en cualquier página si una prueba descubre un botón roto (anota cada arreglo en el reporte con archivo:línea).',
     """Diseño: §7 (tabla de botones), §14. Lee `docs/entrega/CUENTAS-DE-PRUEBA.md`. Config ya lista: `playwright.config.ts` (construye y sirve en 4173, proyectos desktop 1280 y mobile 360). Navegador ya instalado.

1. **`e2e/navegacion.spec.ts`**: recorre la tabla de botones de §7: desde `/` cada enlace del menú (en mobile, abriendo la hamburguesa), "Explorar actividades", "Explorar lugares", "Conoce más", una tarjeta de deporte, el buscador con un filtro → `/lugares?…`, una tarjeta de lugar → ficha, y **"Volver" regresa** a la página anterior con los filtros intactos. Comprueba que ninguna página muestre el texto "Página en construcción" ni "DEMO" ni "lorem".
2. **`e2e/lugar.spec.ts`**: ficha de un lugar: el enlace "Cómo llegar" tiene `href` que empieza con `https://www.google.com/maps/dir/?api=1&destination=` y `target=_blank`; el mapa se dibuja (existe `.leaflet-container`); favorito sin sesión lleva a `/ingresar?volver=…`.
3. **`e2e/cuenta.spec.ts`**: registro nuevo (correo único con `Date.now()`) → Mi perfil con aviso de bienvenida → agregar 2 registros de progreso → el gráfico aparece → recargar la página y **los datos siguen** → Salir → Ingresar de nuevo y siguen. Ruta protegida sin sesión (`/perfil`) lleva a ingresar y al entrar vuelve.
4. **`e2e/nutricion.spec.ts`**: con `usuario@activagye.test`: completar los 4 pasos sin foto → ver guía con kcal y 5 comidas; luego con `nutri@activagye.test` en otra página (`browser.newContext()` comparte nada: hazlo en la MISMA página saliendo e ingresando, porque los datos viven en localStorage) → Panel → Solicitudes → tomar → responder plan → salir → entrar como usuario → Mi plan muestra el plan del nutricionista.
5. **`e2e/admin.spec.ts`**: como admin: ocultar un lugar y comprobar que ya no sale en `/lugares`; usuario normal en `/admin/lugares` → `/sin-acceso`.
6. **Evidencia** en `docs/entrega/` (español sencillo, para el PDF de la Fase 5):
   - `OBSERVACIONES-Y-CORRECCIONES.md`: tabla Observación del docente | Corrección realizada | Evidencia/resultado. Filas mínimas: "No hay una guía de cómo llegar al sitio" → botón Cómo llegar + mapa en la ficha → prueba `e2e/lugar.spec.ts` y captura; "¿Cómo guardo los datos de mi plan y progreso?" → cuenta, Mi perfil, Mi progreso, Mi plan → `e2e/cuenta.spec.ts`; "Lugares de ejemplo (DEMO)" → lugares reales de OpenStreetMap; "Botones sin destino" → tabla de botones verificada.
   - `PRUEBA-DE-BOTONES.md`: la tabla BOTÓN → ACCIÓN → DESTINO → ¿PUEDE REGRESAR? con todos los botones de todas las páginas, marcada ✓ según tus pruebas.
   - `GUION-VIDEO.md`: recorrido de 2–3 minutos: Inicio → buscador → resultados → ficha → Cómo llegar → registro → Mi perfil/progreso → nutricionista → guía → panel nutricionista → volver.
   - `CAPTURAS.md`: lista de capturas a tomar (código, configuración, pantallas, estados vacío/error/cargando, pruebas en verde).
   - `PENDIENTES-Y-PROXIMOS-PASOS.md`: conectar Supabase (tablas ya escritas en `supabase/migrations`), IA de Groq real (Edge Function), correo real de recuperación, verificar precios de 12 lugares, logo en alta calidad, publicar con dominio, pruebas de usuario.
   - Saca capturas PNG con Playwright de las páginas principales a 1280 px en `docs/entrega/capturas/` (inicio, buscar, ficha, perfil-progreso, nutricion-guia, admin-nutricion) usando las cuentas de prueba.
""",
     """- Los 5 archivos `e2e/*.spec.ts` de arriba, verdes en los proyectos desktop y mobile: `npx playwright test --reporter=line`. Si una prueba falla por un bug real de una página, haz el arreglo mínimo (1–3 líneas), anótalo, y vuelve a correr.""",
     'las revisiones R1 y R2')

# ---------------------------------------------------------------- REVISIONES
review('R1', 'Datos, reglas y lógica (simulador, permisos, guía nutricional)',
       '`src/data/**`, `src/lib/**`, `src/auth/**`, `scripts/**`, los tests unitarios. ¿El simulador cumple el contrato `Repo` y las reglas de roles del §6 igual que lo harán las reglas RLS de `supabase/migrations/20261121000001_esquema_inicial.sql`?',
       """- Un usuario normal lee/edita datos ajenos (solicitudes, fotos, progreso, favoritos) o se cambia el rol.
- Nutricionista responde una solicitud tomada por otra persona; admin se cambia su propio rol.
- Guía nutricional: revisa las cuentas con los ejemplos del brief F2b; kcal por debajo del piso; textos peligrosos (dietas extremas, diagnósticos, suplementos).
- `volver=` de ingresar permite ir a otro sitio (`//evil.com`, `https:…`).
- Lugares: ¿hay datos inventados? ¿el JSON de OSM es real y está en Guayaquil? filtros de precio/horario/servicios correctos.
- Errores: ¿siempre AppError con mensaje en español? ¿alguna promesa sin catch?
- Diferencias entre el simulador y el SQL que harán fallar el cambio a Supabase mañana (lístalas como non-blocking con detalle).""")

review('R2', 'Navegación, pantallas y entrega (navegador real)',
       'Todas las páginas en un navegador real (Playwright, 360 px y 1280 px), `e2e/**`, `docs/entrega/**`. Abre la app con `npx vite preview` tras `npm run -s build` y recórrela tú mismo con las cuentas de `docs/entrega/CUENTAS-DE-PRUEBA.md` (puedes escribir scripts temporales de Playwright en `/tmp`, no en el repo).',
       """- Cada fila de la tabla de botones (§7): BOTÓN → ACCIÓN → DESTINO → ¿REGRESA? Busca botones sin acción, enlaces a rutas que no existen, pantallas sin salida, "Página en construcción", "DEMO", textos de prueba.
- Las dos observaciones del profesor: "Cómo llegar" abre Google Maps con el destino correcto; la cuenta guarda perfil, favoritos, progreso y plan, y sobreviven a recargar y a salir/entrar.
- Recargar en una ruta interna (`/lugares/<id>`, `/perfil`) funciona (en Workers lo hará `not_found_handling`; en preview también).
- 360 px: menú hamburguesa, nada se sale de la pantalla (sin scroll horizontal), botones tocables.
- Estados cargando/vacío/error presentes; accesibilidad básica (labels, foco visible, `alt`).
- ¿Se parece a las capturas `docs/diseno/capturas/*` (colores, tipografía, tarjetas)?
- `docs/entrega/*` completo y sin inventos.""")

# ---------------------------------------------------------------- ARREGLOS (genéricos, por área)
for name, area, owns in [
    ('X1', 'landing, lugares y e2e', 'los archivos de F1, G1 y E1'),
    ('X2', 'datos, cuenta, nutrición y admin', 'los archivos de F2a, F2b, G2, G3 y G4'),
]:
    impl(name, f'Arreglos de revisión: {area}',
         owns + ' (ver los briefs en `work/briefs/`).',
         f"""Lee los hallazgos `work/out/R1/report.md` y `work/out/R2/report.md` (y si existen `work/out/R1b/report.md`, `work/out/R2b/report.md`: son la ronda más reciente, tienen prioridad). Arregla **todos** los `HOTFIX NOW` y `BLOCKING` cuya área sea de las tuyas ({area}: etiquetas {'`[landing]`, `[lugares]`, `[e2e]`' if name == 'X1' else '`[datos]`, `[cuenta]`, `[nutricion]`, `[admin]`'}), luego los non-blocking sencillos de tu área si te queda tiempo. Por cada arreglo, un test que falle sin el arreglo (o una prueba e2e). No toques archivos de la otra área: si un hallazgo los necesita, anótalo en "Pedidos al orquestador".
En el reporte: tabla hallazgo → arreglo (archivo) → test.""",
         '- Un test por hallazgo arreglado, nombrado con el id del hallazgo si lo tiene. Corre también `npx playwright test --reporter=line` al final.',
         'la recomprobación R1b/R2b')

review('R1b', 'Recomprobación: datos, reglas y lógica', 'Igual que R1, pero solo verifica que los BLOCKING/HOTFIX de `work/out/R1/report.md` y `work/out/R2/report.md` de las áreas [datos] [cuenta] [nutricion] [admin] estén arreglados (con su test) y que no haya regresiones. Lee `work/out/X1/report.md` y `work/out/X2/report.md`.',
       '- Cada hallazgo anterior: ¿arreglado de verdad? reprodúcelo.\n- Gates y e2e completos.')
review('R2b', 'Recomprobación: navegación y entrega', 'Igual que R2, pero solo verifica que los BLOCKING/HOTFIX de `work/out/R1/report.md` y `work/out/R2/report.md` de las áreas [landing] [lugares] [e2e] estén arreglados y que no haya regresiones en el navegador real (360 y 1280 px). Lee `work/out/X1/report.md` y `work/out/X2/report.md`.',
       '- Cada hallazgo anterior: ¿arreglado de verdad? reprodúcelo en el navegador.\n- Recorrido completo de la tabla de botones otra vez.')

print('ok', sorted(p.name for p in OUT.glob('*.md')))

# ---------------------------------------------------------------- SEGUNDA RONDA DE ARREGLOS (solo si R1b/R2b dicen DO NOT SHIP)
for src, dst in [('X1', 'X3'), ('X2', 'X4'), ('R1b', 'R1c'), ('R2b', 'R2c')]:
    t = (OUT / f'{src}.md').read_text().replace(f'# {src} ', f'# {dst} ', 1).replace(f'work/out/{src}/', f'work/out/{dst}/').replace(f'`{src}: `', f'`{dst}: `')
    t = t.replace('**Lee:**', '**Ronda 2 de arreglos: lee primero** `work/out/R1b/report.md`, `work/out/R2b/report.md`, `work/out/X3/report.md`, `work/out/X4/report.md` (si existen). **Lee:**', 1) if dst.startswith('R') else \
        t.replace('## Qué construir', '## Qué construir\n**Ronda 2 de arreglos:** los hallazgos que mandan son los de `work/out/R1b/report.md` y `work/out/R2b/report.md`.', 1)
    t = t.replace('la recomprobación R1b/R2b', 'la recomprobación R1c/R2c')
    (OUT / f'{dst}.md').write_text(t)
print('ok2')

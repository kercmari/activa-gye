# Activa GYE — Documento de diseño

Fecha: 21/11/2026 · Estado: borrador para aprobar · Carpeta del proyecto: `/home/kerly/Desktop/proyects/activa-gye`

> Escrito en lenguaje sencillo. Cuando aparece una palabra técnica, al lado va qué significa.

---

## 1. Qué es y por qué

**Activa GYE** es una página web para encontrar dónde hacer deporte en **Guayaquil**. La persona entra, busca gimnasios, centros deportivos y actividades, compara precios, horarios, promociones y servicios, ve cuáles le quedan cerca y sabe **cómo llegar**.

Además, la persona puede **crear su cuenta**, guardar su perfil y su progreso, y pedir una **guía de alimentación** a la sección de **nutricionista**: ingresa sus medidas, puede subir una foto de cuerpo entero y recibe recomendaciones generales y un plan orientativo, más sugerencias de actividad física según su objetivo.

**Para qué es ahora:** es la **entrega de la Fase 5** de la materia, **esta semana**. La entrega exige:
- corregir las observaciones del profesor,
- que **todo botón lleve a algún lado y se pueda regresar** (nada de pantallas sin salida),
- quitar el contenido falso (los lugares "DEMO"),
- mostrar **nuevas funciones**,
- y juntar evidencia (capturas, video y tabla "observación → corrección → resultado").

**Observaciones del profesor que hay que resolver sí o sí:**
1. "No hay una guía de cómo llegar al sitio, o no funciona." → Botón **Cómo llegar** en cada lugar, que abre la ruta en Google Maps, y un mapa en la ficha del lugar.
2. "¿Cómo guardo los datos de mi plan y progreso? Un lugar donde tenga mi cuenta con mis datos." → **Registro, inicio de sesión y página Mi perfil**, con plan y progreso guardados en una base de datos real.

## 2. Objetivos, lo que NO es, y lo que sería un fracaso

**Objetivos (esta semana):**
- La landing actual (diseño del Figma) funciona entera: cada botón y enlace lleva a su destino.
- Lugares **reales** de Guayaquil en lugar de los DEMO.
- Buscar y filtrar por nombre, zona/sector, actividad, precio y horario; "cerca de mí" con la ubicación del navegador.
- Ficha de cada lugar con mapa, datos y botón **Cómo llegar**.
- Cuenta de usuario: registro, ingreso, salir, **Mi perfil** (datos, favoritos, plan nutricional, progreso).
- Sección **Nutricionista**: formulario de medidas y objetivo, foto opcional, guía automática con IA gratis, y revisión por un nutricionista de verdad.
- Panel de **administración** para gestionar lugares, revisar mensajes de contacto, solicitudes de nutrición y roles.
- Todo **gratis** ($0) y publicado en internet.

**No es (fuera de alcance):**
- Reservas o pagos dentro de la página.
- App móvil (es web; se ve bien en celular).
- Chat en vivo con el nutricionista (la comunicación es: la persona envía la solicitud y el nutricionista responde con un plan escrito).
- Varios idiomas (solo español).
- Que los gimnasios administren su propia ficha (lo hace el admin).

**Sería un fracaso aunque "funcione":**
- Que algo cueste dinero o pida tarjeta de crédito.
- Que la foto de cuerpo de alguien la pueda ver otra persona que no sea él o un nutricionista.
- Que la guía nutricional parezca un diagnóstico médico o recomiende dietas peligrosas.
- Que quede un solo botón que no hace nada o una pantalla sin "volver".
- Que se vean lugares o textos inventados sin decirlo.

## 3. Reglas que no se negocian (restricciones)

- **Todo gratis.** Ningún servicio que pida tarjeta. Se usan solo planes gratuitos.
- **Plazo:** esta semana. Lo que no entra se anota como "pendiente" para la siguiente fase (la entrega lo pide igual).
- **Estilo:** el del Figma: azul marino oscuro `#0f1b33` aprox., naranja de acento `#ff6b1a` aprox., azul `#1e88ff` aprox., tipografía gruesa y redondeada, tarjetas con esquinas muy redondeadas. Capturas de referencia en `docs/diseno/capturas/`.
- **Logo:** el de Activa GYE (la persona lo entrega como imagen). Mientras tanto se usa el que se ve en las capturas.
- **Idioma de la página:** español de Ecuador.
- **Publicación:** **Cloudflare Workers** (plan gratis, sitio estático), como viralted.com.

## 4. Formas de construirlo (enfoques)

| Enfoque | Qué es | A favor | En contra |
|---|---|---|---|
| **A. React + Supabase** ✅ elegido | La página en React (lo que genera Figma Make). Supabase hace de backend: cuentas, base de datos, fotos y una función para la IA. | Cuentas reales, datos guardados, roles, $0, sale en una semana. | Hay que crear una cuenta gratis en Supabase y otra en Groq. |
| B. Backend propio (NestJS + Postgres en servidor propio) | Como ViralTED. | Control total. | Montar a mano login, fotos y despliegue: no entra en una semana. |
| C. Solo la página, datos en el navegador | Sin servidor. | Lo más rápido. | No hay cuentas reales: no responde la observación del profesor; no puede existir el nutricionista. |

Se eligió **A** porque es la única que resuelve de verdad "dónde está mi cuenta con mis datos" en el plazo y gratis.

## 5. Cómo está armado (vista general)

```
 Navegador de la persona
   │
   ├── Página web (React)  ← publicada en Cloudflare Workers (gratis)
   │      ├── Mapa: Leaflet + mapas de OpenStreetMap (gratis, sin clave)
   │      └── "Cómo llegar": abre Google Maps con la ruta (un enlace, gratis, sin clave)
   │
   └── Supabase (gratis) = el BACKEND
          ├── Auth: registro e inicio de sesión con correo y contraseña
          ├── Base de datos (Postgres): perfiles, lugares, deportes, favoritos, progreso, solicitudes, mensajes
          ├── Reglas de acceso (RLS): quién puede ver y cambiar cada dato
          ├── Storage: fotos de cuerpo (carpeta PRIVADA) y fotos de lugares (carpeta pública)
          └── Edge Function "analizar-nutricion": llama a la IA de Groq (gratis) con la clave escondida
```

**Palabras clave:**
- **Frontend** = lo que se ve (pantallas, botones). Aquí: React + Vite + TypeScript + Tailwind + React Router.
- **Backend** = lo que guarda y protege los datos. Aquí: Supabase.
- **RLS (Row Level Security)** = reglas dentro de la base de datos que dicen "esta fila solo la ve su dueño". Así, aunque alguien manipule la página, no puede leer datos ajenos.
- **Edge Function** = un pequeño programa que corre en Supabase, no en el navegador. Sirve para usar la clave de Groq sin que nadie la vea.

**Servicios gratuitos que se usan y para qué:**

| Servicio | Para qué | Costo |
|---|---|---|
| Supabase (plan Free) | Cuentas, base de datos, fotos, función de IA | $0 |
| Groq (plan gratis) | IA que lee las medidas y la foto, y escribe la guía | $0 |
| OpenStreetMap (Overpass API) | Lista inicial de gimnasios, piscinas, canchas, etc. de Guayaquil | $0 |
| Leaflet + teselas de OpenStreetMap | Dibujar el mapa | $0 |
| Enlace de Google Maps (`https://www.google.com/maps/dir/?api=1&destination=LAT,LNG`) | Ruta "Cómo llegar" | $0, sin clave |
| Cloudflare Workers | Publicar la página | $0 |

> **No se usa la API de Google Places**: aunque tiene cupo gratis, exige tarjeta. Los lugares salen de OpenStreetMap y el admin completa precios, horarios y promociones (que Google tampoco da).

## 6. Quién es quién (roles y permisos)

Cada cuenta tiene **uno** de tres roles, guardado en la tabla `profiles` (columna `role`):

| Rol | Quién es | Qué puede hacer |
|---|---|---|
| `usuario` | Cualquiera que se registra (rol por defecto) | Ver lugares; guardar favoritos; editar SU perfil; registrar SU progreso; pedir guía nutricional y ver SUS solicitudes |
| `nutricionista` | Profesional dado de alta por el admin | Todo lo de usuario + ver las solicitudes de nutrición de todos (incluida la foto) y escribir el plan del profesional |
| `admin` | Dueño/a del sitio | Todo lo de nutricionista + crear/editar/ocultar lugares, ver mensajes de contacto, cambiar el rol de las cuentas |

- "Un administrador puede ser nutricionista": el admin ya tiene todos los permisos del nutricionista.
- **Nadie puede cambiarse su propio rol.** Solo un admin cambia roles. El primer admin se pone a mano en Supabase (paso de instalación).
- Las reglas viven en la base de datos (RLS), no solo en la página.

## 7. Mapa de páginas (navegación)

Rutas de la web (lo que va después de `activagye…/`). Todas tienen el **encabezado** (logo → Inicio, menú, botón de cuenta) y el **pie de página**. Las páginas internas tienen botón **← Volver**.

| Ruta | Página | Quién entra |
|---|---|---|
| `/` | Inicio (landing del Figma) | Todos |
| `/conocenos` | Conócenos (qué es Activa GYE, misión) | Todos |
| `/deportes` | Explorar deportes (las 8 categorías) | Todos |
| `/deportes/:slug` | Lugares de un deporte (ej. `/deportes/natacion`) | Todos |
| `/lugares` | Buscar lugares: filtros + lista + mapa + "cerca de mí" | Todos |
| `/lugares/:id` | Ficha del lugar: fotos, datos, precios, horario, promociones, servicios, mapa, **Cómo llegar**, ♥ favorito | Todos (♥ pide sesión) |
| `/comparar?ids=a,b,c` | Comparar hasta 3 lugares en tabla | Todos |
| `/contacto` | Formulario de contacto | Todos |
| `/ingresar` | Iniciar sesión | Sin sesión |
| `/registro` | Crear cuenta | Sin sesión |
| `/recuperar` | Olvidé mi contraseña | Sin sesión |
| `/perfil` | Mi perfil: datos, favoritos, mi plan, mi progreso | Con sesión |
| `/perfil/editar` | Editar mis datos | Con sesión |
| `/nutricion` | Conectar con un nutricionista: explicación + botón empezar | Todos (empezar pide sesión) |
| `/nutricion/nueva` | Formulario de medidas, objetivo, foto opcional, consentimiento | Con sesión |
| `/nutricion/:id` | Resultado: guía automática + plan del nutricionista (si ya respondió) | Dueño, nutricionista, admin |
| `/admin` | Panel: resumen | admin |
| `/admin/lugares` y `/admin/lugares/:id` | Lista y edición de lugares | admin |
| `/admin/nutricion` y `/admin/nutricion/:id` | Solicitudes y respuesta del nutricionista | nutricionista, admin |
| `/admin/mensajes` | Mensajes de contacto | admin |
| `/admin/usuarios` | Cuentas y cambio de rol | admin |
| `*` | Página no encontrada con botón "Ir al inicio" | Todos |

Si alguien sin permiso entra a una ruta protegida: sin sesión → va a `/ingresar` y, al entrar, vuelve a donde quería ir; con sesión pero sin rol → página "No tienes acceso" con botón "Ir al inicio".

**Botones de la landing actual y a dónde van** (esta tabla también sirve para la evidencia):

| Botón / elemento | Acción | Destino | ¿Puede regresar? |
|---|---|---|---|
| Logo | Ir al inicio | `/` | — |
| Menú Inicio / Conócenos / Explorar deportes / Buscar lugares / Contacto | Navegar | `/`, `/conocenos`, `/deportes`, `/lugares`, `/contacto` | Sí (menú y Volver) |
| "Explorar actividades" (encabezado) | Navegar | `/deportes` | Sí |
| "Explorar lugares" (portada) | Navegar | `/lugares` | Sí |
| "Conoce más" (portada) | Navegar | `/conocenos` | Sí |
| Buscador "¿Cómo quieres moverte hoy?" → "Buscar lugares" | Lleva los filtros elegidos | `/lugares?nombre=…&sector=…&deporte=…&precio=…&horario=…` | Sí |
| Ícono de filtros (arriba a la derecha del buscador) | Abre/cierra filtros extra (cerca de mí, servicios) | Mismo lugar | — |
| Tarjeta de deporte (Gimnasios, Funcional, …) | Navegar | `/deportes/:slug` | Sí |
| Tarjeta de lugar → flecha | Navegar | `/lugares/:id` | Sí |
| "Enviar mensaje" (contacto) | Guarda el mensaje | Mensaje "¡Gracias! Te responderemos en 1–2 días hábiles" | Sí |
| Botón de cuenta (nuevo, en el encabezado) | Sin sesión: Ingresar. Con sesión: menú (Mi perfil, Nutrición, Panel si es admin/nutricionista, Salir) | `/ingresar`, `/perfil`, … | Sí |
| Enlaces del pie | Igual que el menú + Nutricionista | Varios | Sí |

**Textos falsos que hay que cambiar:** "Canal disponible al publicar" (contacto) → poner el correo real de contacto (lo da la persona dueña; ver §13). Quitar la etiqueta y el aviso "DEMO" cuando los lugares sean reales.

## 8. Datos que se guardan (tablas)

Explicadas en sencillo. Todas tienen `id` y fecha de creación.

**`profiles`** — los datos de cada cuenta (una fila por persona, ligada a la cuenta de Supabase Auth).
- nombre completo, fecha de nacimiento, sexo (opcional), teléfono (opcional), sector donde vive (opcional), objetivo (bajar de peso / ganar músculo / mantenerme / mejorar resistencia / bienestar), nivel de actividad, `role` (`usuario` por defecto).
- Se crea sola al registrarse (un "trigger" = regla automática de la base).

**`sports`** — las 8 categorías del Figma: Gimnasios, Funcional, Yoga, Baile, Natación, Boxeo, Deportes colectivos, Otras actividades (con `slug`, nombre, ícono e imagen).

**`sectors`** — zonas de Guayaquil para filtrar: Norte, Centro, Sur, Samborondón, Vía a la Costa, Urdesa, Kennedy, Alborada, Sauces, Ceibos, Vía a Daule, Durán (la lista final la puede ajustar el admin).

**`places`** — los lugares.
- nombre, descripción, dirección, sector, latitud, longitud, teléfono, WhatsApp, sitio web/Instagram, foto principal y galería.
- **precios**: `price_from` (número, en USD) y `price_note` (texto, ej. "Plan mensual $25, clase suelta $6").
- **horario**: por día (lunes a domingo, hora de abrir y cerrar) para poder filtrar "abierto en la mañana/tarde/noche".
- **promociones** (texto), **servicios** (lista: duchas, parqueo, entrenador personal, casilleros, clases grupales, piscina…).
- deportes que ofrece (relación con `sports`).
- `source`: `osm` (vino de OpenStreetMap) o `admin` (cargado a mano); `osm_id` para no duplicar.
- `published` (sí/no): solo se muestran los publicados; `verified_at`: cuándo el admin revisó los datos.

**`favorites`** — qué lugares guardó cada persona (persona + lugar).

**`progress_entries`** — el progreso: fecha, peso (kg), minutos de actividad, actividad realizada, nota corta. En Mi perfil se ve como lista y un gráfico sencillo de peso en el tiempo.

**`nutrition_requests`** — solicitudes al nutricionista.
- medidas: edad (se calcula de la fecha de nacimiento), sexo, altura (cm), peso (kg), cintura (cm, opcional), nivel de actividad, objetivo, restricciones o alergias (texto), condiciones de salud (texto, opcional).
- foto: ruta del archivo en la carpeta privada (opcional) + `consent_photo` (sí/no) + fecha del consentimiento.
- `ai_guide`: la guía automática (texto estructurado), `ai_status` (pendiente / lista / falló).
- `nutritionist_id`, `nutritionist_plan` (texto del profesional), `status` (enviada / guía lista / respondida por nutricionista).

**`contact_messages`** — mensajes del formulario de contacto (nombre, correo, asunto, mensaje, leído sí/no).

**Fotos (Storage):**
- `body-photos` → **privada**. Cada persona solo sube y ve sus fotos; nutricionista y admin pueden verlas. Se muestran con enlaces temporales.
- `place-photos` → pública (fotos de lugares).

## 9. Funciones, una por una

### 9.1 Buscar lugares (`/lugares`)
- Filtros: nombre (texto), sector, deporte, precio (hasta $20 / $20–$40 / más de $40 / gratis), horario (mañana 5–12, tarde 12–18, noche 18–23), servicios.
- **Cerca de mí:** botón que pide la ubicación al navegador. Si la persona acepta, los lugares se ordenan por distancia y se muestra "a 1,2 km". Si no acepta, se le sugiere elegir un sector. (La distancia se calcula en la página con la fórmula de distancia entre dos puntos; no cuesta nada.)
- Vista **lista** y vista **mapa** (Leaflet), con un interruptor.
- Los filtros quedan en la dirección (`?sector=norte…`) para que el botón Volver los respete.
- Casilla "Comparar" en cada tarjeta (máx. 3) → botón "Comparar (2)" lleva a `/comparar`.
- Sin resultados: mensaje "No encontramos lugares con esos filtros" + botón "Quitar filtros".

### 9.2 Ficha del lugar (`/lugares/:id`)
- Foto, nombre, deportes, sector, dirección, calificación (no se usa calificación inventada: si no hay, no se muestra).
- Precios, horario de la semana con "Abierto ahora / Cerrado", promociones, servicios, teléfono/WhatsApp/redes.
- **Mapa** con el punto del lugar.
- **Botón "Cómo llegar"** → abre en pestaña nueva `https://www.google.com/maps/dir/?api=1&destination=LAT,LNG` (Google Maps pide la ubicación y traza la ruta; en celular abre la app). Segundo botón "Ver en OpenStreetMap".
- ♥ **Guardar en favoritos** (sin sesión → lleva a ingresar y vuelve).
- Aviso pequeño: "Datos verificados el DD/MM/AAAA. Confirma precios con el lugar."

### 9.3 Comparar (`/comparar`)
Tabla con 2–3 lugares lado a lado: precio desde, horario, sector, distancia (si hay ubicación), servicios (✓/✗), promociones. Botón para quitar un lugar y "← Volver a la búsqueda".

### 9.4 Cuenta y perfil
- **Registro:** nombre, correo, contraseña (mín. 8), fecha de nacimiento, aceptar términos y aviso de privacidad. **Hay que tener 16 años o más** para registrarse.
- **Ingresar / Salir / Olvidé mi contraseña** (Supabase envía el correo, gratis).
- **Mi perfil (`/perfil`)** con pestañas:
  - *Mis datos* (con botón Editar).
  - *Mis favoritos* (tarjetas de lugares).
  - *Mi plan* (la última guía nutricional y el plan del nutricionista; botón "Nueva solicitud").
  - *Mi progreso* (agregar registro: fecha, peso, minutos, actividad; lista y gráfico de peso).
- Borrar mi cuenta: botón en Editar perfil que borra la cuenta y sus datos y fotos (se confirma antes).

### 9.5 Nutricionista (`/nutricion`)
1. Página de explicación: qué recibe, que es **orientativo**, que **no reemplaza una consulta médica**, y que un nutricionista puede revisar su caso. Botón "Empezar" (pide sesión).
2. Formulario `/nutricion/nueva` en pasos: medidas → objetivo y hábitos → foto (opcional) → confirmar.
   - Foto: solo JPG/PNG/WebP, máximo 5 MB; casilla obligatoria "Acepto que mi foto se use solo para esta guía y la vea un nutricionista". Sin foto también funciona.
   - **La foto solo se permite a mayores de 18.** Entre 16 y 17 años se puede pedir la guía, pero sin foto.
3. Al enviar: se guarda la solicitud y se llama a la Edge Function `analizar-nutricion`, que:
   - lee las medidas (y la foto si hay) y calcula IMC y necesidades aproximadas de energía con fórmulas estándar (Mifflin-St Jeor);
   - pide a la IA de Groq (modelo gratis **con visión**) una guía en español con: resumen, recomendaciones de alimentación, ejemplo de menú de un día con comida local, hidratación, actividad física sugerida (con deportes que existan en la página) y señales para consultar a un profesional;
   - **reglas de seguridad para la IA:** no diagnosticar, no dar calorías por debajo de 1.200 (mujeres) / 1.500 (hombres), no recomendar suplementos ni medicamentos, no comentar el cuerpo de forma negativa; si hay condiciones de salud declaradas, recomendar ver a un profesional;
   - guarda la guía en `ai_guide`. Si la IA falla o se acaba el cupo gratis, la solicitud queda "Esperando al nutricionista" (no se pierde).
4. Resultado `/nutricion/:id`: la guía automática y, cuando responda, el **plan del nutricionista** (destacado). Botones: "Ver lugares recomendados para mi objetivo" (lleva a `/lugares` con el deporte sugerido) y "Volver a mi perfil".
5. Panel del nutricionista: lista de solicitudes (nuevas primero), ve medidas, foto y guía automática, y escribe su plan. Al guardar, la persona lo ve en "Mi plan".

### 9.6 Contacto
El formulario guarda el mensaje en `contact_messages` y muestra "¡Gracias!". El admin los lee en `/admin/mensajes`. (No se envían correos: así sigue siendo gratis.) Protección básica contra spam: un campo oculto y máximo 5 mensajes por hora por correo.

### 9.7 Panel de administración
- **Lugares:** lista con búsqueda; crear, editar (todos los campos de §8), publicar/ocultar, subir foto; marcar "verificado hoy".
- **Importar desde OpenStreetMap:** un script (programa que se corre una vez desde la computadora) descarga los lugares deportivos de Guayaquil (gimnasios, centros deportivos, piscinas, canchas, estudios de yoga/baile, boxeo) y los guarda como **no publicados**. El admin revisa, completa precios y horarios, y publica.
- **Nutrición:** ver §9.5.
- **Mensajes:** leer y marcar como leído.
- **Usuarios:** lista, buscar por correo, cambiar rol (usuario / nutricionista / admin).

### 9.8 Contenido real para la entrega
- Mínimo **12 lugares reales publicados**, al menos uno por cada deporte, con precio y horario verificados (por teléfono, Instagram o visita). Los que no tengan precio confirmado dicen "Consultar precio".
- Las fotos de lugares deben ser propias, del lugar con permiso, o de bancos gratis (Unsplash/Pexels) indicadas como "foto referencial".
- Página Conócenos y textos del pie con información real del proyecto.

## 10. Diseño visual

- Se usa el código exportado de **Figma Make** como base si está disponible (`docs/diseno/figma-make/`). Si no, se rehace igual a las capturas de `docs/diseno/capturas/`.
- Páginas nuevas (login, perfil, nutrición, panel) siguen el mismo estilo: fondo claro `#f6f8fb` en contenido, encabezado azul marino, botones principales naranjas, botones secundarios con borde, etiquetas pequeñas en mayúsculas con espaciado (como "ENCUENTRA TU PRÓXIMO LUGAR").
- Se ve bien en celular (menú hamburguesa) y en computadora.
- Cada estado tiene su pantalla: **cargando**, **vacío**, **error** (con botón "Reintentar") y **éxito**.

## 11. Seguridad y privacidad (lo mínimo bien hecho)

- RLS activado en **todas** las tablas.
- La clave secreta de Supabase y la de Groq **nunca** van en la página; solo en Supabase (secrets). En la página solo va la clave pública "anon" (es normal y segura con RLS).
- Fotos de cuerpo en carpeta privada; enlaces temporales de 10 minutos.
- Página **Privacidad y términos** (`/privacidad`): qué datos se guardan, para qué, quién los ve, cómo borrarlos.
- Aviso fijo en la sección de nutrición: "Orientación general. No reemplaza a un profesional de la salud."

## 12. Publicación y puesta en marcha

1. La persona dueña crea (gratis, sin tarjeta) un proyecto en **Supabase** y una clave en **Groq**.
2. Se cargan las tablas y reglas con los archivos SQL del proyecto (`supabase/migrations/`).
3. Se cargan los secretos: `GROQ_API_KEY` en Supabase; `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` para la página.
4. Se marca la primera cuenta como `admin` (una línea SQL en Supabase).
5. Se publica la página en **Cloudflare Workers** (sitio estático con `wrangler deploy`; todas las rutas sirven `index.html` para que React Router funcione al recargar).
6. Dirección: la gratuita de Cloudflare (`activa-gye.<cuenta>.workers.dev`) salvo que tengan dominio.

## 13. Lo que solo puede decidir/entregar la persona dueña

- El **logo** en buena calidad (PNG/SVG).
- El **código exportado de Figma Make** (si se puede), en `docs/diseno/figma-make/`.
- El **correo de contacto** real para la página.
- Quién será la cuenta **nutricionista** (correo) para las pruebas y el video.
- Los **datos verificados** de los lugares (precios, horarios, promociones), o al menos de los 12 de la entrega.

## 14. Evidencia para la entrega (Fase 5)

El trabajo deja listos, en `docs/entrega/`:
- **Tabla de observaciones** (observación del profesor → corrección → evidencia), empezando por "Cómo llegar" y "Cuenta con mis datos".
- **Lista de prueba de botones** (botón → acción → destino → ¿regresa?), marcada al probar.
- **Guion del video**: Inicio → buscar → ficha del lugar → Cómo llegar → registrarse → Mi perfil → nutricionista → resultado → volver.
- **Lista de capturas** a tomar (código, configuración de Supabase, pantallas, estados, errores).
- **Pendientes y próximos pasos** para la siguiente fase.

## 15. Decisiones tomadas sin la dueña (noche del 21/11, para revisar)

La dueña pidió que se trabaje toda la noche sin preguntas. Estas decisiones las tomó Claude; se pueden cambiar mañana.

1. **No hay código exportado de Figma Make todavía** → la landing se rehace igual a las capturas. Si mañana llega el código, se compara y se ajusta.
2. **Orden de prioridad** (lo primero siempre debe quedar navegable para la entrega):
   1) Observaciones del profesor: **Cómo llegar** + **cuenta / Mi perfil / progreso**; navegación completa sin pantallas muertas; lugares reales.
   2) Nutricionista (guía automática + respuesta del profesional).
   3) Panel de administración.
   4) Comparar, borrar cuenta, gráfico de progreso.
3. **Correos:** se **desactiva la confirmación por correo** al registrarse (la cuenta queda activa al instante). "Olvidé mi contraseña" usa el correo de Supabase, que en el plan gratis es limitado: queda como **pendiente** para la siguiente fase (configurar un SMTP gratuito).
4. **La foto sí se envía a la IA de Groq** para la guía. El consentimiento y `/privacidad` lo dicen claramente: "tu foto se envía de forma privada a un servicio de IA (Groq) solo para generar tu guía; la ve además el nutricionista".
5. **Cuentas:** esta noche todo se construye y prueba con **Supabase local** (Docker, sin cuenta). La dueña crea mañana el proyecto Supabase, la clave de Groq y publica en Cloudflare Workers con su cuenta (pasos en `docs/entrega/PUESTA-EN-MARCHA.md`). Sin `GROQ_API_KEY`, la función devuelve una **guía básica calculada** (IMC + necesidades aproximadas + recomendaciones fijas por objetivo), marcada como "guía básica".
6. **Lugares:** se publican los lugares **reales de OpenStreetMap** con "Consultar precio" y "Horario por confirmar" y la etiqueta "Datos de OpenStreetMap". No son inventados. El filtro de horario solo muestra los que tienen horario cargado. Los 6 lugares DEMO se eliminan.
7. **Solicitudes de nutrición:** todos los nutricionistas ven todas; el primero que pulsa **"Tomar solicitud"** queda asignado (`nutritionist_id`) y solo él (o un admin) puede responder.

## 16. Qué queda a criterio de quien construye

- Nombres exactos de archivos y componentes, librerías menores (íconos: `lucide-react`; gráfico: el más liviano que sirva).
- Textos de ayuda y mensajes de error (en español claro).
- El modelo de visión de Groq vigente y gratis al momento de construir.
- Orden y reparto del trabajo entre agentes (lo define el plan de implementación).

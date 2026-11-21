# Activa GYE

Plataforma para **encontrar dónde hacer deporte en Guayaquil** y **conectar pacientes con nutricionistas**. Funciona como intermediaria, al estilo Uber: el paciente pide atención y un nutricionista la acepta y lo acompaña. No hay IA ni asistente automático: atienden personas.

Proyecto de clase (Fase 5).

- **Página publicada:** https://activa-gye.agentpulqora.workers.dev
- **Código:** https://github.com/kercmari/activa-gye

---

## Estado actual (en palabras sencillas)

| Parte | ¿Está hecha? | Detalle |
|---|---|---|
| **Frontend** (lo que ve el usuario) | ✅ Sí, completo y publicado | Todas las pantallas, botones y rutas funcionan. |
| **Datos** | ✅ Simulados en el navegador | Cuentas, perfil, favoritos, progreso y solicitudes al nutricionista se guardan en el navegador de cada persona (`localStorage`). Si cambias de navegador o borras los datos, se pierden. |
| **Lugares** | ✅ Reales | 300 lugares deportivos reales de Guayaquil tomados de **OpenStreetMap**. Precio y horario dicen «Consultar» cuando no hay dato confirmado. |
| **Backend** (base de datos real) | 🟡 Diseñado, **todavía no conectado** | El esquema de la base de datos está escrito y probado en local (`supabase/migrations/`), pero la página publicada aún no lo usa. |
| **Nutricionistas** | 🟡 En construcción | Plataforma intermediaria: el paciente llena su ficha y pide atención; un nutricionista la acepta, arma su calendario y le da seguimiento. Se entrega en 3 fases (ver abajo). |

### ¿Hay conexión con Google para ver las ubicaciones?

- **El mapa no es de Google:** es de **OpenStreetMap**, con la librería Leaflet. Es gratis y no necesita clave.
- **El botón «Cómo llegar» sí abre Google Maps** con la ruta hasta el lugar (en el celular abre la app). Usa un enlace público de Google que **no necesita clave ni API**, así que es gratis y ya funciona.
- **La API de Google Places no se usa:** pide tarjeta de crédito y es de pago, y el proyecto debía ser 100 % gratis. Por eso los lugares vienen de OpenStreetMap.
- **«Cerca de mí»** usa la ubicación del propio navegador (el permiso de ubicación del teléfono o la computadora). Tampoco usa Google.

---

## Qué puede hacer el usuario

- Buscar lugares por **deporte, sector, precio y servicios**, o **cerca de mí**.
- Ver la ficha del lugar con mapa, horario, precios y el botón **Cómo llegar** (observación 1 del profesor).
- **Comparar** hasta 3 lugares lado a lado.
- **Crear cuenta** y tener **Mi perfil** con sus datos, favoritos, su plan y su **progreso** (peso, medidas y notas por fecha) (observación 2 del profesor).
- **Nutricionista:** el paciente llena su ficha (datos y foto de cuerpo entero, solo mayores de 18 y con permiso) y pide atención; un nutricionista la acepta.
- **Panel de administración:** el administrador gestiona lugares, mensajes de contacto y roles de usuarios; el nutricionista toma y responde solicitudes.

Las cuentas de prueba (que solo existen en el simulador) están en [`docs/entrega/CUENTAS-DE-PRUEBA.md`](docs/entrega/CUENTAS-DE-PRUEBA.md).

---

## Herramientas usadas (todas gratis)

### Frontend
| Herramienta | Para qué |
|---|---|
| **React 19** | Construir las pantallas. |
| **TypeScript** | JavaScript con tipos, para tener menos errores. |
| **Vite 8** | Arrancar el proyecto en desarrollo y generar la versión final (`dist/`). |
| **Tailwind CSS v4** | Estilos y colores de la marca. |
| **React Router v8** | Navegar entre páginas (`/lugares`, `/perfil`, etc.). |
| **Leaflet + React Leaflet** | El mapa interactivo. |
| **Lucide React** | Íconos. |
| **Manrope** (Google Fonts) | Tipo de letra. |

### Datos y mapas
| Herramienta | Para qué |
|---|---|
| **OpenStreetMap + Overpass API** | Lugares deportivos reales y el fondo del mapa (`scripts/import-osm.mjs`). |
| **Enlace de Google Maps** (sin API) | El botón «Cómo llegar». |
| **Geolocalización del navegador** | «Cerca de mí». |
| **localStorage** (simulador) | Guardar cuentas y datos mientras no hay backend. |

### Backend (preparado, falta conectarlo)
| Herramienta | Para qué |
|---|---|
| **Supabase** (plan gratis) | Base de datos PostgreSQL, inicio de sesión, permisos (RLS) y guardado de fotos. |
| **Supabase CLI** | Levantar la base en local con Docker (`npx supabase start`). |
| **Brevo** (plan gratis) | Correos de aviso y de recuperar contraseña (fase 3). |

### Pruebas y calidad
| Herramienta | Para qué |
|---|---|
| **Vitest + Testing Library + jsdom** | 94 pruebas unitarias. |
| **Playwright** | 29 pruebas de navegación real (computadora y celular). |
| **Oxlint** | Revisar el código. |
| **CodeRabbit** | Revisión automática de *pull requests* con IA (`.coderabbit.yaml`). |

### Publicación
| Herramienta | Para qué |
|---|---|
| **Cloudflare Workers** (plan gratis) | Hospedar la página (`wrangler.jsonc`). |
| **Wrangler** | Publicar con `npx wrangler deploy`. |
| **GitHub** | Guardar el código. |

### Cómo se construyó
El diseño y el plan se hicieron con **Claude Code**. Las pantallas las programaron agentes de IA (**Claude Haiku**) trabajando en paralelo, y las revisiones las hizo **Claude Opus**. Diseño: [`docs/superpowers/specs/`](docs/superpowers/specs/); plan: [`docs/superpowers/plans/`](docs/superpowers/plans/).

---

## Cómo correrlo en tu computadora

Necesitas **Node.js 20 o más nuevo**.

```bash
npm install          # instala todo (una sola vez)
npm run dev          # abre la página en http://localhost:5173
```

Otros comandos:

```bash
npm run build        # genera la versión final en dist/
npm test             # pruebas unitarias
npm run e2e          # pruebas de navegación (Playwright)
npm run lint         # revisa el código
npx wrangler deploy  # publica en Cloudflare (necesita sesión de wrangler)
```

Base de datos en local (opcional, necesita Docker):

```bash
npx supabase start   # levanta la base y aplica supabase/migrations/
npx supabase stop    # la apaga
```

---

## Cómo está organizado

```
src/
  pages/          pantallas (inicio, lugares, perfil, nutrición, admin…)
  components/     piezas reutilizables (encabezado, tarjetas, mapa, formularios)
  data/types.ts   el «contrato» de datos: lo que la página puede pedir
  data/mock/      el simulador que cumple ese contrato hoy
  auth/           sesión y protección de páginas por rol
  lib/            utilidades (Cómo llegar, horarios, distancia, guía nutricional)
supabase/         esquema de la base de datos real
e2e/              pruebas de navegación
docs/entrega/     evidencia para el PDF (observaciones, capturas, guion del video)
```

**Para conectar el backend** solo hay que crear `src/data/supabase/` cumpliendo el mismo contrato (`src/data/types.ts`) y cambiar una línea en `src/data/index.ts`. Las pantallas no cambian.

---

## Entrega por fases

La plataforma se entrega en **3 fases**. Todas se construyen, pero cada una se activa con un check en la base de datos (**Admin → Fases**):

| Fase | Qué incluye |
|---|---|
| **1. Ingreso y ficha** | Registro e ingreso reales; panel del paciente con su ficha inicial (nombre, edad, género, peso, estatura, foto de cuerpo entero). Cupo limitado de pacientes. |
| **2. Nutricionista** | Solicitudes (el primer nutricionista que acepta atiende), notificaciones, tablero, ficha de seguimiento, calendario que el paciente marca como cumplido, suscripción del nutricionista y facturas con pago por transferencia. |
| **3. Para todos** | Registro abierto, precios y horarios completos de los lugares, calificaciones y reseñas, reporte de progreso en PDF y correos de aviso. |

Detalle: [`docs/superpowers/specs/2026-11-21-activa-gye-fases-backend-design.md`](docs/superpowers/specs/2026-11-21-activa-gye-fases-backend-design.md).

## Próximos pasos

1. Crear el proyecto gratis en Supabase y conectar los datos reales (las cuentas ya no se perderán al cambiar de navegador).
2. Panel del nutricionista: solicitudes, notificaciones, seguimiento, calendario y suscripción.
3. Correo real de recuperación de contraseña.
4. Confirmar precios y horarios de los lugares principales.

Detalle en [`docs/entrega/PENDIENTES-Y-PROXIMOS-PASOS.md`](docs/entrega/PENDIENTES-Y-PROXIMOS-PASOS.md).

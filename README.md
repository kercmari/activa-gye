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
| **Datos** | ✅ Con base real cuando está conectada | Con Supabase conectado, las cuentas, fichas, fotos, calendarios y pagos se guardan en la base de datos: no se pierden al cambiar de navegador. Sin la conexión (modo de prueba), todo se guarda en el navegador (`localStorage`). |
| **Lugares** | ✅ Reales | 300 lugares deportivos reales de Guayaquil tomados de **OpenStreetMap**. Precio y horario dicen «Consultar» cuando no hay dato confirmado. |
| **Backend** (base de datos real) | ✅ Supabase: Auth, Postgres con reglas de seguridad (RLS), fotos en Storage | El esquema está en `supabase/migrations/` y se prueba en local. Cómo publicarlo con una base en la nube: [`docs/entrega/PUESTA-EN-MARCHA.md`](docs/entrega/PUESTA-EN-MARCHA.md). |
| **Nutricionistas** | ✅ Construido por fases | El paciente llena su ficha y pide atención; un nutricionista la acepta, arma su calendario y le da seguimiento. Cada fase se enciende desde **Admin → Fases** (ver abajo). Pendientes: [`docs/entrega/PENDIENTES-Y-PROXIMOS-PASOS.md`](docs/entrega/PENDIENTES-Y-PROXIMOS-PASOS.md). |

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

Las cuentas de prueba (solo para la base local) están en [`docs/entrega/CUENTAS-DE-PRUEBA.md`](docs/entrega/CUENTAS-DE-PRUEBA.md).

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
| **localStorage** (modo de prueba) | Guardar cuentas y datos cuando no hay Supabase configurado. |

### Backend
| Herramienta | Para qué |
|---|---|
| **Supabase Auth** | Registro e ingreso con correo y contraseña. |
| **Supabase Postgres + RLS** | Base de datos PostgreSQL y permisos por fila (un paciente no ve los datos de otro). |
| **Supabase Storage** | Guardar fotos: la de cuerpo entero es privada; la de los lugares es pública. |
| **Supabase Edge Functions** | Previsto para los correos (fase 3); todavía no está escrito. |
| **Supabase CLI** | Levantar la base en local con Docker (`npx supabase start`). |
| **Brevo** (plan gratis) | Correos de aviso y de recuperar contraseña (fase 3). Pendiente de conectar. |

### Pruebas y calidad
| Herramienta | Para qué |
|---|---|
| **Vitest + Testing Library + jsdom** | Pruebas unitarias de pantallas, datos y reglas. |
| **Playwright** | Pruebas de navegación real (computadora y celular). |
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
cp .env.example .env.local   # luego pon ahí la URL y la clave anon que muestra «npx supabase start»
npx supabase start           # levanta la base y aplica supabase/migrations/
npx supabase db reset        # vuelve a crear la base y carga lugares y cuentas de prueba locales
npx supabase stop            # la apaga
```

Sin `.env.local`, la página funciona en modo de prueba (datos en el navegador). Las cuentas de prueba están en [`docs/entrega/CUENTAS-DE-PRUEBA.md`](docs/entrega/CUENTAS-DE-PRUEBA.md). Para publicar con una base en la nube, sigue [`docs/entrega/PUESTA-EN-MARCHA.md`](docs/entrega/PUESTA-EN-MARCHA.md).

---

## Cómo está organizado

```
src/
  pages/          pantallas (inicio, lugares, perfil, nutrición, admin…)
  components/     piezas reutilizables (encabezado, tarjetas, mapa, formularios)
  data/types.ts   el «contrato» de datos: lo que la página puede pedir
  data/mock/      el modo de prueba (sin Supabase) que cumple ese contrato
  auth/           sesión y protección de páginas por rol
  lib/            utilidades (Cómo llegar, horarios, distancia, guía nutricional)
supabase/         esquema de la base de datos real
e2e/              pruebas de navegación
docs/entrega/     evidencia para el PDF (observaciones, capturas, guion del video)
```

`src/data/supabase/` es la conexión con Supabase: cumple el mismo contrato (`src/data/types.ts`) que el modo de prueba (`src/data/mock/`). `src/data/index.ts` elige una u otra: Supabase si hay `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`. Las pantallas no cambian.

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

1. Crear el proyecto en Supabase (São Paulo) y publicar con la base real: [`docs/entrega/PUESTA-EN-MARCHA.md`](docs/entrega/PUESTA-EN-MARCHA.md).
2. Correos de aviso y recuperación de contraseña (función de correo con Brevo).
3. Confirmar precios y horarios de los lugares principales.

Detalle en [`docs/entrega/PENDIENTES-Y-PROXIMOS-PASOS.md`](docs/entrega/PENDIENTES-Y-PROXIMOS-PASOS.md).

# XU2b — IMPLEMENTADOR (haiku) — Desbordes a 360 px y e2e rojas
**Reporte:** `work/out/XU2b/report.md` (qué hiciste, archivos, gates con números, «Pedidos al orquestador», pendientes).
**Commits:** empiezan con `XU2b: `.
**Proyecto:** Activa GYE, plataforma de **seguimiento nutricional** intermediaria (tipo Uber), sin IA. Al llenar su ficha, el paciente recibe **gratis 7 días** de comidas y rutinas sacados de **plantillas de nutricionista** guardadas en la base (elegidas por IMC, edad, género y objetivo). Los días **se abren uno a uno con el progreso diario** (chequeo + mitad de los ítems → el siguiente se abre mañana). Desde el día 8 hay que **suscribirse**. La interfaz copia el concepto de **Base Vital** (Hoy · Progreso · Agenda · Guía con barra inferior). Ya existe y NO se rompe: buscador de lugares, ficha, solicitudes, nutricionista, pagos manuales, reseñas, fases.
**Lee primero:** `work/TOKEN-PROTOCOL.md` (reglas y gates, obligatorio); `docs/superpowers/specs/2026-11-21-semana-gratis-design.md` (todo); `docs/superpowers/plans/2026-11-21-db-contrato-semana.md` (nombres exactos de tablas y funciones: NO inventes otros); `src/data/types.ts`, sección «SEMANA GRATIS» y los métodos nuevos al final de `Repo` (el contrato: NO lo cambies).
**Referencia visual (solo lectura, NO se importa ni se copia la carpeta):** `work/ref-base-vital/` tiene las pantallas originales de Base Vital (React 18 + CSS propio). Tradúcelas a React 19 + Tailwind con los colores de Activa GYE; textos en español; sin voz, sin 3D, sin IA.
**Convenciones fijas:**
- Stack: React 19 + TypeScript + Vite + Tailwind v4 + `react-router` v8 (importa SIEMPRE desde `'react-router'`). Íconos `lucide-react`. **No hay recharts**: gráficos con SVG propio o `src/components/profile/WeightChart`. Tests: Vitest + Testing Library (jsdom, `src/test/setup.ts`), con `vi.mock` del repo.
- Datos: SOLO con `import { repo } from '<ruta>/data'`. Sesión: `useAuth()` de `src/auth/AuthContext`. Fases: `usePhase(n)` de `src/auth/SettingsContext` y `src/components/PhaseGate.tsx`.
- UI reutilizable: `src/components/ui/` (`Button`, `LinkButton`, `BackButton`, `PageHeader`, `States` → `Loading`, `EmptyState`, `ErrorState`, `errorMessage`; `Field` → `TextField`, `SelectField`, `TextArea`; `Badge`), `src/components/profile/` (`ConfirmDialog`, `WeightChart`, `useAsync`), `src/components/admin/AdminShell.tsx`, `src/components/panel/PagosTab.tsx` (facturas y reporte de transferencia). Míralos antes de crear algo parecido.
- Estilo: el de las páginas existentes (`bg-navy-900`, `text-navy-900`, `bg-brand-orange`, `text-brand-orange`, `bg-surface`, tarjetas `rounded-[1.75rem] bg-white shadow-xl shadow-navy-900/5`, `.display`, `.eyebrow`, `mx-auto max-w-6xl px-4`). Bien a 360 px y a 1280 px.
- Cada carga: cargando (`role="status"`), vacío (mensaje + acción), error (mensaje + «Reintentar»). **Ningún botón sin acción ni pantalla sin salida.**
- Textos en español de Ecuador. Errores con `errorMessage(e)`; agrega a mano mensajes claros para `REQUIERE_NUTRICIONISTA`, `SIN_PLANTILLA`, `FALTA_FICHA`, `SIN_SUSCRIPCION` donde apliquen. Sin datos inventados presentados como reales: si la plantilla es `borrador`, muestra «Plan de muestra pendiente de revisión por una nutricionista».
- Marcadores (`Pending`) de tu tarea: reemplázalos por completo.
- **Commits sin la línea `Co-Authored-By`** (regla de la dueña). No cambies el autor.


**Archivos que son tuyos (solo estos):** `src/components/Header.tsx` (o el componente del encabezado con sesión), `src/pages/admin/AdminPagosPage.tsx` y los componentes que use para la tabla, sus tests, y los archivos `e2e/*.spec.ts` que fallen SOLO si la prueba está mal (no la app). NO toques `supabase/`, ni `src/pages/plan/SuscribirmePage.tsx`.

## Qué construir
Lee `work/out/HALLAZGOS-R2.md`, hallazgos **H4**, **H5** y **H7**, y `work/out/E2E-R2.txt` (resultado de la suite completa medido por el orquestador). No hagas `db reset`.
- **H4:** con sesión, a 360 px el encabezado desborda ~9 px (campana + avatar + menú). Que quepa sin scroll horizontal (achica gap/padding, oculta el nombre largo, `min-w-0` + `truncate`).
- **H5:** `/admin/pagos` a 360 px desborda ~392 px. La tabla va dentro de `overflow-x-auto` o se vuelve tarjetas en móvil; la página no debe tener scroll horizontal.
- **H7:** cada prueba roja de `work/out/E2E-R2.txt`: si el fallo es de la app, arréglalo en la app (dentro de tus archivos; si cae fuera, anótalo en «Pedidos al orquestador»); si es de la prueba (selector frágil, espera corta, dato de otra prueba), arregla la prueba sin debilitar lo que verifica.
- Para verificar: levanta TU preview en el puerto `$E2E_PORT` (`npm run -s build && npx vite preview --port $E2E_PORT --strictPort --host 127.0.0.1 &`) y corre SOLO las specs afectadas: `E2E_PORT=$E2E_PORT npx playwright test e2e/<archivo> --reporter=line`. Mata tu preview al terminar. **No** corras la suite completa.

## Tests obligatorios
- Vitest donde aplique. Para H4/H5 una prueba e2e chica (`e2e/desborde.spec.ts`, nuevo, tuyo) que a 360 px con sesión de admin abra `/` y `/admin/pagos` y verifique `document.documentElement.scrollWidth <= 360`.
- Las specs que estaban rojas en `E2E-R2.txt`, verdes (reporta cuáles).

**Tiempo:** máximo 20 minutos. Commit apenas algo funcione con gates verdes; luego sigue. Lo commiteado vale.
**Gates antes de cada commit:** `npm run -s lint` (0 errores), `npm run -s build` (exit 0), `npx vitest run` (verde). Reporta los números.

**Última línea del reporte:** `NEXT: la cadena sigue con la recomprobación R2.`

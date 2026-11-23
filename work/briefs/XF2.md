# XF2 — IMPLEMENTADOR (haiku) — Arreglos del front: nutricionista y admin; e2e rojas
**Reporte:** `work/out/XF2/report.md` (qué hiciste, archivos, gates con números, «Pedidos al orquestador», pendientes).
**Commits:** empiezan con `XF2: `.
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


**Archivos que son tuyos (solo estos):** `src/pages/admin/*`, `src/pages/nutri/*`, `src/components/admin/**` y `src/components/nutri/**` si existen, sus `*.test.tsx`, y `e2e/*.spec.ts` + `e2e/helpers.ts`. NO toques `supabase/`, `src/data/`, ni otros componentes compartidos (son de XF1).

## Qué construir
Lee `work/ref/CHECKLIST-FRONT.md`, `work/out/RF2/report.md`, `work/out/RF1/report.md` (por si algo cae en tus archivos) y la suite e2e más reciente (`ls -t work/out/E2E-*.txt | head -1`).
- Arregla TODOS los hallazgos **A** que caen en tus archivos; luego los **B** baratos (≤ 10 min en total). Cambia lo mínimo (mismas pautas: 44 px, `text-base` en campos, `overflow-x-auto` en tablas, etiquetas, errores junto al campo, estados vacíos). Lo que no es tuyo → «Pedidos al orquestador».
- **E2E rojas en la suite más reciente** (en `E2E-R5b.txt` eran `navegacion.spec.ts` «botones del Panel … actividades lleva al panel» y `fase1.spec.ts` «admin pone cupo …»; mira si siguen y si hay otras). Averigua la causa. Si la prueba quedó vieja tras mover el inicio a `/deportes` (ronda 5), actualiza la prueba sin debilitarla. Si choca con otras pruebas por la base compartida (cupo de 5 lleno por otro worker), hazla independiente: `test.describe.configure({ mode: 'serial' })` en ese archivo, datos propios con correo único, o restaurar el cupo en `afterEach`. Si el fallo es de la app y cae fuera de tus archivos, anótalo.
- Verifica SOLO tus specs con TU preview (`npm run -s build && (npx vite preview --port $E2E_PORT --strictPort --host 127.0.0.1 > /dev/null 2>&1 &)` y `E2E_PORT=$E2E_PORT npx playwright test e2e/navegacion.spec.ts e2e/fase1.spec.ts --reporter=line`); mata tu preview por PID. No corras la suite completa ni `db reset`.
- En el reporte, una tabla: hallazgo (S1, P4…) → arreglado / no tuyo / no reproducido, con archivo:línea.

## Tests obligatorios
- Los tests existentes siguen verdes; un test nuevo por cada cambio de comportamiento.
- `navegacion.spec.ts` y `fase1.spec.ts` verdes con tu preview (pega el resumen en el reporte).

**Tiempo:** máximo 20 minutos. Commit apenas algo funcione con gates verdes; luego sigue. Lo commiteado vale.
**Gates antes de cada commit:** `npm run -s lint` (0 errores), `npm run -s build` (exit 0), `npx vitest run` (verde). Reporta los números.

**Última línea del reporte:** `NEXT: la cadena sigue con la re-revisión RF3.`

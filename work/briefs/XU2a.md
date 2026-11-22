# XU2a — IMPLEMENTADOR (haiku) — Pantalla de suscripción: fecha y suscripción vencida
**Reporte:** `work/out/XU2a/report.md` (qué hiciste, archivos, gates con números, «Pedidos al orquestador», pendientes).
**Commits:** empiezan con `XU2a: `.
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


**Archivos que son tuyos (solo estos):** `src/pages/plan/SuscribirmePage.tsx`, su test (`*.test.tsx` junto a la página o en `src/pages/plan/`), y `src/components/profile/labels.ts` SOLO para agregar una función nueva (no cambies las existentes). NO toques `supabase/`.

## Qué construir
Lee `work/out/HALLAZGOS-R2.md`, hallazgos **H2** y **H3**. No hagas `db reset`.
- **H3 «Invalid Date»:** `formatDateLong` espera `YYYY-MM-DD`, pero `current_period_end` (y otros `timestamptz`) llega como `2026-12-21T15:00:00+00:00`. Agrega en `labels.ts` `formatDateTimeLong(iso)` que acepte timestamp completo (usa `new Date(iso)` y zona `America/Guayaquil`) y úsala en toda fecha de tipo timestamp de esta página. Busca con `grep -rn "formatDateLong(.*\(period_end\|_at\)" src/` otros usos con timestamp y corrígelos también si están en `src/pages/plan/` (anota el resto en «Pedidos al orquestador»).
- **H2 suscripción vencida:** trata como activa SOLO si `status === 'activa'` y `current_period_end` es futuro. Con `status === 'vencida'` (lo devuelve la base tras XT2) o `activa` con fecha pasada: aviso «Tu suscripción venció el <fecha>» + la lista de planes con «Suscribirme» (el mismo componente de planes que ya usa la página para quien no tiene suscripción). Agrega `'vencida'` al tipo de estado si el tipo no lo admite (en `src/data/types.ts` SOLO ampliar esa unión; no toques nada más del contrato).

## Tests obligatorios
- Vitest: suscripción activa vigente → «activa hasta el …» con fecha legible (no «Invalid Date»); `vencida` → aviso de vencida + botón «Suscribirme» que llama `repo.choosePatientPlan`; `activa` con fecha pasada → mismo aviso de vencida; prueba de `formatDateTimeLong` con `'2026-12-21T15:00:00+00:00'`.

**Tiempo:** máximo 20 minutos. Commit apenas algo funcione con gates verdes; luego sigue. Lo commiteado vale.
**Gates antes de cada commit:** `npm run -s lint` (0 errores), `npm run -s build` (exit 0), `npx vitest run` (verde). Reporta los números.

**Última línea del reporte:** `NEXT: la cadena sigue con la recomprobación R2.`

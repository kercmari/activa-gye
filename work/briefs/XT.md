# XT — IMPLEMENTADOR (haiku) — Arreglos de la revisión: seguridad y datos
**Reporte:** `work/out/XT/report.md` (qué hiciste, archivos, gates con números, «Pedidos al orquestador», pendientes).
**Commits:** empiezan con `XT: `.
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

**Reglas SQL:**
- Solo tus archivos SQL (nombres exactos del contrato). Nunca edites migraciones anteriores.
- Sigue `docs/superpowers/plans/2026-11-21-db-contrato-semana.md` al pie de la letra. Si algo no cuadra, anótalo en «Pedidos al orquestador».
- **Tienes la base local para ti solo en esta ronda:** `npx supabase db reset` (migraciones + `supabase/seed.sql`) y `npx supabase test db`. NUNCA `supabase start/stop`, NUNCA `db push`, NUNCA `link`.
- pgTAP: `begin; select plan(n); … select * from finish(); rollback;`. Para actuar como usuario: crea usuarios con `insert into auth.users(id, email, raw_user_meta_data, …)` y luego `set local role authenticated; select set_config('request.jwt.claims', json_build_object('sub', '<uuid>', 'role', 'authenticated')::text, true);`. `reset role;` para preparar datos. Mira `supabase/tests/0*.sql` para copiar el patrón exacto.
- Gates: `db reset` sin errores + `test db` verde + lint/build/vitest.

**Archivos que son tuyos (solo estos):** Los archivos que señalen los BLOCKING/HOTFIX con área `[sql]` o `[datos]` (una migración NUEVA `supabase/migrations/20261121000008_arreglos_semana.sql` si hace falta SQL: nunca edites una migración ya aplicada; tests en `supabase/tests/07_arreglos_semana.sql`).

## Qué construir
Lee `work/out/RT/report.md` y `work/out/RU/report.md`. Arregla TODOS los HOTFIX y BLOCKING de áreas `[sql]` y `[datos]`, cada uno con su test (pgTAP o Vitest).

## Tests obligatorios
- Un test por hallazgo arreglado, con el nombre del hallazgo.

**Tiempo:** máximo 20 minutos. Commit apenas algo funcione con gates verdes; luego sigue. Lo commiteado vale.
**Gates antes de cada commit:** `npm run -s lint` (0 errores), `npm run -s build` (exit 0), `npx vitest run` (verde). Reporta los números.

**Última línea del reporte:** `NEXT: la cadena sigue con la recomprobación RTb/RUb.`

# XS — IMPLEMENTADOR (haiku) — Arreglos de la revisión: seguridad y datos
**Reporte:** `work/out/XS/report.md` (qué hiciste, archivos, gates con números, «Pedidos al orquestador», pendientes).
**Commits:** empiezan con `XS: `.
**Proyecto:** Activa GYE. Plataforma intermediaria tipo Uber: el **paciente** llena su ficha y pide atención; un **nutricionista** la acepta y lo acompaña (calendario, seguimiento, facturas). Sin IA. Además, buscador de lugares deportivos de Guayaquil (ya hecho, no lo rompas). Se entrega en **3 fases** que se encienden en la base (`app_settings`).
**Lee primero:** `work/TOKEN-PROTOCOL.md` (reglas y gates, obligatorio); `docs/superpowers/specs/2026-11-21-activa-gye-fases-backend-design.md` (qué es cada fase, §2, §7, §8); `docs/superpowers/plans/2026-11-21-activa-gye-backend-fases.md` (quién hace qué); `src/data/types.ts` (contrato `Repo`: NO lo cambies); `docs/superpowers/plans/2026-11-21-db-contrato.md` (nombres exactos de tablas y funciones: NO inventes otros).
**Convenciones fijas:**
- Stack: React 19 + TypeScript + Vite + Tailwind v4 + `react-router` v8 (importa SIEMPRE desde `'react-router'`). Íconos `lucide-react`. Tests: Vitest + Testing Library (jsdom, `src/test/setup.ts`).
- Datos: SOLO con `import { repo } from '<ruta>/data'`. Sesión: `useAuth()` de `src/auth/AuthContext` → `{ session, loading, refresh }`. Fases: `useSettings()` / `usePhase(n)` de `src/auth/SettingsContext` y el componente `src/components/PhaseGate.tsx` (`<PhaseGate phase={2} title="…">…</PhaseGate>`, muestra «Próximamente» si la fase está apagada).
- UI ya hecha y reutilizable: `src/components/ui/` (`Button`, `LinkButton`, `BackButton`, `PageHeader`, `States` → `Loading`, `EmptyState`, `ErrorState`, `errorMessage`; `Field` → `TextField`, `SelectField`, `TextArea`; `Badge`), `src/components/profile/` (`ConfirmDialog`, `WeightChart`, `useAsync`, `labels`), `src/components/nutrition/labels.ts` (opciones de sexo, objetivo, actividad), `src/components/admin/AdminShell.tsx` (marco del panel admin), `src/lib/image.ts` (reducir foto), `src/lib/nutrition/guide.ts` (`buildBasicGuide`: estimación sin IA). Míralos antes de crear algo parecido.
- Estilo: el de las páginas existentes (`bg-navy-900`, `text-navy-900`, `bg-brand-orange`, `text-brand-orange`, `bg-surface`, tarjetas `rounded-[1.75rem] bg-white shadow-xl shadow-navy-900/5`, títulos `.display`, etiquetas `.eyebrow`, contenedor `mx-auto max-w-6xl px-4`). Bien a 360 px y a 1280 px.
- Cada carga: estados cargando (`role="status"`), vacío (mensaje + acción), error (mensaje + «Reintentar»), contenido. **Ningún botón sin acción ni pantalla sin salida** (botón «Volver» o enlace de regreso).
- Textos en español de Ecuador. Errores: `errorMessage(e)`. Sin datos inventados.
- Los archivos marcador (`Pending` o «En construcción») de tu tarea: reemplázalos por completo.
- **Commits sin la línea `Co-Authored-By`** (regla de la dueña). El autor ya está configurado: no lo cambies.

**Reglas SQL:**
- Solo tu archivo de migración (nombre exacto del contrato). Nunca edites migraciones anteriores.
- Sigue `docs/superpowers/plans/2026-11-21-db-contrato.md` al pie de la letra (nombres, columnas, códigos de error). Si algo no cuadra, anótalo en «Pedidos al orquestador».
- **Tienes la base local para ti solo en esta ronda.** Prueba así: `npx supabase db reset` (aplica migraciones + `supabase/seed.sql`) y luego `npx supabase test db`. NUNCA `supabase start/stop`, NUNCA `db push`, NUNCA `link`.
- Pruebas pgTAP en tu archivo de `supabase/tests/` (`begin; select plan(n); … select * from finish(); rollback;`). Para actuar como un usuario: crea usuarios con `insert into auth.users(id, email, raw_user_meta_data, …)` (el trigger crea el perfil) y luego `set local role authenticated; select set_config('request.jwt.claims', json_build_object('sub', '<uuid>', 'role', 'authenticated')::text, true);`. Vuelve a `reset role;` para preparar datos como superusuario.
- Gates: `npx supabase db reset` sin errores + `npx supabase test db` verde + los gates normales (lint/build/vitest).

**Archivos que son tuyos (solo estos):** Los archivos que señalen los BLOCKING/HOTFIX con área `[sql]` o `[datos]` (puede ser una migración NUEVA `supabase/migrations/20261121000006_arreglos.sql`: nunca edites una migración ya aplicada).

## Qué construir
Lee `work/out/RS/report.md` y `work/out/RN/report.md`. Arregla TODOS los HOTFIX y BLOCKING de áreas `[sql]` y `[datos]`, cada uno con su test (pgTAP o Vitest). Tienes la base local para ti: `npx supabase db reset` + `npx supabase test db`.

## Tests obligatorios
- Un test por hallazgo arreglado, con el nombre del hallazgo.

**Tiempo:** máximo 20 minutos. Commit apenas algo funcione con gates verdes; luego sigue. Lo commiteado vale.
**Gates antes de cada commit:** `npm run -s lint` (0 errores), `npm run -s build` (exit 0), `npx vitest run` (verde). Reporta los números.

**Última línea del reporte:** `NEXT: la cadena sigue con la recomprobación RSb/RNb.`

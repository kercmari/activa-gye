# DOC — IMPLEMENTADOR (haiku) — README y puesta en marcha
**Reporte:** `work/out/DOC/report.md` (qué hiciste, archivos, gates con números, «Pedidos al orquestador», pendientes).
**Commits:** empiezan con `DOC: `.
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


**Archivos que son tuyos (solo estos):** `README.md`, `docs/entrega/PUESTA-EN-MARCHA.md`, `docs/entrega/CUENTAS-DE-PRUEBA.md`, `docs/entrega/PENDIENTES-Y-PROXIMOS-PASOS.md`.

## Qué construir
1. `README.md`: actualiza «Estado actual» (backend real con Supabase; datos ya no se pierden al cambiar de navegador cuando está conectado), la tabla de fases, las herramientas (Supabase Auth/Postgres/Storage/Edge Functions, Brevo; SIN IA), «Cómo correrlo» con `.env.local` (`cp .env.example .env.local`), `npx supabase start`, `npx supabase db reset` (carga lugares y cuentas de prueba locales). Plataforma tipo Uber: no digas que hay IA.
2. `docs/entrega/PUESTA-EN-MARCHA.md` (para la dueña, en palabras sencillas): crear proyecto en supabase.com (región São Paulo), `npx supabase login`, `npx supabase link --project-ref <ref>`, `npx supabase db push`, cargar SOLO los lugares de la semilla (sin el bloque `-- CUENTAS LOCALES`), crear su cuenta de admin (registrarse y luego en el SQL Editor `update profiles set role='admin' where id = (select id from auth.users where email='…')`), poner `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` en `.env.production.local`, `npm run build`, `npx wrangler deploy`, encender fases en Admin → Fases, y que Supabase gratis se pausa a los 7 días sin uso (cómo reactivarlo).
3. `CUENTAS-DE-PRUEBA.md`: aclara que son solo para la base local.
4. `PENDIENTES-Y-PROXIMOS-PASOS.md`: quita Groq/IA; pon lo que falte de verdad (lee `docs/superpowers/plans/2026-11-21-activa-gye-backend-fases.md` y los reportes).


## Tests obligatorios
- Sin tests nuevos; gates normales verdes.

**Tiempo:** máximo 20 minutos. Commit apenas algo funcione con gates verdes; luego sigue. Lo commiteado vale.
**Gates antes de cada commit:** `npm run -s lint` (0 errores), `npm run -s build` (exit 0), `npx vitest run` (verde). Reporta los números.

**Última línea del reporte:** `NEXT: la cadena sigue con las revisiones.`

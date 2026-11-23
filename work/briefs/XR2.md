# XR2 — IMPLEMENTADOR (haiku) — Contrato y capa de datos: tipo de cuenta, foto de perfil, aprobación del admin
**Reporte:** `work/out/XR2/report.md` (qué hiciste, archivos, gates con números, «Pedidos al orquestador», pendientes).
**Commits:** empiezan con `XR2: `.
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


**Archivos que son tuyos (solo estos):** `src/data/types.ts`, `src/data/supabase/account.ts` (+ `account.test.ts`), `src/data/mock/accounts.ts` (+ `accounts.test.ts`), `src/data/mock/seed-users.ts` (solo si hace falta el campo nuevo), `src/lib/image.ts` (+ test). NO toques pantallas ni `supabase/`.

## Qué construir
**Esta ronda (pedido de la dueña, 22/11):** lee COMPLETO `docs/superpowers/specs/2026-11-22-registro-rol-foto-inicio.md` antes de tocar nada. Es el contrato: nombres de columnas, funciones, métodos del `Repo`, códigos de error y textos exactos. Si algo no cuadra con el código, anótalo en «Pedidos al orquestador» y sigue con lo demás.
**Regla de la dueña (entrega del lunes con solo la fase 1):** cuando una fase está apagada en `app_settings`, sus **vistas no se ven**: ni enlaces en menús (escritorio, móvil, menú de cuenta, pie de página), ni pestañas, ni botones, tarjetas o pasos «Próximamente» que anuncien lo que viene. Al encender la fase en la base (`update public.app_settings set phase2 = true where id = 1;` o Admin → Fases) y recargar, todo vuelve a aparecer. Si alguien abre a mano la URL de una vista apagada, sigue viendo el `PhaseGate` con salida (no se rompe ni da 404 en blanco). La base NO cambia (ya bloquea por detrás). Fuente de verdad: `usePhase(n)` de `src/auth/SettingsContext.tsx` (mientras carga asume solo fase 1: nunca muestra de más).
**Qué es de cada fase** (README «Entrega por fases»): fase 1 = inicio, lugares, deportes, conócenos, contacto, guía, registro/ingreso, perfil, favoritos, progreso de peso, ficha, semana gratis (Mi plan: Hoy, Agenda, Progreso). Fase 2 = solicitar nutricionista, notificaciones, Mi panel (calendario, pagos, mi nutricionista), Mi plan → Suscripción, día 8+ de la Agenda, panel del nutricionista, Admin → Pagos. Fase 3 = reseñas, reporte PDF, Admin → Datos de lugares, registro abierto.
**Otros agentes trabajan a la vez en otros worktrees:** toca SOLO tus archivos. No hagas push ni deploy. No toques la nube (nada de `supabase link`, `db push`, `wrangler`). No leas ni imprimas `.env*`.
Implementa TODA la sección 2 de `docs/superpowers/specs/2026-11-22-registro-rol-foto-inicio.md` en el simulador y en Supabase.
- En `src/lib/image.ts` añade `downscaleToBlob(file, maxSide)` reutilizando la misma validación y dibujo que `downscaleToDataUrl` (mueve lo común a una función; no copies).
- `signUp` manda `account_type` en `options.data`. Supabase: el nombre de bucket es `avatars`, ruta `<uid>/avatar.jpg`, `upsert: true`.
- La foto pendiente (`activa.fotoPendiente.<correo>`) se sube en `signIn` y se borra; si falla, no rompe el ingreso.
- Mapea las columnas nuevas de `profiles` y de `admin_list_users`.
- Mantén compilando a quien ya llama `signUp` (los tests de pantalla los arregla otro agente; si `RegistroPage.tsx` deja de compilar por el campo nuevo, añade ahí SOLO `account_type: 'paciente'` y `photo` provisional y avisa en el reporte).

## Tests obligatorios
Vitest (simulador y Supabase con el cliente simulado como ya hacen los tests de `account.test.ts`):
1. signUp sin foto → `FOTO_REQUERIDA`; foto de tipo inválido → `FOTO_INVALIDA`, y en ambos casos NO se crea la cuenta.
2. signUp nutricionista con cupo lleno → entra, perfil `nutri_status='pendiente'`; paciente con cupo lleno → `CUPO_LLENO`.
3. signUp con sesión sube la foto y guarda `avatar_path`; sin sesión guarda la foto pendiente y `signIn` la sube y borra la clave.
4. `uploadAvatar` reemplaza la foto; `avatarUrl(null)` → `null`.
5. `adminReviewNutri` aprobar/rechazar en el simulador cambia rol y estado; no admin → error.

**Tiempo:** máximo 20 minutos. Commit apenas algo funcione con gates verdes; luego sigue. Lo commiteado vale.
**Gates antes de cada commit:** `npm run -s lint` (0 errores), `npm run -s build` (exit 0), `npx vitest run` (verde). Reporta los números.

**Última línea del reporte:** `NEXT: la cadena sigue con XR3 en la ronda 2.`

# XU4c — IMPLEMENTADOR (haiku) — Últimas vistas de fase 2/3 visibles y e2e de la conducta nueva
**Reporte:** `work/out/XU4c/report.md` (qué hiciste, archivos, gates con números, «Pedidos al orquestador», pendientes).
**Commits:** empiezan con `XU4c: `.
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


**Archivos que son tuyos (solo estos):** `e2e/fase1.spec.ts`, `e2e/semana.spec.ts`, `src/pages/LugarPage.tsx`, `src/components/panel/MiNutricionistaTab.tsx` (o donde se monte `ReviewsSection` dentro de fase 2), `src/pages/admin/AdminHomePage.tsx`, `src/pages/plan/HoyPage.tsx`, y sus tests (`*.test.tsx`). NO toques `supabase/`.

## Qué construir
**Regla de la dueña (entrega del lunes con solo la fase 1):** cuando una fase está apagada en `app_settings`, sus **vistas no se ven**: ni enlaces en menús (escritorio, móvil, menú de cuenta, pie de página), ni pestañas, ni botones, tarjetas o pasos «Próximamente» que anuncien lo que viene. Al encender la fase en la base (`update public.app_settings set phase2 = true where id = 1;` o Admin → Fases) y recargar, todo vuelve a aparecer. Si alguien abre a mano la URL de una vista apagada, sigue viendo el `PhaseGate` con salida (no se rompe ni da 404 en blanco). La base NO cambia (ya bloquea por detrás). Fuente de verdad: `usePhase(n)` de `src/auth/SettingsContext.tsx` (mientras carga asume solo fase 1: nunca muestra de más).
**Qué es de cada fase** (README «Entrega por fases»): fase 1 = inicio, lugares, deportes, conócenos, contacto, guía, registro/ingreso, perfil, favoritos, progreso de peso, ficha, semana gratis (Mi plan: Hoy, Agenda, Progreso). Fase 2 = solicitar nutricionista, notificaciones, Mi panel (calendario, pagos, mi nutricionista), Mi plan → Suscripción, día 8+ de la Agenda, panel del nutricionista, Admin → Pagos. Fase 3 = reseñas, reporte PDF, Admin → Datos de lugares, registro abierto.

Lee `work/out/RE4/report.md` y arregla sus 4 BLOCKING exactamente como sugiere:
1. e2e `fase1.spec.ts:41-45` y `semana.spec.ts:75-76`: pasan a probar la conducta NUEVA (pestañas de fase 2 ausentes con `toHaveCount(0)`, sin «Próximamente»; día 8 con fase 2 apagada → «Tu semana gratis terminó en el día 7.» y sin `paywall-proximamente`). Actualiza los títulos de las pruebas. No quites otras aserciones.
2. `LugarPage.tsx:299`: `ReviewsSection` solo con `usePhase(3)`; lo mismo donde se monte dentro de la pestaña de nutricionista.
3. `AdminHomePage.tsx:11-18`: tarjetas con `phase?: 2 | 3` filtradas como en `AdminShell.tsx`; ajusta `AdminHomePage.test.tsx` (apagadas → no están; encendidas → sí).
4. `HoyPage.tsx:153-158`: con fase 2 apagada, `REQUIERE_NUTRICIONISTA` muestra solo el mensaje («Por tu condición de salud, tu plan lo armará una nutricionista. Te avisaremos cuando esté disponible.») + enlace «Volver a mi perfil»; el botón a `/mi-panel?tab=nutricionista` solo con fase 2.
Non-blocking que también haces: `back` explícito en los `PhaseGate` de `MiPanelPage`, `SuscribirmePage`, `AdminPagosPage`, `AdminDatosLugaresPage` (solo agregar la prop) — esos archivos también son tuyos para ESA línea.

## Tests obligatorios
- Vitest de 2, 3 y 4 con fase apagada y encendida.
- Con TU preview (`npm run -s build && npx vite preview --port $E2E_PORT --strictPort --host 127.0.0.1 &`): `E2E_PORT=$E2E_PORT npx playwright test e2e/fase1.spec.ts e2e/semana.spec.ts e2e/navegacion.spec.ts --reporter=line` verde. Mata tu preview. No corras la suite completa ni `db reset`.

**Tiempo:** máximo 20 minutos. Commit apenas algo funcione con gates verdes; luego sigue. Lo commiteado vale.
**Gates antes de cada commit:** `npm run -s lint` (0 errores), `npm run -s build` (exit 0), `npx vitest run` (verde). Reporta los números.

**Última línea del reporte:** `NEXT: la cadena sigue con la revisión RE4b.`

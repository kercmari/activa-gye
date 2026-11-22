# U7a — IMPLEMENTADOR (haiku) — Marco «Mi plan» con barra inferior + pantalla Hoy
**Reporte:** `work/out/U7a/report.md` (qué hiciste, archivos, gates con números, «Pedidos al orquestador», pendientes).
**Commits:** empiezan con `U7a: `.
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


**Archivos que son tuyos (solo estos):** `src/components/plan/PlanShell.tsx`, `src/components/plan/BottomNav.tsx`, `src/components/plan/CheckinCard.tsx`, `src/components/plan/TrialItemRow.tsx`, `src/components/plan/useTrial.ts`, `src/pages/plan/HoyPage.tsx` y sus `*.test.tsx`.

## Qué construir
Referencias: `work/ref-base-vital/BottomNav.tsx`, `work/ref-base-vital/Home.tsx`, `work/ref-base-vital/CheckIn.tsx`.
1. **`PlanShell`** (ruta padre `/mi-plan`, ya en `src/App.tsx`): renderiza `<Outlet />` dentro del contenedor de la página y **`BottomNav`**: en celular barra fija abajo (Hoy · Progreso · Agenda · Guía, íconos lucide `Home`, `HeartPulse`, `CalendarDays`, `BookOpen`, activo en naranja); en ≥ 768 px pestañas arriba. Guía enlaza a `/guia` (pública). Deja espacio inferior para que la barra no tape contenido. Enlace «Volver a Mi panel» (`/mi-panel`).
2. **`useTrial()`**: hook que carga `repo.getMyTrial()` y expone `{ trial, loading, error, reload, setItemDone }` (`setItemDone` llama `repo.setTrialItemDone` y reemplaza el estado con lo que devuelve). Lo usan Hoy, Agenda y Progreso (otras tareas lo importan: exporta exactamente ese nombre y forma).
3. **`HoyPage`** (`/mi-plan/hoy`):
   - Sin trial: si no hay ficha (`repo.getMyIntake()` null) → tarjeta «Llena tu ficha para recibir tu semana gratis» con enlace a `/mi-panel?tab=ficha`; si hay ficha → botón «Generar mi semana gratis» (`repo.startMyTrial()`); error `REQUIERE_NUTRICIONISTA` → explicación + enlace a `/mi-panel?tab=nutricionista`.
   - Con trial: «Día N de 7» (current_day), nombre de la plantilla, «≈ X kcal · Porciones ×F», aviso de borrador; lista de ítems del día actual con hora, ícono por tipo (comida/rutina/hábito), detalle desplegable y casilla (`TrialItemRow`); barra de progreso del día; **`CheckinCard`**: «¿Cómo te sientes hoy?» 1–5 (5 botones grandes con emoji), peso opcional, vasos de agua (− / +), nota; guarda con `repo.saveTodayCheckin` y luego `reload()`; si ya hay chequeo hoy (`repo.getTodayCheckin()`) muestra el resumen con «Editar».
   - Mensaje de lo que falta: «Para abrir el Día N+1: haz tu chequeo y marca al menos K de T» → cuando se cumple: «¡Listo! El Día N+1 se abre mañana». Si `current_day` es null y no terminó: «Vuelve mañana: tu Día N se abre el <fecha>». Si `finished`: tarjeta «¡Semana completada!» + `LinkButton` a `/mi-plan/suscripcion`.

## Tests obligatorios
- `PlanShell`/`BottomNav`: 4 enlaces, el activo marcado (`aria-current`).
- `HoyPage`: sin ficha / generar / REQUIERE_NUTRICIONISTA / día con ítems y marcar uno llama `setTrialItemDone` / chequeo guardado llama `saveTodayCheckin` / mensaje «se abre mañana» / semana completada.

**Tiempo:** máximo 20 minutos. Commit apenas algo funcione con gates verdes; luego sigue. Lo commiteado vale.
**Gates antes de cada commit:** `npm run -s lint` (0 errores), `npm run -s build` (exit 0), `npx vitest run` (verde). Reporta los números.

**Última línea del reporte:** `NEXT: la cadena sigue con la ronda B.`

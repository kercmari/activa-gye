# U4b — IMPLEMENTADOR (haiku) — Nutricionista: editor del calendario del plan
**Reporte:** `work/out/U4b/report.md` (qué hiciste, archivos, gates con números, «Pedidos al orquestador», pendientes).
**Commits:** empiezan con `U4b: `.
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


**Archivos que son tuyos (solo estos):** `src/components/nutri/PlanEditor.tsx`, `src/lib/dates.ts` y sus `*.test.ts(x)`.

## Qué construir
1. `src/lib/dates.ts`: `toISODate(d)`, `mondayOf(d)` (lunes de esa semana), `addDays(iso, n)`, `weekDays(mondayISO)` (7 fechas), `formatDayLabel(iso)` → «Lun 24/11», `isToday(iso)`. Fechas locales, sin librerías.
2. **`PlanEditor`** (`{ patientId }`): vista por **semana** (lunes a domingo) con «‹ Semana anterior», «Esta semana», «Semana siguiente ›». Carga `repo.listPlanDays(patientId, lunes, domingo)`.
   - 7 tarjetas (en celular, una debajo de otra): fecha; si hay plan: título, comidas, ejercicio, notas, estado «✓ Cumplido» (verde, con la nota del paciente) o «Pendiente»; botones «Editar» y «Borrar» (con confirmación). Sin plan: botón «Agregar plan».
   - Formulario (en diálogo o desplegado): Título (2–120), Comidas, Ejercicio, Notas → `repo.savePlanDay(patientId, {...})`.
   - «Copiar esta semana a la siguiente» → `repo.copyPlanWeek(patientId, lunes, lunes+7)` → «Se copiaron N días» y pasa a la semana siguiente.
   - Resumen arriba: «N de 7 días cumplidos esta semana».


## Tests obligatorios
- `src/lib/dates.test.ts`: `mondayOf de un domingo devuelve el lunes anterior`; `weekDays devuelve 7 fechas seguidas`.
- `PlanEditor.test.tsx`: `muestra los días de la semana con su estado`; `agregar plan llama savePlanDay`; `copiar semana llama copyPlanWeek con lunes y lunes+7`.

**Tiempo:** máximo 20 minutos. Commit apenas algo funcione con gates verdes; luego sigue. Lo commiteado vale.
**Gates antes de cada commit:** `npm run -s lint` (0 errores), `npm run -s build` (exit 0), `npx vitest run` (verde). Reporta los números.

**Última línea del reporte:** `NEXT: la cadena sigue con la ronda 4.`

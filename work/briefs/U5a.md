# U5a — IMPLEMENTADOR (haiku) — Paciente: Calendario y progreso
**Reporte:** `work/out/U5a/report.md` (qué hiciste, archivos, gates con números, «Pedidos al orquestador», pendientes).
**Commits:** empiezan con `U5a: `.
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


**Archivos que son tuyos (solo estos):** `src/components/panel/CalendarioTab.tsx` (+ `src/components/panel/calendario/*` nuevos) y sus tests. Puedes reutilizar `src/components/profile/WeightChart.tsx` y `ProgressTab.tsx` sin editarlos; usa `src/lib/dates.ts` si ya existe en main, si no crea funciones locales.

## Qué construir
**`CalendarioTab`** (en `/mi-panel?tab=calendario`, la página ya la envuelve en PhaseGate 2):
- Vista de **mes** (cuadrícula lunes–domingo; en celular, lista de la semana con «‹ ›»): `repo.listPlanDays(session.user.id, primerDía, últimoDía)`. Cada día con plan: punto naranja (pendiente) o verde con ✓ (cumplido). Hoy resaltado. «‹ Mes anterior», «Mes siguiente ›», «Hoy».
- Al pulsar un día con plan: detalle (título, comidas, ejercicio, notas del nutricionista) + casilla «Cumplí este día» y «Nota para mi nutricionista» (≤500) + «Guardar» → `repo.setPlanDayDone(id, done, note)`. Solo se puede marcar cumplido un día de hoy o anterior («Podrás marcarlo ese día.»).
- Progreso arriba: «Cumpliste N de M días este mes» con barra y %; racha de días seguidos cumplidos.
- Debajo, «Mi peso»: el registro de peso existente (`ProgressTab` de `src/components/profile`) para seguir anotando peso.
- Sin días: «Tu nutricionista aún no arma tu calendario.» + botón a `?tab=nutricionista`.


## Tests obligatorios
- `CalendarioTab.test.tsx`: `muestra días cumplidos y pendientes del mes`; `marcar cumplido llama setPlanDayDone`; `un día futuro no se puede marcar`; `calcula el porcentaje del mes`.

**Tiempo:** máximo 20 minutos. Commit apenas algo funcione con gates verdes; luego sigue. Lo commiteado vale.
**Gates antes de cada commit:** `npm run -s lint` (0 errores), `npm run -s build` (exit 0), `npx vitest run` (verde). Reporta los números.

**Última línea del reporte:** `NEXT: la cadena sigue con la ronda 4.`

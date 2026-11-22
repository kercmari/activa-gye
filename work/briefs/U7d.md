# U7d — IMPLEMENTADOR (haiku) — Progreso + ficha con alergias y condiciones
**Reporte:** `work/out/U7d/report.md` (qué hiciste, archivos, gates con números, «Pedidos al orquestador», pendientes).
**Commits:** empiezan con `U7d: `.
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


**Archivos que son tuyos (solo estos):** `src/pages/plan/ProgresoPage.tsx`, `src/components/plan/MiniLineChart.tsx`, y en `src/components/panel/` SOLO `FichaForm.tsx`, `FichaTab.tsx`, `ficha.ts` y sus tests.

## Qué construir
Referencia: `work/ref-base-vital/History.tsx`.
1. **`/mi-plan/progreso`**: resumen arriba (días completados x/7, % de ítems cumplidos, ánimo promedio, cambio de peso desde el primer chequeo); gráficos de línea SVG simples (`MiniLineChart`, accesibles con `<title>` y tabla oculta) para **ánimo** (1–5), **peso** y **agua** de `repo.listCheckins(miId, 30)`; barras por día de la semana gratis (items_done/items_total) con `useTrial()` de `src/components/plan/useTrial.ts` (lo crea U7a; si no existe en tu árbol, crea uno con la misma firma `{ trial, loading, error, reload, setItemDone }` y anótalo); historial «Registro de chequeos» (fecha, emoji del ánimo, peso, agua, nota). Vacío: «Aún no hay chequeos: haz el primero en Hoy» con enlace.
2. **Ficha** (`FichaForm`): agrega «Alergias o comidas que no comes» (texto ≤ 300) y «Condiciones de salud» (casillas: Diabetes, Hipertensión, Embarazo, Enfermedad renal, Otra), con nota: «Si marcas alguna, una nutricionista arma tu plan en lugar del plan automático». Envía `allergies` y `conditions` en `PatientIntakeInput`. Tras guardar con éxito (`FichaTab`), muestra `LinkButton` «Ver mi semana gratis» → `/mi-plan/hoy`.

## Tests obligatorios
- Progreso: con chequeos dibuja 3 gráficos y la tabla; sin chequeos muestra el vacío con enlace.
- Ficha: envía allergies/conditions; tras guardar aparece «Ver mi semana gratis».
- Los tests existentes de la ficha siguen verdes.

**Tiempo:** máximo 20 minutos. Commit apenas algo funcione con gates verdes; luego sigue. Lo commiteado vale.
**Gates antes de cada commit:** `npm run -s lint` (0 errores), `npm run -s build` (exit 0), `npx vitest run` (verde). Reporta los números.

**Última línea del reporte:** `NEXT: la cadena sigue con la ronda B.`

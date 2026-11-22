# U7b — IMPLEMENTADOR (haiku) — Agenda estilo Base Vital con candados y muro de pago
**Reporte:** `work/out/U7b/report.md` (qué hiciste, archivos, gates con números, «Pedidos al orquestador», pendientes).
**Commits:** empiezan con `U7b: `.
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


**Archivos que son tuyos (solo estos):** `src/pages/plan/AgendaPage.tsx`, `src/components/plan/MonthCalendar.tsx`, `src/components/plan/DayActivities.tsx`, `src/components/plan/Paywall.tsx` y sus `*.test.tsx`.

## Qué construir
Referencias: `work/ref-base-vital/Agenda.tsx` y `work/ref-base-vital/agenda-002.css` (mira la estructura y el aspecto, no copies el CSS: tradúcelo a Tailwind).
- Dos columnas en ≥ 1024 px (en celular, una debajo de otra), como la captura de Base Vital: **izquierda** tarjeta «Planificación diaria» con el mes (lunes primero, nombres en español, flechas ‹ ›, días de otros meses atenuados, hoy resaltado, el día elegido en `bg-navy-900 text-white`), punto naranja en días con actividades y 🔒 (`Lock`) en días de la semana gratis aún cerrados; leyenda «Días con actividades». **Derecha** tarjeta «Actividades del día» con la fecha larga («Sábado, 21 de noviembre de 2026»), «N actividades», y la lista hora + punto + título (+ detalle en gris). Botón «Volver a hoy» arriba a la derecha.
- Fechas de la semana gratis: el día k cae en `unlocked_on` si existe; si no, en la fecha proyectada (fecha del último día abierto + días restantes). Usa `useTrial()` de `src/components/plan/useTrial.ts` (lo crea U7a; si aún no existe en tu árbol, crea tú un archivo con esa misma firma y anótalo en el reporte: el orquestador conserva el de U7a).
- Elegir un día cerrado → tarjeta con candado «Este día se abre cuando completes el anterior» (sin ítems). Elegir un día posterior al 7 → **`Paywall`**: «Tu semana gratis termina en el Día 7. Suscríbete para que una nutricionista siga tu plan» + `LinkButton` a `/mi-plan/suscripcion`. Si `repo.getMyPatientSubscription()` está `activa`, en lugar del muro muestra los `repo.listPlanDays(miId, desde, hasta)` del mes (título, comidas, ejercicio) — fase 2 con `usePhase(2)`; con fase 2 apagada, el muro dice «Próximamente».
- Marcar ítems desde la Agenda también funciona (solo en días abiertos).

## Tests obligatorios
- Mes correcto (noviembre 2026 empieza en domingo → primera fila con 26–31 de octubre atenuados).
- Día abierto muestra ítems; día cerrado muestra candado sin ítems; día 8+ muestra el muro con enlace a suscripción; con suscripción activa muestra `listPlanDays`.
- «Volver a hoy» selecciona hoy.

**Tiempo:** máximo 20 minutos. Commit apenas algo funcione con gates verdes; luego sigue. Lo commiteado vale.
**Gates antes de cada commit:** `npm run -s lint` (0 errores), `npm run -s build` (exit 0), `npx vitest run` (verde). Reporta los números.

**Última línea del reporte:** `NEXT: la cadena sigue con la ronda B.`

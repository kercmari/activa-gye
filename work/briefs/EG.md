# EG — IMPLEMENTADOR (haiku) — Pruebas de punta a punta de la semana gratis + evidencia
**Reporte:** `work/out/EG/report.md` (qué hiciste, archivos, gates con números, «Pedidos al orquestador», pendientes).
**Commits:** empiezan con `EG: `.
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

**Tiempo extra:** este brief puede usar 25 minutos.
**Archivos que son tuyos (solo estos):** `e2e/semana.spec.ts`, `e2e/guia.spec.ts`, `e2e/helpers.ts` (solo agregar), `docs/entrega/SEMANA-GRATIS.md`, `docs/entrega/PRUEBA-DE-BOTONES.md` (solo agregar filas), `scripts/capturas-semana.mjs`, `docs/entrega/capturas/*` nuevas, y en `README.md` SOLO una sección «Semana gratis» bajo «Entrega por fases».

## Qué construir
La base local ya tiene migraciones 1–7 y la semilla (incluida `semana@activagye.test`). Tu árbol tiene `.env.local`. **No** hagas `db reset`/`start`/`stop`. Deja las fases como estaban al terminar (fase 1 sí, 2 y 3 no).
- `e2e/semana.spec.ts`: registro nuevo (correo único) → ficha sin condiciones → «Ver mi semana gratis» → Hoy muestra «Día 1 de 7» con ítems → marcar la mitad + chequeo → «se abre mañana» → Agenda: Día 1 con ítems, Día 2 con candado, un día > 7 con el muro «Suscríbete». Otra prueba: ficha con «Diabetes» → «Generar» muestra el mensaje de nutricionista. Otra: `semana@activagye.test` ve «¡Semana completada!» → con fase 2 encendida (Admin → Fases) se suscribe → admin marca pagada en Admin → Pagos → nutricionista ve una solicitud nueva.
- `e2e/guia.spec.ts`: `/guia` sin sesión, filtrar categoría, buscar; nutricionista edita una entrada en `/admin/guia`; plantillas visibles en `/admin/plantillas`.
- Evidencia: `scripts/capturas-semana.mjs` → `docs/entrega/capturas/` `semana-hoy.png`, `semana-agenda.png`, `semana-agenda-candado.png`, `semana-muro-pago.png`, `semana-progreso.png`, `guia.png`, `admin-plantillas.png` a 1280 px y `semana-hoy-movil.png` a 390 px. Míralas con Read y commitea las que se vean bien. `SEMANA-GRATIS.md`: qué es, regla de desbloqueo, cómo probarlo con las cuentas, capturas.

## Tests obligatorios
- `npx playwright test --reporter=line`: todo verde (reporta el número). Si algo falla por un error REAL de la app, NO lo tapes: anótalo con archivo:línea y cómo reproducirlo.

**Tiempo:** máximo 20 minutos. Commit apenas algo funcione con gates verdes; luego sigue. Lo commiteado vale.
**Gates antes de cada commit:** `npm run -s lint` (0 errores), `npm run -s build` (exit 0), `npx vitest run` (verde). Reporta los números.

**Última línea del reporte:** `NEXT: la cadena sigue con las revisiones.`

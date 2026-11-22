# XU3 — IMPLEMENTADOR (haiku) — e2e de fase 2 con suscripción del paciente y candado de fases
**Reporte:** `work/out/XU3/report.md` (qué hiciste, archivos, gates con números, «Pedidos al orquestador», pendientes).
**Commits:** empiezan con `XU3: `.
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


**Archivos que son tuyos (solo estos):** `e2e/fase2.spec.ts`, `e2e/helpers.ts` (agregar), `e2e/fase3.spec.ts` y `e2e/guia.spec.ts` (solo timeouts de hooks). NO toques `src/` ni `supabase/`.

## Qué construir
Lee `work/out/RT2/report.md`, `work/out/RU2a/report.md`, `work/out/RU2b/report.md` (BLOCKING 1 y 2) y `work/out/E2E-R2-final.txt`. **Decisión tomada (diseño §3.3):** la agenda pagada (`plan_days`) solo se ve con suscripción de paciente activa. La base NO cambia.
- En `e2e/helpers.ts` agrega `suscribirPaciente(page, correo, clave)`: como paciente abre `/mi-plan/suscripcion` → «Suscribirme» → informa comprobante; como admin en Admin → Pagos marca pagada esa factura (copia el flujo de `e2e/semana.spec.ts:102-140`, que pasa). Idempotente: si ya está «Suscripción activa», no hace nada.
- En `e2e/fase2.spec.ts`, antes del paso 4 (`abrirHoyEnCalendario`), llama `suscribirPaciente` para el paciente de la prueba (fase 2 ya está encendida en esa prueba). Nada de lo que la prueba verifica se quita.
- Candado: `fase2` no debe retener `conCandadoDeFases` más de lo necesario; y los `afterAll` de `fase3.spec.ts` y `guia.spec.ts` que toman el candado necesitan timeout propio ≥ 180 s (`test.afterAll(async ({}, testInfo) => { testInfo.setTimeout(180_000); … })`).
- Verifica con TU preview (`npm run -s build && npx vite preview --port $E2E_PORT --strictPort --host 127.0.0.1 &`): `E2E_PORT=$E2E_PORT npx playwright test e2e/fase2.spec.ts e2e/guia.spec.ts --reporter=line`. Mata tu preview. No corras la suite completa.

## Tests obligatorios
- `fase2.spec.ts` verde en desktop y mobile; `guia.spec.ts` verde. Reporta números.

**Tiempo:** máximo 20 minutos. Commit apenas algo funcione con gates verdes; luego sigue. Lo commiteado vale.
**Gates antes de cada commit:** `npm run -s lint` (0 errores), `npm run -s build` (exit 0), `npx vitest run` (verde). Reporta los números.

**Última línea del reporte:** `NEXT: la cadena sigue con la revisión RE3.`

# XR4 — IMPLEMENTADOR (haiku) — Nutrición como inicio y Panel de deportes
**Reporte:** `work/out/XR4/report.md` (qué hiciste, archivos, gates con números, «Pedidos al orquestador», pendientes).
**Commits:** empiezan con `XR4: `.
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


**Archivos que son tuyos (solo estos):** `src/App.tsx`, `src/pages/HomePage.tsx`, `src/pages/NutricionPage.tsx`, `src/pages/DeportesPage.tsx`, páginas nuevas que crees en `src/pages/` para esto, `src/components/home/*`, `src/components/layout/Header.tsx` y `Footer.tsx` (SOLO los enlaces del menú y del pie; el círculo de cuenta es de otro agente), y sus `*.test.tsx`.

## Qué construir
**Esta ronda (pedido de la dueña, 22/11):** lee COMPLETO `docs/superpowers/specs/2026-11-22-registro-rol-foto-inicio.md` antes de tocar nada. Es el contrato: nombres de columnas, funciones, métodos del `Repo`, códigos de error y textos exactos. Si algo no cuadra con el código, anótalo en «Pedidos al orquestador» y sigue con lo demás.
**Regla de la dueña (entrega del lunes con solo la fase 1):** cuando una fase está apagada en `app_settings`, sus **vistas no se ven**: ni enlaces en menús (escritorio, móvil, menú de cuenta, pie de página), ni pestañas, ni botones, tarjetas o pasos «Próximamente» que anuncien lo que viene. Al encender la fase en la base (`update public.app_settings set phase2 = true where id = 1;` o Admin → Fases) y recargar, todo vuelve a aparecer. Si alguien abre a mano la URL de una vista apagada, sigue viendo el `PhaseGate` con salida (no se rompe ni da 404 en blanco). La base NO cambia (ya bloquea por detrás). Fuente de verdad: `usePhase(n)` de `src/auth/SettingsContext.tsx` (mientras carga asume solo fase 1: nunca muestra de más).
**Qué es de cada fase** (README «Entrega por fases»): fase 1 = inicio, lugares, deportes, conócenos, contacto, guía, registro/ingreso, perfil, favoritos, progreso de peso, ficha, semana gratis (Mi plan: Hoy, Agenda, Progreso). Fase 2 = solicitar nutricionista, notificaciones, Mi panel (calendario, pagos, mi nutricionista), Mi plan → Suscripción, día 8+ de la Agenda, panel del nutricionista, Admin → Pagos. Fase 3 = reseñas, reporte PDF, Admin → Datos de lugares, registro abierto.
**Otros agentes trabajan a la vez en otros worktrees:** toca SOLO tus archivos. No hagas push ni deploy. No toques la nube (nada de `supabase link`, `db push`, `wrangler`). No leas ni imprimas `.env*`.
Implementa la parte «Inicio `/`», «Panel de deportes» y «Menú» de la sección 3 de `docs/superpowers/specs/2026-11-22-registro-rol-foto-inicio.md`.
- Mueve, no copies: el contenido del inicio actual pasa a la página del Panel de deportes (renombra el archivo con `git mv` si conviene) y la página de Nutrición se convierte en la portada. `/nutricion` → `<Navigate to="/" replace />`.
- La portada respeta las fases igual que hoy `NutricionPage` (con fase 2 apagada solo el paso de la ficha, sin «Próximamente»). Botones «Soy paciente» / «Soy nutricionista» a `/registro?tipo=…`; con sesión «Ir a mi ficha».
- Héroe con imagen: usa `/img/hero.jpg` u otra que ya exista en `public/img/` (no inventes archivos).
- Guía es de fase 1 y es de nutrición: queda en el menú principal.
- Revisa que ningún enlace interno quede apuntando a `/nutricion` ni al inicio viejo esperando el buscador (`grep -rn "'/nutricion'\|\"/nutricion\"" src`).

## Tests obligatorios
Vitest:
1. `/` muestra la portada de Nutrición con los dos botones y sus `href` exactos; con sesión muestra «Ir a mi ficha».
2. `/nutricion` redirige a `/`.
3. `/deportes` muestra el buscador, «Explora por deporte» y «Lugares recomendados».
4. Menú de escritorio y móvil: Inicio, Deportes, Guía, Conócenos, Contacto (sin «Nutricionista» ni «Buscar lugares» sueltos); fase 2 apagada sigue sin enlaces de fase 2.
5. Tests viejos de Home/Nutrición/Header/Footer actualizados a la conducta nueva (sin borrar aserciones que sigan valiendo).

**Tiempo:** máximo 20 minutos. Commit apenas algo funcione con gates verdes; luego sigue. Lo commiteado vale.
**Gates antes de cada commit:** `npm run -s lint` (0 errores), `npm run -s build` (exit 0), `npx vitest run` (verde). Reporta los números.

**Última línea del reporte:** `NEXT: la cadena sigue con XR3 en la ronda 2.`

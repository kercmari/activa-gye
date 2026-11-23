# XU4b — IMPLEMENTADOR (haiku) — Ingreso y registro en la página publicada
**Reporte:** `work/out/XU4b/report.md` (qué hiciste, archivos, gates con números, «Pedidos al orquestador», pendientes).
**Commits:** empiezan con `XU4b: `.
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


**Archivos que son tuyos (solo estos):** `src/pages/IngresarPage.tsx`, `src/pages/RegistroPage.tsx` (o la página de registro que exista), `src/data/supabase/account.ts` SOLO si hace falta para distinguir el aviso, y sus tests. NO toques `supabase/`, `Header.tsx` ni el README.

## Qué construir
1. **«Cuentas de prueba»** (`IngresarPage.tsx:91-100`): esas cuentas solo existen en la base local. En la página publicada (Supabase en la nube) es texto falso. Muéstralo SOLO si no hay `VITE_SUPABASE_URL` (modo de prueba) o si su host es `127.0.0.1`/`localhost`. Haz una función pequeña y probada (p. ej. `esBaseLocal(url)`).
2. **Registro con confirmación de correo:** al crear la cuenta en la nube, `signUp` termina en `CORREO_SIN_CONFIRMAR` («Revisa tu correo para confirmar la cuenta y luego inicia sesión.») y la página lo pinta en ROJO como error. Es un aviso bueno: muéstralo como éxito/información (verde o azul, `role="status"`), con el formulario ya enviado (sin volver a enviar) y un enlace «Ir a ingresar». En el ingreso, el mismo código sí sigue como aviso (no error rojo) diciendo que falta confirmar el correo.

## Tests obligatorios
- Vitest: `esBaseLocal` con `undefined`, `http://127.0.0.1:54321`, `http://localhost:54321` → true; `https://abc.supabase.co` → false. IngresarPage con URL de la nube no muestra «Cuentas de prueba». RegistroPage: cuando el repo lanza `CORREO_SIN_CONFIRMAR`, se ve el aviso con `role="status"` (no `role="alert"`) y el enlace «Ir a ingresar».

**Tiempo:** máximo 20 minutos. Commit apenas algo funcione con gates verdes; luego sigue. Lo commiteado vale.
**Gates antes de cada commit:** `npm run -s lint` (0 errores), `npm run -s build` (exit 0), `npx vitest run` (verde). Reporta los números.

**Última línea del reporte:** `NEXT: la cadena sigue con la revisión RE4.`

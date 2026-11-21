# U1b — IMPLEMENTADOR (haiku) — Admin → Fases, registro con cupo, «Cómo funciona» y enlaces a Mi panel
**Reporte:** `work/out/U1b/report.md` (qué hiciste, archivos, gates con números, «Pedidos al orquestador», pendientes).
**Commits:** empiezan con `U1b: `.
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


**Archivos que son tuyos (solo estos):** `src/pages/admin/AdminFasesPage.tsx`, `src/pages/NutricionPage.tsx`, `src/pages/RegistroPage.tsx`, `src/pages/PerfilPage.tsx`, `src/components/profile/DataTab.tsx` y sus `*.test.tsx`.

## Qué construir
1. **`AdminFasesPage`** (`/admin/fases`, solo admin) dentro de `AdminShell` título «Fases de la plataforma»: carga `repo.getSettings()`; 3 casillas grandes con descripción:
   - «Fase 1 · Ingreso y ficha del paciente» (registro, ingreso, Mi ficha con foto).
   - «Fase 2 · Nutricionista» (solicitudes, tablero, avisos, seguimiento, calendario, suscripciones y facturas).
   - «Fase 3 · Para todos» (registro sin cupo, reseñas, reporte PDF, correos, datos completos de lugares).
   - Campo numérico «Cupo de pacientes (mientras la fase 3 está apagada)» (0–100000) y el texto «Pacientes registrados: N».
   - «Guardar cambios» → `repo.adminSaveSettings(...)` → «Cambios guardados» y `reload()` de `useSettings()` para que toda la página se actualice. Aviso si se apaga la fase 1: «Si apagas la fase 1, los pacientes no podrán guardar su ficha.»
2. **`RegistroPage`**: si `useSettings()` dice `!phase3 && patients_count >= patient_limit`, muestra arriba un aviso «Por ahora no hay cupos para nuevos pacientes.» y deshabilita «Crear cuenta». Si `signUp` lanza `CUPO_LLENO`, muestra su mensaje. Si `!phase3`, debajo del título: «Cupos disponibles: N». Tras registrarse, navega a `/mi-panel` (antes iba a `/perfil`).
3. **`NutricionPage`** (`/nutricion`, pública): «Cómo funciona» en 3 pasos: 1) Llena tu ficha (datos y foto) 2) Un nutricionista acepta tu solicitud 3) Sigue tu calendario y marca cada día cumplido. Botón principal: con sesión «Ir a mi ficha» (`/mi-panel`), sin sesión «Crear mi cuenta» (`/registro`) + «Ya tengo cuenta» (`/ingresar?volver=/mi-panel`). Sección «Para nutricionistas»: «Atiende pacientes desde tu panel. Suscripción mensual.» + enlace a `/contacto`. Aviso: «Activa GYE conecta pacientes con nutricionistas. No da diagnósticos ni consejos automáticos.» Si la fase 2 está apagada, el paso 2 y 3 llevan la etiqueta «Próximamente».
4. **`PerfilPage`**: agrega una tarjeta destacada «Mi panel: ficha, calendario y pagos» con botón «Abrir mi panel» → `/mi-panel` (arriba de las pestañas). **`DataTab`**: si muestra algo de «plan» o «progreso» antiguo, cámbialo por el enlace a `/mi-panel`.


## Tests obligatorios
- `AdminFasesPage.test.tsx`: `muestra las 3 fases con su estado`; `guardar llama adminSaveSettings con los valores marcados`.
- `RegistroPage.test.tsx` (agrega): `cupo lleno deshabilita Crear cuenta`.
- `PerfilPage.test.tsx` (agrega): `tiene el enlace Abrir mi panel a /mi-panel`.

**Tiempo:** máximo 20 minutos. Commit apenas algo funcione con gates verdes; luego sigue. Lo commiteado vale.
**Gates antes de cada commit:** `npm run -s lint` (0 errores), `npm run -s build` (exit 0), `npx vitest run` (verde). Reporta los números.

**Última línea del reporte:** `NEXT: la cadena sigue con la ronda 2.`

# U1a — IMPLEMENTADOR (haiku) — Panel del paciente y pestaña «Mi ficha»
**Reporte:** `work/out/U1a/report.md` (qué hiciste, archivos, gates con números, «Pedidos al orquestador», pendientes).
**Commits:** empiezan con `U1a: `.
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


**Archivos que son tuyos (solo estos):** `src/pages/panel/MiPanelPage.tsx`, `src/components/panel/FichaTab.tsx` (+ `src/components/panel/*` nuevos que crees, excepto `MiNutricionistaTab.tsx`, `CalendarioTab.tsx` y `PagosTab.tsx`) y sus `*.test.tsx`.

## Qué construir
1. **`MiPanelPage`** (`/mi-panel`, con sesión): `PageHeader` («MI PANEL», «Hola, <nombre>», botón Volver a `/perfil`). Pestañas accesibles (`role="tablist"`, como `src/pages/PerfilPage.tsx`) guardadas en `?tab=`: `ficha` «Mi ficha» (por defecto), `calendario` «Calendario y progreso», `pagos` «Pagos», `nutricionista` «Mi nutricionista». Las 3 últimas muestran un candado pequeño en el título si la fase 2 está apagada, y su panel va envuelto en `<PhaseGate phase={2} title="…">` con el componente marcador (`CalendarioTab`, `PagosTab`, `MiNutricionistaTab`: impórtalos, NO los edites).
2. **`FichaTab`** = formulario de la ficha inicial (`repo.getMyIntake()` + datos del perfil de `useAuth()`):
   - Campos: Nombre completo, Fecha de nacimiento (muestra «Edad: N años» al lado), Género (`SEX_OPTIONS`), Peso (kg), Estatura (cm), Cintura (cm, opcional), Objetivo (`GOAL_OPTIONS`, opcional), Nivel de actividad (`ACTIVITY_OPTIONS`, opcional), Notas de salud (opcional, ≤1000: alergias, lesiones…).
   - **Foto de cuerpo entero** (opcional): input de archivo (jpg/png/webp ≤ 5 MB, valida tipo y tamaño), vista previa, botón «Quitar foto», casilla de consentimiento obligatoria si hay foto: «Acepto que mi nutricionista vea esta foto para dar seguimiento a mi estado inicial.» Si la persona tiene < 18 años, la sección de foto se reemplaza por «La foto solo está disponible para mayores de 18 años.». Si ya hay foto guardada, muéstrala con `repo.getIntakePhotoUrl(session.user.id)`.
   - Validación en el cliente con mensajes bajo cada campo (rangos del contrato: peso 25–350, estatura 100–250, cintura 40–250).
   - «Guardar mi ficha» → `repo.saveMyIntake({ …, photo, remove_photo, consent_photo })` → mensaje «Ficha guardada» + `refresh()` de la sesión. Botón deshabilitado con «Guardando…».
   - Debajo, si hay ficha guardada: tarjeta «Tu estado inicial» (IMC con 1 decimal y su etiqueta, y «Estimación orientativa: ~N kcal/día» usando `buildBasicGuide` de `src/lib/nutrition/guide.ts` si sus datos alcanzan) con el aviso «Es una estimación automática; tu nutricionista te dará tu plan.»
   - Si `repo.getMyIntake()` falla con `SIN_BASE`, muestra el `ErrorState` con su mensaje (no rompas la página).


## Tests obligatorios
- `MiPanelPage.test.tsx`: `abre la pestaña de ?tab=pagos`; `con fase 2 apagada, Calendario muestra Próximamente` (mock de `../../auth/SettingsContext` o del repo `getSettings`).
- `FichaTab.test.tsx`: `valida peso fuera de rango sin llamar a saveMyIntake`; `con foto exige consentimiento`; `guarda y muestra Ficha guardada`; `menor de 18 no ve el campo de foto`.

**Tiempo:** máximo 20 minutos. Commit apenas algo funcione con gates verdes; luego sigue. Lo commiteado vale.
**Gates antes de cada commit:** `npm run -s lint` (0 errores), `npm run -s build` (exit 0), `npx vitest run` (verde). Reporta los números.

**Última línea del reporte:** `NEXT: la cadena sigue con la ronda 2.`

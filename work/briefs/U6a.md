# U6a — IMPLEMENTADOR (haiku) — Fase 3: reseñas
**Reporte:** `work/out/U6a/report.md` (qué hiciste, archivos, gates con números, «Pedidos al orquestador», pendientes).
**Commits:** empiezan con `U6a: `.
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


**Archivos que son tuyos (solo estos):** `src/components/reviews/*` (nuevos), `src/pages/LugarPage.tsx`, `src/components/panel/MiNutricionistaTab.tsx` (solo para agregar la sección de reseña) y sus tests.

## Qué construir
1. `src/components/reviews/Stars.tsx`: estrellas de solo lectura (`value`, «4,5») y `StarInput` (5 botones accesibles, `aria-label="N estrellas"`).
2. `src/components/reviews/ReviewsSection.tsx` (`{ target, targetId, canReview, title }`): dentro de `<PhaseGate phase={3} compact text="Las reseñas se habilitarán pronto.">`. Muestra promedio (`repo.getRating`) y lista (`repo.listReviews`: primer nombre, estrellas, comentario, fecha). Si `canReview` y hay sesión: formulario (estrellas obligatorias + comentario ≤1000) → `repo.saveReview` → recarga; si ya tiene una, se precarga y aparece «Borrar mi reseña» → `repo.deleteMyReview`. `NO_PERMITIDO` → «Solo puedes calificar a un nutricionista que te atendió.» Sin sesión: «Ingresa para dejar tu reseña» (enlace a `/ingresar?volver=…`).
3. `LugarPage`: agrega `<ReviewsSection target="lugar" targetId={place.id} canReview title="Reseñas" />` al final de la ficha (no cambies lo demás; «Cómo llegar» debe seguir igual).
4. `MiNutricionistaTab`: si la solicitud está `aceptada` (o el paciente tuvo una), agrega `<ReviewsSection target="nutricionista" targetId={nutricionista.id} canReview title="Califica a tu nutricionista" />`.


## Tests obligatorios
- `ReviewsSection.test.tsx`: `muestra promedio y reseñas`; `guardar llama saveReview con estrellas y comentario`; `con fase 3 apagada muestra Próximamente`; `NO_PERMITIDO muestra el mensaje`.
- `LugarPage.test.tsx`: los tests existentes siguen verdes (mockea los métodos nuevos del repo).

**Tiempo:** máximo 20 minutos. Commit apenas algo funcione con gates verdes; luego sigue. Lo commiteado vale.
**Gates antes de cada commit:** `npm run -s lint` (0 errores), `npm run -s build` (exit 0), `npx vitest run` (verde). Reporta los números.

**Última línea del reporte:** `NEXT: la cadena sigue con la ronda 4.`

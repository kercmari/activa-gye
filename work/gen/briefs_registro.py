"""Ronda 5 (22/11): registro con tipo de cuenta (paciente / nutricionista pendiente) y foto obligatoria; Nutrición como
inicio y Panel de deportes. Diseño: docs/superpowers/specs/2026-11-22-registro-rol-foto-inicio.md. Uso: python3 -I work/gen/briefs_registro.py"""
import importlib.util
from pathlib import Path
spec = importlib.util.spec_from_file_location('b4', Path(__file__).with_name('briefs_semana4.py'))
b4 = importlib.util.module_from_spec(spec); spec.loader.exec_module(b4)
b1 = b4.b1
OUT = b1.OUT
SPEC = 'docs/superpowers/specs/2026-11-22-registro-rol-foto-inicio.md'

R5 = f"""**Esta ronda (pedido de la dueña, 22/11):** lee COMPLETO `{SPEC}` antes de tocar nada. Es el contrato: nombres de columnas, funciones, métodos del `Repo`, códigos de error y textos exactos. Si algo no cuadra con el código, anótalo en «Pedidos al orquestador» y sigue con lo demás.
{b4.FASES}
**Otros agentes trabajan a la vez en otros worktrees:** toca SOLO tus archivos. No hagas push ni deploy. No toques la nube (nada de `supabase link`, `db push`, `wrangler`). No leas ni imprimas `.env*`.
"""
E2E_OWN = """Si corres e2e: con TU preview (`npm run -s build && npx vite preview --port $E2E_PORT --strictPort --host 127.0.0.1 &`) y `E2E_PORT=$E2E_PORT npx playwright test <tus archivos> --reporter=line`. Mata tu preview al terminar. No corras la suite completa ni `db reset`."""

# ---------------------------------------------------------------- RONDA 1 (a la vez)
b1.impl('XR1', 'Migración 10: tipo de cuenta, nutricionista pendiente, foto de perfil',
 '`supabase/migrations/20261122000010_registro_rol_foto.sql`, `supabase/tests/08_registro_rol_foto.sql`.',
 R5 + f"""Implementa TODA la sección 1 de `{SPEC}`. Antes lee `supabase/migrations/20261121000001_esquema_inicial.sql` (`protect_role`, `admin_set_role`, `admin_list_users`, buckets), `20261121000002_fases_ficha_solicitudes.sql` (`handle_new_user` y `get_public_settings` vigentes: cópialos y cambia solo lo pedido) y `20261122000009_permisos_nube.sql` (grants explícitos que la nube necesita: haz lo mismo para lo nuevo).
- `admin_list_users` cambia de columnas: `drop function` + `create` y repite sus grants/revokes.
- El trigger que protege `requested_role`/`nutri_status` usa el mismo `activa.allow_role_change` que `admin_set_role`.""",
 """`supabase/tests/08_registro_rol_foto.sql` (pgTAP), como mínimo:
1. Alta con `account_type='nutricionista'` → `role='usuario'`, `requested_role='nutricionista'`, `nutri_status='pendiente'`.
2. Con el cupo lleno, un paciente nuevo falla con `CUPO_LLENO` y un nutricionista nuevo SÍ entra; `get_public_settings()->>'patients_count'` no cuenta al nutricionista pendiente.
3. `account_type='otro'` → `DATOS_INVALIDOS`.
4. El propio usuario no puede cambiar `requested_role` ni `nutri_status` (error) pero sí `avatar_path`.
5. `admin_review_nutri` por un no-admin → `SOLO_ADMIN`; por admin aprobar → rol `nutricionista`, `aprobado`; rechazar → `rechazado` y sigue `usuario`; repetir sobre no pendiente → `SIN_SOLICITUD`.
6. `admin_list_users` devuelve las 3 columnas nuevas.
7. Storage `avatars`: un usuario no puede insertar en la carpeta de otro ni leerla; staff sí la lee.
Además `npx supabase test db` completo verde (01–08).""",
 'XR3 en la ronda 2', b1.SQL_RULES)

b1.impl('XR2', 'Contrato y capa de datos: tipo de cuenta, foto de perfil, aprobación del admin',
 '`src/data/types.ts`, `src/data/supabase/account.ts` (+ `account.test.ts`), `src/data/mock/accounts.ts` (+ `accounts.test.ts`), `src/data/mock/seed-users.ts` (solo si hace falta el campo nuevo), `src/lib/image.ts` (+ test). NO toques pantallas ni `supabase/`.',
 R5 + f"""Implementa TODA la sección 2 de `{SPEC}` en el simulador y en Supabase.
- En `src/lib/image.ts` añade `downscaleToBlob(file, maxSide)` reutilizando la misma validación y dibujo que `downscaleToDataUrl` (mueve lo común a una función; no copies).
- `signUp` manda `account_type` en `options.data`. Supabase: el nombre de bucket es `avatars`, ruta `<uid>/avatar.jpg`, `upsert: true`.
- La foto pendiente (`activa.fotoPendiente.<correo>`) se sube en `signIn` y se borra; si falla, no rompe el ingreso.
- Mapea las columnas nuevas de `profiles` y de `admin_list_users`.
- Mantén compilando a quien ya llama `signUp` (los tests de pantalla los arregla otro agente; si `RegistroPage.tsx` deja de compilar por el campo nuevo, añade ahí SOLO `account_type: 'paciente'` y `photo` provisional y avisa en el reporte).""",
 """Vitest (simulador y Supabase con el cliente simulado como ya hacen los tests de `account.test.ts`):
1. signUp sin foto → `FOTO_REQUERIDA`; foto de tipo inválido → `FOTO_INVALIDA`, y en ambos casos NO se crea la cuenta.
2. signUp nutricionista con cupo lleno → entra, perfil `nutri_status='pendiente'`; paciente con cupo lleno → `CUPO_LLENO`.
3. signUp con sesión sube la foto y guarda `avatar_path`; sin sesión guarda la foto pendiente y `signIn` la sube y borra la clave.
4. `uploadAvatar` reemplaza la foto; `avatarUrl(null)` → `null`.
5. `adminReviewNutri` aprobar/rechazar en el simulador cambia rol y estado; no admin → error.""",
 'XR3 en la ronda 2')

b1.impl('XR4', 'Nutrición como inicio y Panel de deportes',
 '`src/App.tsx`, `src/pages/HomePage.tsx`, `src/pages/NutricionPage.tsx`, `src/pages/DeportesPage.tsx`, páginas nuevas que crees en `src/pages/` para esto, `src/components/home/*`, `src/components/layout/Header.tsx` y `Footer.tsx` (SOLO los enlaces del menú y del pie; el círculo de cuenta es de otro agente), y sus `*.test.tsx`.',
 R5 + f"""Implementa la parte «Inicio `/`», «Panel de deportes» y «Menú» de la sección 3 de `{SPEC}`.
- Mueve, no copies: el contenido del inicio actual pasa a la página del Panel de deportes (renombra el archivo con `git mv` si conviene) y la página de Nutrición se convierte en la portada. `/nutricion` → `<Navigate to="/" replace />`.
- La portada respeta las fases igual que hoy `NutricionPage` (con fase 2 apagada solo el paso de la ficha, sin «Próximamente»). Botones «Soy paciente» / «Soy nutricionista» a `/registro?tipo=…`; con sesión «Ir a mi ficha».
- Héroe con imagen: usa `/img/hero.jpg` u otra que ya exista en `public/img/` (no inventes archivos).
- Guía es de fase 1 y es de nutrición: queda en el menú principal.
- Revisa que ningún enlace interno quede apuntando a `/nutricion` ni al inicio viejo esperando el buscador (`grep -rn "'/nutricion'\\|\\"/nutricion\\"" src`).""",
 """Vitest:
1. `/` muestra la portada de Nutrición con los dos botones y sus `href` exactos; con sesión muestra «Ir a mi ficha».
2. `/nutricion` redirige a `/`.
3. `/deportes` muestra el buscador, «Explora por deporte» y «Lugares recomendados».
4. Menú de escritorio y móvil: Inicio, Deportes, Guía, Conócenos, Contacto (sin «Nutricionista» ni «Buscar lugares» sueltos); fase 2 apagada sigue sin enlaces de fase 2.
5. Tests viejos de Home/Nutrición/Header/Footer actualizados a la conducta nueva (sin borrar aserciones que sigan valiendo).""",
 'XR3 en la ronda 2')

# ---------------------------------------------------------------- RONDA 2
b1.impl('XR3', 'Pantallas: registro con tipo de cuenta y foto, perfil con foto, encabezado y aprobación en Admin',
 '`src/pages/RegistroPage.tsx`, `src/pages/PerfilPage.tsx`, `src/pages/PerfilEditarPage.tsx`, `src/pages/admin/AdminUsuariosPage.tsx`, `src/components/layout/Header.tsx` (SOLO el círculo/menú de cuenta), `src/components/profile/*` (componentes nuevos de foto), y sus `*.test.tsx`.',
 R5 + f"""Implementa las pantallas de la sección 3 de `{SPEC}` (Registro, después del registro, Perfil, Editar perfil, Encabezado, Admin → Usuarios). El contrato del `Repo` ya está en `src/data/types.ts` (XR2) y la base en la migración 10 (XR1): úsalos tal cual.
- Un solo componente de foto (`src/components/profile/AvatarField.tsx`: elegir, vista previa, cambiar, error) usado en Registro y Editar perfil; un `Avatar` (foto o inicial) usado en Encabezado, Perfil y Admin. Mira `src/components/panel/FichaFoto.tsx` para el estilo; no lo cambies.
- Las tarjetas-radio de tipo de cuenta son `<input type="radio">` reales con `<label>` (teclado y lector de pantalla).
- Valida en el cliente con los mismos textos del contrato; el error de foto va debajo de su campo.
- Si XR2 dejó en `RegistroPage.tsx` valores provisionales, reemplázalos.""",
 """Vitest:
1. Registro sin foto → «Agrega una foto tuya.» y no llama a `signUp`.
2. `?tipo=nutricionista` preselecciona; nutricionista con cupo lleno puede enviar y ve el aviso de revisión; paciente con cupo lleno no.
3. Registro paciente → `/mi-panel`; nutricionista → `/perfil` con «Tu solicitud de nutricionista está en revisión».
4. Perfil muestra la foto (o «Agrega tu foto»); Editar perfil la cambia con `uploadAvatar`.
5. Encabezado muestra la foto si hay `avatar_path`.
6. Admin → Usuarios: bloque «Solicitudes de nutricionista», Aprobar y Rechazar con confirmación llaman a `adminReviewNutri` y refrescan.""",
 'XR5 en la ronda 3')

# ---------------------------------------------------------------- RONDA 3
b1.impl('XR5', 'e2e del registro nuevo, la portada y el panel de deportes',
 '`e2e/*.spec.ts`, `e2e/helpers.ts`, `e2e/fixtures/*`. NO toques `src/` ni `supabase/` (si encuentras un fallo de la app, anótalo en «Pedidos al orquestador» con archivo:línea).',
 R5 + E2E_OWN + f"""
1. `e2e/helpers.ts`: el alta de pruebas elige tipo de cuenta y sube `e2e/fixtures/cuerpo.jpg` (o una foto pequeña nueva en `e2e/fixtures/`). Todos los specs que registran usuarios siguen pasando.
2. Nuevo `e2e/registro.spec.ts`: paciente con foto → `/mi-panel` y la foto aparece en el encabezado; sin foto → error en el campo; nutricionista → `/perfil` con el aviso; admin aprueba la solicitud (cuentas en `docs/entrega/CUENTAS-DE-PRUEBA.md`) y al volver a ingresar ve «Panel nutricionista» si la fase lo permite (si la fase 2 está apagada, comprueba solo que el rol cambió en Admin → Usuarios).
3. Actualiza `navegacion.spec.ts`, `nutricion.spec.ts`, `fase1.spec.ts` y los que naveguen por el menú viejo a la portada y al Panel de deportes nuevos.
4. **Repetibles:** cada prueba usa correos únicos (`Date.now()`) y no depende de lo que dejó otra; corre tus archivos dos veces seguidas sin `db reset` y ambas veces verde. Arregla de paso `semana.spec.ts:141` (filtra `/admin/pagos` por el paciente de esa prueba o salta el paso si la suscripción ya está activa; ver `work/out/RE4b/report.md`) y mira por qué fallaron `fase1.spec.ts:49` y `fase2.spec.ts:42 [desktop]` en `work/out/E2E-R4c-limpia.txt`: si es la prueba, arréglala; si es la app, pedido al orquestador.""",
 """Tus archivos e2e verdes dos veces seguidas con tu preview (pega el resumen de ambas corridas en el reporte). Gates normales (lint, build, vitest) verdes.""",
 'la suite completa y la revisión RE5')


def review(name, title, scope, falsify):
    text = f"""# {name} — REVISOR (opus) — {title}
**Reglas:** solo revisar: nunca edites, nunca commit, nunca push. Sigue `work/TOKEN-PROTOCOL.md` (regla 3). **Máximo 15 minutos: escribe el informe en los primeros 5 minutos con el veredicto arriba y reescríbelo tras cada paso.**
**Hallazgos:** `work/out/{name}/report.md`
**Lee:** `{SPEC}` (el contrato de esta ronda), `src/data/types.ts`, los reportes `work/out/XR*/report.md` y `git log --oneline -30`.
**Alcance:** {scope}
**Mide, no confíes en los reportes.** Gates: `npm run -s lint`, `npm run -s build`, `npx vitest run`, `npx supabase test db`. La suite e2e completa ya la corrió el orquestador sobre main: lee `work/out/E2E-R5.txt` (no la repitas entera; puedes correr un archivo con tu propio `vite preview --port $E2E_PORT`). NO hagas `db reset`, `start` ni `stop`. Cuentas: `docs/entrega/CUENTAS-DE-PRUEBA.md`.
**Intenta romper:**
{falsify}
**Veredicto:** la línea `## Verdict: **SHIP**` o `## Verdict: **DO NOT SHIP**` (inglés, exacto). DO NOT SHIP solo por: alguien se vuelve nutricionista sin aprobación del admin; un usuario ve la foto o datos de otro; se crea una cuenta sin foto; el cupo frena a un nutricionista o deja pasar a un paciente; una fase apagada se ve; botón sin acción; pantalla sin salida; crash; gate rojo; e2e rojo por la app. Luego `HOTFIX NOW` / `BLOCKING` (archivo:línea + cómo reproducir + arreglo sugerido) / `non-blocking`. A cada BLOCKING ponle área: `[sql]`, `[datos]`, `[registro]`, `[inicio]`, `[admin]`, `[e2e]`.
**Última línea:** `NEXT: el orquestador lee {name}.`
"""
    (OUT / f'{name}.md').write_text(text)


FALSIFY = """- Como usuario normal: `update profiles set role='nutricionista'` / `requested_role` / `nutri_status` con el cliente anon+JWT, `rpc('admin_review_nutri')`, `rpc('admin_set_role')`: todo debe fallar.
- Registro: sin foto, foto de 6 MB, PDF renombrado `.jpg`, `account_type` manipulado en la petición, nutricionista con cupo lleno, paciente con cupo lleno, menor de 16; flujo sin sesión (foto pendiente) en el simulador.
- Storage: subir a `avatars/<otro-uid>/`, leer la foto de otro sin ser staff.
- Admin → Usuarios: aprobar, rechazar, doble clic, lista que se refresca; el aprobado entra a lo que su fase permite.
- Portada `/` y `/deportes` a 360 y 1280 px (Chrome real con `vite preview`): sin desborde horizontal, 0 errores de consola, todos los enlaces del menú, del pie y de las dos páginas llevan a algo; `/nutricion` redirige.
- Fase 2 apagada (como en la nube): nada de fase 2 a la vista en la portada, el menú ni el registro."""

review('RE5', 'Registro con tipo de cuenta y foto; Nutrición como inicio', 'todo lo de las rondas XR1–XR5 (`git log` desde 431e518).', FALSIFY)

b1.impl('XR6', 'Arreglos de RE5',
 'los archivos que nombre cada BLOCKING de `work/out/RE5/report.md` (y sus tests). Nada más.',
 R5 + E2E_OWN + """
Lee `work/out/RE5/report.md` y arregla **todos** sus HOTFIX NOW y BLOCKING exactamente como sugiere, cada uno con un test que falla sin el arreglo. Si un arreglo toca la base: migración NUEVA `supabase/migrations/20261122000011_arreglos_registro.sql` (nunca edites la 10 si ya está en main… salvo que RE5 diga que la 10 nunca salió de local: entonces corrígela en su sitio) y pruebas en `supabase/tests/08_registro_rol_foto.sql`; para eso `npx supabase db reset` + `npx supabase test db` (tienes la base local para ti solo en esta ronda).""",
 'Cada BLOCKING de RE5 con su test; gates verdes; los e2e que nombre RE5, verdes con tu preview.',
 'la re-revisión RE5b')

(OUT / 'RE5b.md').write_text((OUT / 'RE5.md').read_text()
  .replace('RE5 — REVISOR', 'RE5b — REVISOR').replace('work/out/RE5/report.md', 'work/out/RE5b/report.md')
  .replace('**Lee:** ', '**Lee primero:** `work/out/RE5/report.md` (verifica cada BLOCKING arreglado, medido igual que se encontró) y `work/out/XR6/report.md`. **También:** ')
  .replace('E2E-R5.txt', 'E2E-R5b.txt').replace('el orquestador lee RE5.', 'el orquestador lee RE5b.'))
print('ok registro')

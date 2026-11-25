# Ronda 8 (25/11/2026): dejar VITGO listo para publicar tras RV3 DO NOT SHIP.
from pathlib import Path
OUT = Path(__file__).resolve().parents[1] / 'briefs'
xv = (OUT / 'XV.md').read_text().splitlines()
# Encabezado común: Proyecto … Otros agentes (líneas 4-23 + 27-30 de XV.md)
comun = '\n'.join(xv[3:23] + xv[26:30])
LEE = ('**Lee además:** `work/out/RV3/report.md` (última revisión, manda), `work/out/RV3-v1/report.md`, '
       '`work/out/RV1/report.md`, `work/out/RV2/report.md`, `work/out/E2E-RX2.txt` (última e2e, cortada en 36/66 con 11 rojos). `git log --oneline -15`.')
E2E = ('Si corres e2e: con TU preview (`npm run -s build && (npx vite preview --port $E2E_PORT --strictPort --host 127.0.0.1 > /dev/null 2>&1 &)`) '
       'y `E2E_PORT=$E2E_PORT npx playwright test <archivo> --reporter=line`; mata tu preview por PID (nunca `pkill -f`).')
FIN = ('\n**Tiempo:** máximo 20 minutos. Commit apenas algo funcione con gates verdes; luego sigue. Lo commiteado vale.\n'
       '**Gates antes de cada commit:** `npm run -s lint` (0 errores), `npm run -s build` (exit 0), `npx vitest run` (verde). Reporta los números.\n'
       '**Commits sin la línea `Co-Authored-By`** (regla de la dueña). No cambies el autor.\n')

def impl(id_, titulo, cuerpo, nxt):
    return (f'# {id_} — IMPLEMENTADOR (haiku) — {titulo}\n**Reporte:** `work/out/{id_}/report.md` (qué hiciste, archivos, gates con números, «Pedidos al orquestador», pendientes).\n'
            f'**Commits:** empiezan con `{id_}: `.\n{comun}\n{LEE}\n\n{cuerpo}\n{FIN}\n**Última línea del reporte:** `NEXT: {nxt}`\n')

XW1 = impl('XW1', 'e2e en verde', f'''**Archivos que son tuyos (solo estos):** `e2e/**`, `src/pages/nutri/PacientePage.tsx` (y su test). NO toques `src/components/panel/PagosTab.tsx`, `src/data/supabase/errors.ts`, `src/pages/plan/**`, `supabase/**` (son de XW2, que trabaja a la vez).
**La base local es compartida con XW2:** NO hagas `db reset`. Puedes correr specs que cambian `app_settings` (las protege el candado de fases); deja las fases como estaban (1 on, 2 off, 3 off).

## Qué arreglar (RV3 BLOCKING 1 y 2)
1. **Botón «Nueva receta» repetido** (`PacientePage.tsx:279` y `:314`): con la lista vacía hay dos. Quita la `action` del `EmptyState` (deja el mensaje) para que haya uno solo; test Vitest que con 0 recetas hay exactamente 1 botón «Nueva receta». `e2e/fase2.spec.ts:94` queda con un solo botón (no uses `.first()` como parche).
2. **Candado huérfano** en `e2e/helpers.ts` `conCandadoDeFases`: además de la espera, libera el candado si su **edad** (`statSync(CANDADO).mtimeMs`) pasa de 10 minutos (un proceso muerto). Sin bajar la seguridad: un candado joven se sigue esperando.
3. **Cada spec que salió rojo en `E2E-RX2.txt`** (cuenta, desborde, fase1, fase2, fase3, navegacion, guia, registro ×3, y su versión mobile): córrelo SOLO (`--project=desktop` primero) y clasifícalo: (a) prueba vieja frente a la UI nueva → actualiza la prueba sin quitar aserciones de lo que el usuario ve; (b) falla de la app → arréglala si está en tus archivos, si no anótala en «Pedidos al orquestador» con archivo:línea; (c) entorno (candado, cupo de registro): `registro.spec.ts`/`cuenta.spec.ts` deben asegurar cupo como `registrarCon`. Prioridad: fase2 > registro/cuenta > fase1/navegacion/desborde > fase3/guia.
{E2E}
En el reporte: tabla spec → verde / rojo (causa) / no corrido.''', 'la cadena corre la e2e completa y las revisiones RW1 ‖ RW2.')

XW2 = impl('XW2', 'pulido de seguridad y textos', '''**Archivos que son tuyos (solo estos):** `supabase/migrations/20261125000015_permisos_recetas.sql` (NUEVA), `supabase/tests/12_permisos_recetas.sql` (NUEVA), `src/data/supabase/errors.ts` (y su test), `src/components/panel/PagosTab.tsx` (y su test), `src/pages/plan/SuscribirmePage.tsx` y `src/pages/nutri/SuscripcionPage.tsx` (y sus tests), `src/pages/admin/AdminSuscripcionesPage.tsx`. NO toques `e2e/**` ni `PacientePage.tsx` (son de XW1).
**La base local es compartida con XW1 (que corre e2e):** NO hagas `db reset`. Aplica tu migración con `docker exec -i supabase_db_activa-gye psql -U postgres -v ON_ERROR_STOP=1 < supabase/migrations/20261125000015_permisos_recetas.sql` (escríbela idempotente: `revoke`/`grant`/`create or replace`) y prueba con `npx supabase test db` (cada archivo corre en su transacción). No cambies `app_settings` fuera de una transacción.

## Qué arreglar (non-blocking de RV1/RV3, todos baratos)
1. **[sql] Grants:** `nutri_daily_limit(uuid)`, `nutri_patient_quota(uuid)`, `nutri_records_today(uuid)` y `recipe_status(uuid)` hoy los ejecuta cualquier `authenticated` con un uid ajeno. Mira con `grep -rn` en `src/` y `supabase/migrations/` quién los llama: si solo los usan otras funciones `security definer`, `revoke execute ... from public, anon, authenticated`; si el cliente los llama, que con `p_user <> auth.uid() and not is_admin()` devuelvan error `NO_PERMITIDO`. pgTAP: un paciente no puede leer el límite/uso de una nutricionista; la nutricionista sí el suyo; el flujo de entregar receta sigue funcionando (descuenta saldo).
2. **[paciente] `PagosTab.tsx:62-64`:** «Pendiente por pagar» no suma facturas de suscripción (esas van a la administración); test Vitest.
3. **Textos:** `errors.ts:36` no dice un número fijo («sus 10 recetas»): mensaje sin cifra o con el límite real si llega. `SuscribirmePage.tsx` y `nutri/SuscripcionPage.tsx`: «al confirmar tu transferencia» → «al confirmar tu pago». `AdminSuscripcionesPage.tsx:82,145`: sin la palabra «transferencia» («pago»).
4. **[paciente] `/mi-plan/suscripcion` con fase 2 apagada:** no se ve la cabecera «Suscripción — …» encima del `PhaseGate`; solo el candado con salida (y que a 360 px el botón no quede bajo la barra inferior: deja espacio abajo). Test Vitest con fase 2 apagada.''', 'la cadena corre la e2e completa y las revisiones RW1 ‖ RW2.')

XW3 = impl('XW3', 'arreglos de la revisión', f'''**Archivos que son tuyos:** los que nombren en sus BLOCKING `work/out/RW1/report.md`, `work/out/RW2/report.md` (y en la segunda vuelta `work/out/RW3-v1/report.md`). SQL solo en una migración NUEVA `supabase/migrations/20261125000016_arreglos_ronda8.sql` con prueba `supabase/tests/13_arreglos_ronda8.sql`. Tienes la base local para ti: `npx supabase db reset` y `npx supabase test db` permitidos.
**Lee además:** `work/out/E2E-RW.txt` (y `E2E-RW2.txt` si existe), `work/out/XW1/report.md`, `work/out/XW2/report.md`.
Arregla CADA BLOCKING con el cambio mínimo y su prueba; luego non-blocking baratos (≤ 10 min). Para e2e rojos: corre el spec solo, clasifica (prueba vieja / app / entorno) y arregla. {E2E}
En el reporte, tabla hallazgo → arreglado (archivo:línea) / no reproducido (evidencia).''', 'la cadena corre la e2e completa y la re-revisión RW3.')

def rev(id_, titulo, alcance, e2efile, extra_lee=''):
    return f'''# {id_} — REVISOR (opus) — {titulo}
**Reglas:** solo revisar: nunca edites código, nunca commit, nunca push, nunca la nube. Sigue `work/TOKEN-PROTOCOL.md` (regla 3). **Máximo 15 minutos: informe escrito en los primeros 5 y reescrito tras cada paso.**
**Hallazgos:** `work/out/{id_}/report.md`
**Lee:** `docs/superpowers/specs/2026-11-24-recetas-planes-suscripcion.md` (manda), `work/out/RV3/report.md` (revisión anterior), `work/out/{{XW1,XW2,XW3}}/report.md` que existan, `work/out/gate-*.txt` y `work/out/{e2efile}` (suite e2e completa ya medida sobre este main: no la repitas). {extra_lee}`git log --oneline -20`.
**Alcance:** {alcance}
**NO hagas** `db reset`/`start`/`stop` ni la suite e2e completa. SQL: `docker exec supabase_db_activa-gye psql -U postgres -c "begin; ...; rollback;"` (con `set local role authenticated; set local request.jwt.claims = '{{"sub":"<uid>","role":"authenticated"}}';`). Navegador: TU preview en `$E2E_PORT` (`npm run -s build && (npx vite preview --port $E2E_PORT --strictPort --host 127.0.0.1 > /dev/null 2>&1 &)`), script Playwright propio en `work/out/{id_}/`, capturas a 360 y 1280; mátalo por PID. Cuentas: `docs/entrega/CUENTAS-DE-PRUEBA.md`. No cambies `app_settings` (otro revisor trabaja a la vez); si necesitas fase 2, hazlo en una transacción con rollback o anótalo como no revisado.
**Intenta romper:** revisa los diffs de XW1/XW2/XW3 (`git log -p`) buscando pruebas debilitadas (aserciones quitadas, `.first()` de parche, timeouts inflados, `test.skip` nuevos).
**Veredicto:** `## Verdict: **SHIP**` o `## Verdict: **DO NOT SHIP**` (inglés, exacto). DO NOT SHIP solo por: algo de «Lo que no debe pasar» del diseño; un límite que se puede saltar; un paciente ve un borrador o datos de otro; doble descuento o doble activación; botón sin acción; pantalla sin salida; crash; gate rojo; e2e rojo por la app o prueba rota; datos bancarios o formulario de pago visibles; algo de fase 2 visible con la fase apagada; prueba debilitada. Un e2e intermitente por entorno con evidencia NO bloquea si al correrlo solo pasa. Luego `BLOCKING` (archivo:línea + cómo reproducir + arreglo sugerido, área `[sql]` `[datos]` `[admin]` `[nutri]` `[paciente]` `[e2e]`) / `non-blocking` / `no revisado`.
**Última línea:** `NEXT: el orquestador lee {id_}.`
'''

RW1 = rev('RW1', 'gates, e2e y base', 'gates (lint/build/vitest/db test) y la e2e completa: ¿todo verde? Para cada rojo, corre ese spec solo (sí puedes, con tu puerto; si cambia fases usa el candado del helper) y di si es app, prueba o entorno. SQL de XW2: los 4 grants cerrados de verdad (prueba como paciente y como nutricionista ajena), entregar receta sigue descontando, límite diario con candado sigue. `e2e/helpers.ts`: el candado por edad no deja correr dos specs de fases a la vez.', 'E2E-RW.txt')
RW2 = rev('RW2', 'pantallas', 'pantallas de admin, nutri y paciente a 360 y 1280 con las fases como están (1 on, 2 off, 3 off): nada de fase 2 visible, sin scroll horizontal, sin errores de consola, sin «transferencia»/«comprobante»/«Informar pago» en suscripciones; ficha del paciente → Recetas con lista vacía tiene UN solo «Nueva receta» (revisa el código si no llegas con fase 2); `/mi-plan/suscripcion` con fase 2 apagada solo muestra el candado con salida; «Pendiente por pagar» no suma la suscripción (código + test).', 'E2E-RW.txt')
RW3 = rev('RW3', 're-revisión tras los arreglos', 'cada BLOCKING de RW1 y RW2: ¿arreglado de verdad? (mide, no confíes en XW3). Gates y la e2e más reciente (`E2E-RW2.txt`) en verde; para cada rojo corre ese spec solo y clasifícalo.', 'E2E-RW2.txt', '`work/out/{RW1,RW2,RW3-v1}/report.md` que existan, ')

for k, v in dict(XW1=XW1, XW2=XW2, XW3=XW3, RW1=RW1, RW2=RW2, RW3=RW3).items():
    (OUT / f'{k}.md').write_text(v)
print('ok')

"""Ronda 4 (22/11, entrega del lunes): fases apagadas = vistas ocultas; cada fase se muestra con un cambio en la base
(app_settings). Más 3 arreglos vistos en la página publicada."""
import importlib.util
from pathlib import Path
spec = importlib.util.spec_from_file_location('b1', Path(__file__).with_name('briefs_semana.py'))
b1 = importlib.util.module_from_spec(spec); spec.loader.exec_module(b1)

FASES = """**Regla de la dueña (entrega del lunes con solo la fase 1):** cuando una fase está apagada en `app_settings`, sus **vistas no se ven**: ni enlaces en menús (escritorio, móvil, menú de cuenta, pie de página), ni pestañas, ni botones, tarjetas o pasos «Próximamente» que anuncien lo que viene. Al encender la fase en la base (`update public.app_settings set phase2 = true where id = 1;` o Admin → Fases) y recargar, todo vuelve a aparecer. Si alguien abre a mano la URL de una vista apagada, sigue viendo el `PhaseGate` con salida (no se rompe ni da 404 en blanco). La base NO cambia (ya bloquea por detrás). Fuente de verdad: `usePhase(n)` de `src/auth/SettingsContext.tsx` (mientras carga asume solo fase 1: nunca muestra de más).
**Qué es de cada fase** (README «Entrega por fases»): fase 1 = inicio, lugares, deportes, conócenos, contacto, guía, registro/ingreso, perfil, favoritos, progreso de peso, ficha, semana gratis (Mi plan: Hoy, Agenda, Progreso). Fase 2 = solicitar nutricionista, notificaciones, Mi panel (calendario, pagos, mi nutricionista), Mi plan → Suscripción, día 8+ de la Agenda, panel del nutricionista, Admin → Pagos. Fase 3 = reseñas, reporte PDF, Admin → Datos de lugares, registro abierto."""

b1.impl('XU4a', 'Vistas ocultas por fase + logo del encabezado',
 '`src/components/layout/Header.tsx`, `src/components/layout/Footer.tsx`, `src/pages/panel/MiPanelPage.tsx`, `src/pages/NutricionPage.tsx`, `src/pages/HomePage.tsx` (o la página de inicio que exista), `src/pages/PerfilPage.tsx` (solo enlaces), `src/components/plan/PlanShell.tsx` (pestaña Suscripción), `src/pages/plan/AgendaPage.tsx` y `src/pages/plan/HoyPage.tsx` (solo los enlaces/tarjetas de suscripción), `src/components/admin/AdminShell.tsx`, sus tests, `e2e/navegacion.spec.ts` y las e2e que dependan de esos enlaces, y en `README.md` SOLO la sección «Cómo encender las fases». NO toques `supabase/` ni `src/pages/IngresarPage.tsx`/`RegistroPage.tsx`.',
 FASES + """

Haz:
1. Recorre con `grep -rn "usePhase\\|PhaseGate\\|Próximamente\\|soon" src` y cada enlace a rutas de fase 2/3 (`/mi-panel`, `/notificaciones`, `/nutri`, `/mi-plan/suscripcion`, `/admin/pagos`, `/admin/datos-lugares`, la campana de avisos). Con la fase apagada: no se renderiza. Ejemplos: «Nutricionista» (`/nutricion`) se queda (la ficha es fase 1) pero sin los pasos «Próximamente» de fase 2; «Mi panel» y «Notificaciones» salen del menú de cuenta con fase 2 apagada; en Mi plan la pestaña «Suscripción» y el muro del día 8 no anuncian nada con fase 2 apagada (el día 7 completado dice que su semana terminó, sin botón muerto); en `/mi-panel` (si se abre a mano) solo pestañas de fase 1.
2. **Logo:** con sesión cerrada a 1280 px el logo se ve «ACTIVA G…» (truncado). Debe verse «ACTIVA GYE» completo a 1280 px y no desbordar a 360 px (mantén la prueba `e2e/desborde.spec.ts` verde). Pista: el logo `shrink-0`, y que sea el menú el que se ajuste (gap menor entre 1024–1279 px, o el botón «Explorar actividades» solo desde 1440 px).
3. **README «Cómo encender las fases»:** agrega cómo mostrar cada fase con un cambio en la base desde Supabase → SQL Editor: `update public.app_settings set phase2 = true where id = 1;` (y `phase3`, y volver a `false`), que basta recargar la página, y que con una fase apagada sus vistas no se ven.""",
 """- Vitest: Header con fase 2 apagada NO muestra «Mi panel», «Notificaciones» ni la campana; con fase 2 encendida sí. MiPanelPage con fase 2 apagada no muestra pestañas de fase 2. NutricionPage con fase 2 apagada no muestra «Próximamente». PlanShell sin pestaña Suscripción con fase 2 apagada.
- e2e: actualiza `navegacion.spec.ts` para que pruebe los enlaces visibles con la fase 1 sola. Verifica con TU preview: `npm run -s build && npx vite preview --port $E2E_PORT --strictPort --host 127.0.0.1 &` y `E2E_PORT=$E2E_PORT npx playwright test e2e/navegacion.spec.ts e2e/desborde.spec.ts --reporter=line`. Mata tu preview. No corras la suite completa ni `db reset`.""",
 'la revisión RE4')

b1.impl('XU4b', 'Ingreso y registro en la página publicada',
 '`src/pages/IngresarPage.tsx`, `src/pages/RegistroPage.tsx` (o la página de registro que exista), `src/data/supabase/account.ts` SOLO si hace falta para distinguir el aviso, y sus tests. NO toques `supabase/`, `Header.tsx` ni el README.',
 """1. **«Cuentas de prueba»** (`IngresarPage.tsx:91-100`): esas cuentas solo existen en la base local. En la página publicada (Supabase en la nube) es texto falso. Muéstralo SOLO si no hay `VITE_SUPABASE_URL` (modo de prueba) o si su host es `127.0.0.1`/`localhost`. Haz una función pequeña y probada (p. ej. `esBaseLocal(url)`).
2. **Registro con confirmación de correo:** al crear la cuenta en la nube, `signUp` termina en `CORREO_SIN_CONFIRMAR` («Revisa tu correo para confirmar la cuenta y luego inicia sesión.») y la página lo pinta en ROJO como error. Es un aviso bueno: muéstralo como éxito/información (verde o azul, `role="status"`), con el formulario ya enviado (sin volver a enviar) y un enlace «Ir a ingresar». En el ingreso, el mismo código sí sigue como aviso (no error rojo) diciendo que falta confirmar el correo.""",
 """- Vitest: `esBaseLocal` con `undefined`, `http://127.0.0.1:54321`, `http://localhost:54321` → true; `https://abc.supabase.co` → false. IngresarPage con URL de la nube no muestra «Cuentas de prueba». RegistroPage: cuando el repo lanza `CORREO_SIN_CONFIRMAR`, se ve el aviso con `role="status"` (no `role="alert"`) y el enlace «Ir a ingresar».""",
 'la revisión RE4')

(b1.OUT / 'RE4.md').write_text("""# RE4 — REVISOR (opus) — Fases ocultas y arreglos de la página publicada
**Reglas:** solo revisar: nunca edites, nunca commit, nunca push. Sigue `work/TOKEN-PROTOCOL.md` (regla 3). **Máximo 15 minutos: escribe el informe a los 12.**
**Hallazgos:** `work/out/RE4/report.md`
**Lee:** `work/briefs/XU4a.md` y `work/briefs/XU4b.md` (lo pedido), `work/out/XU4a/report.md`, `work/out/XU4b/report.md`, `work/out/E2E-R4-final.txt` (suite e2e completa ya medida sobre este main) y `work/out/gate-*.txt`. Diff: `git log -p -8 -- src e2e README.md`.
**NO corras** la suite e2e completa, ni `db reset`/`start`/`stop`, ni lint/build/vitest (ya medidos). Si necesitas navegador: `npm run -s build && npx vite preview --port $E2E_PORT --strictPort --host 127.0.0.1 &` (tu puerto) y un script de Playwright corto; mata tu preview. Cuentas: `docs/entrega/CUENTAS-DE-PRUEBA.md`. La base local tiene solo la fase 1 encendida: NO cambies fases salvo dentro de `conCandadoDeFases` y devolviéndolas a fase 1 sola.
**Intenta romper:**
- Con solo fase 1, como visitante, paciente, nutricionista y admin, a 360 y 1280 px: ¿queda algún enlace, pestaña, botón o «Próximamente» que anuncie fase 2/3? ¿algún botón muerto o pantalla sin salida (p. ej. día 7 completado, `/nutricion`)?
- Abrir a mano `/mi-panel`, `/notificaciones`, `/nutri`, `/mi-plan/suscripcion`, `/admin/pagos`: ¿sale el PhaseGate con salida, sin crash?
- ¿Encender fase 2 (y 3) vuelve a mostrar todo? (léelo en las pruebas y el código; si lo pruebas en vivo, devuélvelo a fase 1 sola).
- Logo «ACTIVA GYE» completo a 1280 px sin sesión; sin desborde a 360 px.
- Ingreso en modo nube sin «Cuentas de prueba»; aviso de confirmación de correo en verde/azul con `role="status"`.
- ¿Alguna prueba debilitada o borrada para que pase?
**Veredicto:** `## Verdict: **SHIP**` o `## Verdict: **DO NOT SHIP**` (inglés, exacto). DO NOT SHIP solo por: vista de fase apagada visible, botón sin acción, pantalla sin salida, crash, gate o e2e rojo, texto falso visible, prueba debilitada. Luego `BLOCKING` (archivo:línea + cómo reproducir + arreglo) / `non-blocking`.
**Última línea:** `NEXT: el orquestador lee RE4.`
""")
print('ok r4')

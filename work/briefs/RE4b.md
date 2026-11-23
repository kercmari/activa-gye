# RE4b — REVISOR (opus) — Fases ocultas y arreglos de la página publicada
**Reglas:** solo revisar: nunca edites, nunca commit, nunca push. Sigue `work/TOKEN-PROTOCOL.md` (regla 3). **Máximo 15 minutos: escribe el informe a los 12.**
**Hallazgos:** `work/out/RE4b/report.md`
**Lee primero:** `work/out/RE4/report.md` (4 BLOCKING de la ronda anterior: verifica cada uno arreglado), `work/briefs/XU4c.md`, `work/out/XU4c/report.md`. **También:** `work/briefs/XU4a.md` y `work/briefs/XU4b.md` (lo pedido), `work/out/XU4a/report.md`, `work/out/XU4b/report.md`, `work/out/E2E-R4b-final.txt` (suite e2e completa ya medida sobre este main) y `work/out/gate-*.txt`. Diff: `git log -p -8 -- src e2e README.md`.
**NO corras** la suite e2e completa, ni `db reset`/`start`/`stop`, ni lint/build/vitest (ya medidos). Si necesitas navegador: `npm run -s build && npx vite preview --port $E2E_PORT --strictPort --host 127.0.0.1 &` (tu puerto) y un script de Playwright corto; mata tu preview. Cuentas: `docs/entrega/CUENTAS-DE-PRUEBA.md`. La base local tiene solo la fase 1 encendida: NO cambies fases salvo dentro de `conCandadoDeFases` y devolviéndolas a fase 1 sola.
**Intenta romper:**
- Con solo fase 1, como visitante, paciente, nutricionista y admin, a 360 y 1280 px: ¿queda algún enlace, pestaña, botón o «Próximamente» que anuncie fase 2/3? ¿algún botón muerto o pantalla sin salida (p. ej. día 7 completado, `/nutricion`)?
- Abrir a mano `/mi-panel`, `/notificaciones`, `/nutri`, `/mi-plan/suscripcion`, `/admin/pagos`: ¿sale el PhaseGate con salida, sin crash?
- ¿Encender fase 2 (y 3) vuelve a mostrar todo? (léelo en las pruebas y el código; si lo pruebas en vivo, devuélvelo a fase 1 sola).
- Logo «ACTIVA GYE» completo a 1280 px sin sesión; sin desborde a 360 px.
- Ingreso en modo nube sin «Cuentas de prueba»; aviso de confirmación de correo en verde/azul con `role="status"`.
- ¿Alguna prueba debilitada o borrada para que pase?
**Veredicto:** `## Verdict: **SHIP**` o `## Verdict: **DO NOT SHIP**` (inglés, exacto). DO NOT SHIP solo por: vista de fase apagada visible, botón sin acción, pantalla sin salida, crash, gate o e2e rojo, texto falso visible, prueba debilitada. Luego `BLOCKING` (archivo:línea + cómo reproducir + arreglo) / `non-blocking`.
**Última línea:** `NEXT: el orquestador lee RE4b.`

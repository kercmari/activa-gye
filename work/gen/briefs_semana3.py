"""Ronda 3 (22/11): única falla que queda = e2e fase2 asume calendario sin suscripción del paciente.
Decisión (diseño §3.3, aprobado): la agenda pagada exige suscripción → se ajusta la prueba, NO la base."""
import importlib.util
from pathlib import Path
spec = importlib.util.spec_from_file_location('b2', Path(__file__).with_name('briefs_semana2.py'))
b2 = importlib.util.module_from_spec(spec); spec.loader.exec_module(b2)

b2.impl('XU3', 'e2e de fase 2 con suscripción del paciente y candado de fases',
 '`e2e/fase2.spec.ts`, `e2e/helpers.ts` (agregar), `e2e/fase3.spec.ts` y `e2e/guia.spec.ts` (solo timeouts de hooks). NO toques `src/` ni `supabase/`.',
 """Lee `work/out/RT2/report.md`, `work/out/RU2a/report.md`, `work/out/RU2b/report.md` (BLOCKING 1 y 2) y `work/out/E2E-R2-final.txt`. **Decisión tomada (diseño §3.3):** la agenda pagada (`plan_days`) solo se ve con suscripción de paciente activa. La base NO cambia.
- En `e2e/helpers.ts` agrega `suscribirPaciente(page, correo, clave)`: como paciente abre `/mi-plan/suscripcion` → «Suscribirme» → informa comprobante; como admin en Admin → Pagos marca pagada esa factura (copia el flujo de `e2e/semana.spec.ts:102-140`, que pasa). Idempotente: si ya está «Suscripción activa», no hace nada.
- En `e2e/fase2.spec.ts`, antes del paso 4 (`abrirHoyEnCalendario`), llama `suscribirPaciente` para el paciente de la prueba (fase 2 ya está encendida en esa prueba). Nada de lo que la prueba verifica se quita.
- Candado: `fase2` no debe retener `conCandadoDeFases` más de lo necesario; y los `afterAll` de `fase3.spec.ts` y `guia.spec.ts` que toman el candado necesitan timeout propio ≥ 180 s (`test.afterAll(async ({}, testInfo) => { testInfo.setTimeout(180_000); … })`).
- Verifica con TU preview (`npm run -s build && npx vite preview --port $E2E_PORT --strictPort --host 127.0.0.1 &`): `E2E_PORT=$E2E_PORT npx playwright test e2e/fase2.spec.ts e2e/guia.spec.ts --reporter=line`. Mata tu preview. No corras la suite completa.""",
 '- `fase2.spec.ts` verde en desktop y mobile; `guia.spec.ts` verde. Reporta números.',
 'la revisión RE3')

(b2.OUT / 'RE3.md').write_text("""# RE3 — REVISOR (opus) — Cierre de la semana gratis
**Reglas:** solo revisar: nunca edites, nunca commit, nunca push. Sigue `work/TOKEN-PROTOCOL.md` (regla 3). **Máximo 12 minutos.**
**Hallazgos:** `work/out/RE3/report.md`
**Lee:** `work/out/HALLAZGOS-R2.md`, `work/out/RT2/report.md`, `work/out/RU2a/report.md`, `work/out/RU2b/report.md`, `work/out/XU3/report.md`, `work/out/E2E-R3-final.txt` (suite e2e completa medida por el orquestador sobre este main) y `work/out/gate-*.txt`.
**Alcance:** (1) la suite e2e completa está verde en `E2E-R3-final.txt`; (2) el diff de XU3 (`git log -p -5 -- e2e/`) no debilita ninguna aserción de `fase2.spec.ts` y no toca `src/` ni `supabase/`; (3) los gates de `gate-*.txt` verdes. NO corras la suite completa ni `db reset`.
**Veredicto:** `## Verdict: **SHIP**` o `## Verdict: **DO NOT SHIP**` (inglés, exacto). DO NOT SHIP solo por: e2e o gate rojo, o una aserción debilitada/quitada. Luego `BLOCKING` (archivo:línea + arreglo) / `non-blocking`.
**Última línea:** `NEXT: el orquestador lee RE3.`
""")
print('ok r3')

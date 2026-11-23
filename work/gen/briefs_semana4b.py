"""Ronda 4b: los 4 BLOCKING de RE4 (vistas de fase 2/3 que aún se ven + e2e con la conducta vieja)."""
import importlib.util
from pathlib import Path
spec = importlib.util.spec_from_file_location('b4', Path(__file__).with_name('briefs_semana4.py'))
b4 = importlib.util.module_from_spec(spec); spec.loader.exec_module(b4)

b4.b1.impl('XU4c', 'Últimas vistas de fase 2/3 visibles y e2e de la conducta nueva',
 '`e2e/fase1.spec.ts`, `e2e/semana.spec.ts`, `src/pages/LugarPage.tsx`, `src/components/panel/MiNutricionistaTab.tsx` (o donde se monte `ReviewsSection` dentro de fase 2), `src/pages/admin/AdminHomePage.tsx`, `src/pages/plan/HoyPage.tsx`, y sus tests (`*.test.tsx`). NO toques `supabase/`.',
 b4.FASES + """

Lee `work/out/RE4/report.md` y arregla sus 4 BLOCKING exactamente como sugiere:
1. e2e `fase1.spec.ts:41-45` y `semana.spec.ts:75-76`: pasan a probar la conducta NUEVA (pestañas de fase 2 ausentes con `toHaveCount(0)`, sin «Próximamente»; día 8 con fase 2 apagada → «Tu semana gratis terminó en el día 7.» y sin `paywall-proximamente`). Actualiza los títulos de las pruebas. No quites otras aserciones.
2. `LugarPage.tsx:299`: `ReviewsSection` solo con `usePhase(3)`; lo mismo donde se monte dentro de la pestaña de nutricionista.
3. `AdminHomePage.tsx:11-18`: tarjetas con `phase?: 2 | 3` filtradas como en `AdminShell.tsx`; ajusta `AdminHomePage.test.tsx` (apagadas → no están; encendidas → sí).
4. `HoyPage.tsx:153-158`: con fase 2 apagada, `REQUIERE_NUTRICIONISTA` muestra solo el mensaje («Por tu condición de salud, tu plan lo armará una nutricionista. Te avisaremos cuando esté disponible.») + enlace «Volver a mi perfil»; el botón a `/mi-panel?tab=nutricionista` solo con fase 2.
Non-blocking que también haces: `back` explícito en los `PhaseGate` de `MiPanelPage`, `SuscribirmePage`, `AdminPagosPage`, `AdminDatosLugaresPage` (solo agregar la prop) — esos archivos también son tuyos para ESA línea.""",
 """- Vitest de 2, 3 y 4 con fase apagada y encendida.
- Con TU preview (`npm run -s build && npx vite preview --port $E2E_PORT --strictPort --host 127.0.0.1 &`): `E2E_PORT=$E2E_PORT npx playwright test e2e/fase1.spec.ts e2e/semana.spec.ts e2e/navegacion.spec.ts --reporter=line` verde. Mata tu preview. No corras la suite completa ni `db reset`.""",
 'la revisión RE4b')

(b4.b1.OUT / 'RE4b.md').write_text((b4.b1.OUT / 'RE4.md').read_text()
  .replace('RE4 — REVISOR', 'RE4b — REVISOR').replace('work/out/RE4/report.md', 'work/out/RE4b/report.md')
  .replace('**Lee:** ', '**Lee primero:** `work/out/RE4/report.md` (4 BLOCKING de la ronda anterior: verifica cada uno arreglado), `work/briefs/XU4c.md`, `work/out/XU4c/report.md`. **También:** ')
  .replace('E2E-R4-final', 'E2E-R4b-final').replace('el orquestador lee RE4.', 'el orquestador lee RE4b.'))
print('ok r4b')

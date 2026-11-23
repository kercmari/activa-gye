"""Ronda 6 (22/11): horarios, precios y costos de los lugares solo con la fase 3. Uso: python3 -I work/gen/briefs_precios_fase3.py"""
import importlib.util
from pathlib import Path
spec = importlib.util.spec_from_file_location('br', Path(__file__).with_name('briefs_registro.py'))
br = importlib.util.module_from_spec(spec); spec.loader.exec_module(br)
b1 = br.b1

RULE = """**Regla de la dueña (22/11):** en la fase 1 (y en la 2) **no se muestran horarios, precios ni costos de ningún lugar**; eso es de la **fase 3** (el README ya lo dice: «Para todos: precios y horarios completos de los lugares»). Con `usePhase(3)` apagado: nada de precio, «Gratis», «Desde $…», «Consultar precio», nota de precio, horario, «Abierto ahora», tabla de la semana ni filtros por precio u horario. Al encender la fase 3 y recargar, todo vuelve tal cual. Sin «Próximamente» ni huecos vacíos: la tarjeta y la ficha se ven completas sin esa parte. Los datos siguen en la base y en Admin (las páginas de admin NO cambian).
"""
b1.impl('XR7', 'Horarios y precios de los lugares solo con la fase 3',
 '`src/components/places/PlaceCard.tsx`, `src/pages/LugarPage.tsx`, `src/pages/CompararPage.tsx`, `src/pages/LugaresPage.tsx` (filtros y parámetros `precio`/horario), `src/pages/DeportesPage.tsx` y `src/components/home/*` (solo lo de precio/horario), `src/lib/format.ts` (solo si hace falta), sus `*.test.tsx`, y en `e2e/` SOLO las aserciones de precio/horario (`lugar.spec.ts`, `navegacion.spec.ts`, `fase3.spec.ts` y las que `grep -rn "Precio\\|Horario\\|Gratis\\|Desde \\$" e2e` encuentre). NO toques `src/pages/admin/*` ni `supabase/`.',
 br.R5 + RULE + br.E2E_OWN + """
- Una sola fuente: `const verPrecios = usePhase(3)` en cada pantalla (o un hook pequeño `usePlaceDetailsVisible()` en `src/auth/SettingsContext.tsx` si lo usan 3+ archivos: entonces ese archivo también es tuyo solo para añadir el hook). No copies la condición con otra forma.
- `LugaresPage`: con fase 3 apagada el filtro «Precio» (y «Abierto ahora» si existe) no se muestra y un `?precio=` en la URL se ignora (no filtra a escondidas).
- `CompararPage`: quita las filas Precio, Horario y Abierto ahora con fase 3 apagada; la tabla sigue con sentido (sector, deportes, etc.).
- `PlaceCard`: sin la línea de reloj/horario ni precio; la nota «Datos de OpenStreetMap» solo si sigue teniendo sentido sin precio.
- `DeportesPage` (panel): el orden de «Lugares recomendados» no puede delatar horarios; con fase 3 apagada ordena por nombre.""",
 """Vitest con fase 3 apagada y encendida para PlaceCard, LugarPage, CompararPage y LugaresPage (texto de precio/horario ausente con `queryByText(...)` → null, presente al encender; `?precio=gratis` ignorado con fase 3 apagada). e2e tocados verdes con tu preview. Gates normales verdes.""",
 'la revisión RE6')

b1.OUT.joinpath('RE6.md').write_text(b1.OUT.joinpath('RE5.md').read_text()
  .replace('RE5 — REVISOR', 'RE6 — REVISOR').replace('work/out/RE5/report.md', 'work/out/RE6/report.md')
  .replace('— Registro con tipo de cuenta y foto; Nutrición como inicio', '— Horarios y precios solo con la fase 3')
  .replace('**Lee:** ', '**Lee primero:** `work/briefs/XR7.md`, `work/out/XR7/report.md`. **También:** ')
  .replace('E2E-R5.txt', 'E2E-R6.txt').replace('el orquestador lee RE5.', 'el orquestador lee RE6.')
  + "\n**Esta revisión además:** con la fase 3 apagada (como en la nube) recorre en Chrome a 360 y 1280 `/deportes`, `/lugares`, `/lugares/<id>` de 3 lugares (uno con precio, uno gratis, uno de OpenStreetMap sin datos) y `/comparar` con 2 lugares: **ningún** precio, «Gratis», «Desde», horario ni «Abierto ahora» (busca también en el HTML con `grep`). Enciende la fase 3 en tu base local SOLO si es tuya; si no, comprueba el encendido con los tests. DO NOT SHIP también si en fase 1 se ve un precio u horario.\n")
print('ok fase3 precios')

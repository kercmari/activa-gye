/**
 * Descarga lugares de Guayaquil desde OpenStreetMap (Overpass) y escribe src/data/mock/places.osm.json.
 * Uso: npm run -s import:osm
 * Si ninguna URL responde, termina con error y NO modifica el archivo.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mapElement, dedupe, isGenericName } from './osm-map.mjs';

const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];
const QUERY =
  '[out:json][timeout:60];(' +
  'nwr["leisure"~"fitness_centre|sports_centre|swimming_pool|sports_hall|dance|fitness_station"]["name"](-2.30,-80.05,-2.05,-79.80);' +
  'nwr["sport"~"yoga|pilates|boxing|martial_arts|swimming|crossfit|fitness|dance|padel|tennis|climbing|soccer|basketball|volleyball"]["name"](-2.30,-80.05,-2.05,-79.80);' +
  ');out center tags;';
const MAX_PLACES = 300;
const OUTPUT = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'src/data/mock/places.osm.json');

async function fetchOverpass() {
  const errors = [];
  for (const url of ENDPOINTS) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'ActivaGYE-import/1.0 (proyecto academico)',
        },
        body: new URLSearchParams({ data: QUERY }).toString(),
        signal: AbortSignal.timeout(90_000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (!Array.isArray(json.elements)) throw new Error('respuesta sin elements');
      return { url, elements: json.elements };
    } catch (err) {
      errors.push(`${url}: ${err.message}`);
    }
  }
  throw new Error(`Overpass no respondió en ninguna URL.\n${errors.join('\n')}`);
}

async function main() {
  const { url, elements } = await fetchOverpass();
  console.log(`Overpass (${url}): ${elements.length} elementos.`);

  const mapped = elements
    .map(mapElement)
    .filter((p) => p !== null)
    .filter((p) => !isGenericName(p.name));
  const deduped = dedupe(mapped).sort((a, b) => a.name.localeCompare(b.name, 'es'));
  const places = deduped.slice(0, MAX_PLACES);
  const withHours = places.filter((p) => p.hours !== null).length;

  mkdirSync(dirname(OUTPUT), { recursive: true });
  writeFileSync(OUTPUT, JSON.stringify(places, null, 2) + '\n', 'utf8');
  console.log(`Lugares escritos: ${places.length} (con horario: ${withHours}). Archivo: ${OUTPUT}`);
}

main().catch((err) => {
  console.error(`Error al importar OSM: ${err.message}`);
  process.exitCode = 1;
});

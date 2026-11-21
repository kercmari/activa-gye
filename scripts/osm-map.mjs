/**
 * Funciones puras para convertir elementos de OpenStreetMap (Overpass) en lugares de Activa GYE.
 * Los scripts no importan TypeScript: por eso la distancia tiene su propia copia de haversine.
 */

const DAY_ORDER = ['mo', 'tu', 'we', 'th', 'fr', 'sa', 'su'];
const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const TIME_RE = /^(\d{2}):(\d{2})-(\d{2}):(\d{2})$/;
const CREATED_AT = '2026-11-21T00:00:00.000Z';

/** Nombres que OSM usa como etiqueta genérica y no sirven como lugar. */
export const GENERIC_NAMES = ['Área Social', 'Area Social', 'Cancha', 'Canchas', 'Piscina', 'Gimnasio'];

/** Centros de sector de Guayaquil (id: lat, lng). */
export const SECTOR_CENTERS = [
  { id: 'norte', lat: -2.13, lng: -79.9 },
  { id: 'centro', lat: -2.192, lng: -79.884 },
  { id: 'sur', lat: -2.23, lng: -79.9 },
  { id: 'urdesa', lat: -2.17, lng: -79.908 },
  { id: 'kennedy', lat: -2.165, lng: -79.897 },
  { id: 'alborada', lat: -2.137, lng: -79.902 },
  { id: 'sauces', lat: -2.122, lng: -79.894 },
  { id: 'ceibos', lat: -2.163, lng: -79.94 },
  { id: 'via-costa', lat: -2.185, lng: -79.985 },
  { id: 'via-daule', lat: -2.1, lng: -79.93 },
  { id: 'samborondon', lat: -2.14, lng: -79.865 },
  { id: 'duran', lat: -2.172, lng: -79.83 },
];

/** Distancia en km entre dos puntos (haversine, radio 6371 km). */
export function distanceKm(a, b) {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Quita tildes, pasa a minúsculas y colapsa espacios (para comparar nombres). */
function normalizeName(name) {
  return name
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Convierte un token de día OSM ("Mo") en índice 0–6, o -1 si no es válido. */
function dayIndex(token) {
  return DAY_ORDER.indexOf(token.toLowerCase());
}

/** "Mo-Fr" -> [0,1,2,3,4]; "Mo,We,Fr" -> [0,2,4]. null si no se entiende. */
function parseDays(text) {
  const days = new Set();
  for (const part of text.split(',')) {
    const [from, to, extra] = part.split('-');
    if (extra !== undefined) return null;
    const a = dayIndex(from ?? '');
    if (a < 0) return null;
    if (to === undefined) {
      days.add(a);
      continue;
    }
    const b = dayIndex(to);
    if (b < 0) return null;
    let i = a;
    for (;;) {
      days.add(i);
      if (i === b) break;
      i = (i + 1) % 7;
    }
  }
  return [...days];
}

/** "06:00-12:00,15:00-21:00" -> [["06:00","12:00"],["15:00","21:00"]]. null si no se entiende. */
function parseTimes(text) {
  const ranges = [];
  for (const part of text.split(',')) {
    const m = part.trim().match(TIME_RE);
    if (!m) return null;
    const [, h1, m1, h2, m2] = m;
    if (Number(h1) > 24 || Number(h2) > 24 || Number(m1) > 59 || Number(m2) > 59) return null;
    ranges.push([`${h1}:${m1}`, `${h2}:${m2}`]);
  }
  return ranges;
}

/**
 * Lee el campo opening_hours de OSM. Soporta "Mo-Fr 06:00-22:00", varias reglas separadas por ";",
 * varias franjas por día, "Mo,We,Fr 18:00-20:00" y "24/7". Cualquier otra cosa devuelve null.
 */
export function parseOpeningHours(text) {
  if (typeof text !== 'string') return null;
  const raw = text.trim();
  if (!raw) return null;

  const hours = { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] };
  if (raw === '24/7') {
    for (const key of DAY_KEYS) hours[key] = [['00:00', '23:59']];
    return hours;
  }

  let parsedAny = false;
  for (const segment of raw.split(';')) {
    const seg = segment.trim();
    if (!seg) continue;
    let days;
    let timesText;
    if (/^\d/.test(seg)) {
      // Sin días: aplica a todos.
      days = [0, 1, 2, 3, 4, 5, 6];
      timesText = seg;
    } else {
      const m = seg.match(/^(\S+)\s+(\S+)$/);
      if (!m) return null;
      days = parseDays(m[1]);
      timesText = m[2];
      if (!days) return null;
    }
    const times = parseTimes(timesText);
    if (!times) return null;
    for (const d of days) hours[DAY_KEYS[d]].push(...times);
    parsedAny = true;
  }
  return parsedAny ? hours : null;
}

/** Categoría de deporte a partir de los tags de OSM. Siempre devuelve al menos ['otras']. */
export function mapSports(tags = {}) {
  const found = new Set();
  const sportTokens = String(tags.sport ?? '')
    .toLowerCase()
    .split(/[;,]/)
    .map((s) => s.trim())
    .filter(Boolean);
  const has = (...names) => sportTokens.some((t) => names.includes(t));
  let unmatched = false;

  if (tags.leisure === 'fitness_centre' || has('fitness', 'weightlifting')) found.add('gimnasios');
  if (has('crossfit', 'functional', 'calisthenics') || tags.leisure === 'fitness_station') found.add('funcional');
  if (has('yoga', 'pilates')) found.add('yoga');
  if (tags.leisure === 'dance' || has('dance')) found.add('baile');
  if (tags.leisure === 'swimming_pool' || has('swimming')) found.add('natacion');
  if (has('boxing', 'martial_arts', 'karate', 'judo', 'taekwondo', 'kickboxing', 'mma')) found.add('boxeo');
  if (has('soccer', 'basketball', 'volleyball', 'tennis', 'padel', 'futsal', 'baseball', 'softball')) {
    found.add('colectivos');
  }

  const known = [
    'fitness', 'weightlifting', 'crossfit', 'functional', 'calisthenics', 'yoga', 'pilates', 'dance',
    'swimming', 'boxing', 'martial_arts', 'karate', 'judo', 'taekwondo', 'kickboxing', 'mma',
    'soccer', 'basketball', 'volleyball', 'tennis', 'padel', 'futsal', 'baseball', 'softball',
  ];
  for (const t of sportTokens) {
    if (!known.includes(t)) unmatched = true;
  }
  if (unmatched) found.add('otras');
  if (found.size === 0) found.add('otras');

  return ['gimnasios', 'funcional', 'yoga', 'baile', 'natacion', 'boxeo', 'colectivos', 'otras'].filter((id) =>
    found.has(id),
  );
}

/** Sector más cercano al punto (usa distanceKm). */
export function nearestSector(lat, lng) {
  let best = SECTOR_CENTERS[0];
  let bestDistance = Infinity;
  for (const center of SECTOR_CENTERS) {
    const d = distanceKm({ lat, lng }, center);
    if (d < bestDistance) {
      bestDistance = d;
      best = center;
    }
  }
  return best.id;
}

/** Elemento de Overpass -> Place (forma de src/data/types.ts). null si no tiene name ni coordenadas. */
export function mapElement(el) {
  const tags = el?.tags ?? {};
  if (!tags.name) return null;
  const lat = el.lat ?? el.center?.lat;
  const lng = el.lon ?? el.center?.lon;
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;

  const street = tags['addr:street'];
  const houseNumber = tags['addr:housenumber'];
  const isPool = tags.leisure === 'swimming_pool' || String(tags.sport ?? '').includes('swimming');

  return {
    id: `osm-${el.type}-${el.id}`,
    name: tags.name,
    description: tags.description ?? null,
    address: street ? [street, houseNumber].filter(Boolean).join(' ') : null,
    sector_id: nearestSector(lat, lng),
    lat,
    lng,
    phone: tags.phone ?? tags['contact:phone'] ?? null,
    whatsapp: null,
    website: tags.website ?? tags['contact:website'] ?? null,
    instagram: tags['contact:instagram'] ?? null,
    photo_url: null,
    gallery: [],
    price_from: null,
    price_note: null,
    promotions: null,
    services: isPool ? ['piscina'] : [],
    hours: parseOpeningHours(tags.opening_hours),
    source: 'osm',
    osm_id: `${el.type}/${el.id}`,
    published: true,
    verified_at: null,
    created_at: CREATED_AT,
    updated_at: CREATED_AT,
    sport_ids: mapSports(tags),
  };
}

/** Quita duplicados: mismo nombre (sin tildes ni mayúsculas) a menos de 80 m. Conserva el que tiene horario. */
export function dedupe(places) {
  const kept = [];
  for (const place of places) {
    const key = normalizeName(place.name);
    const index = kept.findIndex(
      (k) => normalizeName(k.name) === key && distanceKm(k, place) < 0.08,
    );
    if (index === -1) {
      kept.push(place);
    } else if (place.hours && !kept[index].hours) {
      kept[index] = place;
    }
  }
  return kept;
}

/** true si el nombre es uno de los genéricos de GENERIC_NAMES (comparación exacta, sin espacios extra). */
export function isGenericName(name) {
  return GENERIC_NAMES.includes(String(name ?? '').trim());
}

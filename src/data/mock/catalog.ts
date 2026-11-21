/**
 * Catálogo del simulador: sectores, deportes, lugares, contacto y administración de lugares y mensajes.
 * Los lugares vienen de places.osm.json (scripts/import-osm.mjs) y los cambios del admin se guardan
 * en la tabla 'places_admin' (lugares completos que reemplazan por id o se agregan).
 */
import type {
  ContactInput,
  ContactMessage,
  Place,
  PlaceFilters,
  PlaceInput,
  Repo,
  Sector,
  Sport,
} from '../types';
import { AppError } from '../types';
import { currentUser, nowIso, readTable, wait, writeTable } from './store';
import { matchesSchedule } from '../../lib/hours';
import osmPlaces from './places.osm.json';

/** Sectores: copia de la semilla de supabase/migrations/20261121000001_esquema_inicial.sql. */
const SECTORS: Sector[] = [
  { id: 'norte', name: 'Norte', sort: 1 },
  { id: 'centro', name: 'Centro', sort: 2 },
  { id: 'sur', name: 'Sur', sort: 3 },
  { id: 'urdesa', name: 'Urdesa', sort: 4 },
  { id: 'kennedy', name: 'Kennedy', sort: 5 },
  { id: 'alborada', name: 'Alborada', sort: 6 },
  { id: 'sauces', name: 'Sauces', sort: 7 },
  { id: 'ceibos', name: 'Los Ceibos', sort: 8 },
  { id: 'via-costa', name: 'Vía a la Costa', sort: 9 },
  { id: 'via-daule', name: 'Vía a Daule', sort: 10 },
  { id: 'samborondon', name: 'Samborondón', sort: 11 },
  { id: 'duran', name: 'Durán', sort: 12 },
];

/** Deportes: copia de la semilla del mismo archivo de migración. */
const SPORT_SEED: Array<Pick<Sport, 'id' | 'name' | 'icon' | 'sort'>> = [
  { id: 'gimnasios', name: 'Gimnasios', icon: 'Dumbbell', sort: 1 },
  { id: 'funcional', name: 'Funcional', icon: 'Zap', sort: 2 },
  { id: 'yoga', name: 'Yoga', icon: 'Sparkles', sort: 3 },
  { id: 'baile', name: 'Baile', icon: 'HeartPulse', sort: 4 },
  { id: 'natacion', name: 'Natación', icon: 'Waves', sort: 5 },
  { id: 'boxeo', name: 'Boxeo', icon: 'Swords', sort: 6 },
  { id: 'colectivos', name: 'Deportes colectivos', icon: 'Users', sort: 7 },
  { id: 'otras', name: 'Otras actividades', icon: 'Bike', sort: 8 },
];
const SPORTS: Sport[] = SPORT_SEED.map((s) => ({ ...s, image_url: `/img/sports/${s.id}.jpg` }));

const ADMIN_TABLE = 'places_admin';
const MESSAGES_TABLE = 'contact_messages';
const SOLO_ADMIN = 'Solo el administrador puede hacer esto.';
const DATOS_INVALIDOS = 'Revisa los datos: hay campos vacíos o con formato incorrecto.';
const CONTACT_LIMIT = 5;
const HOUR_MS = 60 * 60 * 1000;

/** Quita tildes, pasa a minúsculas (para buscar por nombre). */
function normalize(text: string): string {
  return text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

function isAdmin(): boolean {
  return currentUser()?.profile.role === 'admin';
}

function requireAdmin(): void {
  if (!isAdmin()) throw new AppError('SOLO_ADMIN', SOLO_ADMIN);
}

/** Todos los lugares: OSM + cambios del admin (que reemplazan por id o se agregan). */
function allPlaces(): Place[] {
  const base = osmPlaces as Place[];
  const overrides = readTable<Place>(ADMIN_TABLE);
  const byId = new Map(base.map((p) => [p.id, p] as const));
  for (const o of overrides) byId.set(o.id, o);
  return [...byId.values()];
}

function saveOverride(place: Place): void {
  const overrides = readTable<Place>(ADMIN_TABLE);
  const index = overrides.findIndex((p) => p.id === place.id);
  if (index === -1) overrides.push(place);
  else overrides[index] = place;
  writeTable(ADMIN_TABLE, overrides);
}

function byName(a: Place, b: Place): number {
  return a.name.localeCompare(b.name, 'es');
}

function priceMatches(price: number | null, range: NonNullable<PlaceFilters['price']>): boolean {
  if (price === null) return false;
  switch (range) {
    case 'gratis':
      return price === 0;
    case 'hasta20':
      return price <= 20;
    case '20a40':
      return price > 20 && price <= 40;
    case 'mas40':
      return price > 40;
  }
}

function isValidEmail(email: string): boolean {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) && email.length <= 200;
}

function validatePlace(input: PlaceInput): void {
  const name = input.name?.trim() ?? '';
  const inRange = (value: number, min: number, max: number) =>
    typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
  if (name.length < 2 || name.length > 160) throw new AppError('DATOS_INVALIDOS', DATOS_INVALIDOS);
  if (!inRange(input.lat, -2.6, -1.8) || !inRange(input.lng, -80.3, -79.5)) {
    throw new AppError('DATOS_INVALIDOS', 'El lugar debe estar en Guayaquil y alrededores.');
  }
}

export const catalogPart: Pick<
  Repo,
  | 'listSectors'
  | 'listSports'
  | 'searchPlaces'
  | 'getPlace'
  | 'getPlaces'
  | 'sendContact'
  | 'adminListPlaces'
  | 'adminSavePlace'
  | 'adminSetPublished'
  | 'adminListMessages'
  | 'adminMarkMessageRead'
> = {
  async listSectors() {
    await wait();
    return SECTORS.map((s) => ({ ...s }));
  },

  async listSports() {
    await wait();
    return SPORTS.map((s) => ({ ...s }));
  },

  async searchPlaces(filters) {
    await wait();
    const name = filters.name ? normalize(filters.name.trim()) : '';
    return allPlaces()
      .filter((p) => p.published)
      .filter((p) => !name || normalize(p.name).includes(name))
      .filter((p) => !filters.sector || p.sector_id === filters.sector)
      .filter((p) => !filters.sport || p.sport_ids.includes(filters.sport))
      .filter((p) => !filters.price || priceMatches(p.price_from, filters.price))
      .filter((p) => !filters.schedule || matchesSchedule(p.hours, filters.schedule))
      .filter((p) => !filters.services || filters.services.every((s) => p.services.includes(s)))
      .sort(byName);
  },

  async getPlace(id) {
    await wait();
    const place = allPlaces().find((p) => p.id === id);
    if (!place) return null;
    return place.published || isAdmin() ? place : null;
  },

  async getPlaces(ids) {
    await wait();
    const all = allPlaces();
    return ids
      .map((id) => all.find((p) => p.id === id))
      .filter((p): p is Place => p !== undefined && p.published);
  },

  async sendContact(input: ContactInput) {
    await wait();
    const name = input.name?.trim() ?? '';
    const email = input.email?.trim().toLowerCase() ?? '';
    const subject = input.subject?.trim() ?? '';
    const message = input.message?.trim() ?? '';
    const valid =
      name.length >= 2 && name.length <= 120 &&
      isValidEmail(email) &&
      subject.length >= 2 && subject.length <= 160 &&
      message.length >= 5 && message.length <= 4000;
    if (!valid) throw new AppError('DATOS_INVALIDOS', DATOS_INVALIDOS);

    const messages = readTable<ContactMessage>(MESSAGES_TABLE);
    const now = Date.now();
    const recent = messages.filter(
      (m) => m.email.toLowerCase() === email && now - new Date(m.created_at).getTime() < HOUR_MS,
    );
    if (recent.length >= CONTACT_LIMIT) {
      throw new AppError('DEMASIADOS_MENSAJES', 'Enviaste muchos mensajes. Intenta en una hora.');
    }

    messages.push({
      id: crypto.randomUUID(),
      name,
      email,
      subject,
      message,
      read: false,
      created_at: nowIso(),
    });
    writeTable(MESSAGES_TABLE, messages);
  },

  async adminListPlaces(search) {
    await wait();
    requireAdmin();
    const term = search ? normalize(search.trim()) : '';
    return allPlaces()
      .filter((p) => !term || normalize(p.name).includes(term))
      .sort(byName);
  },

  async adminSavePlace(input) {
    await wait();
    requireAdmin();
    validatePlace(input);

    const existing = input.id ? allPlaces().find((p) => p.id === input.id) : undefined;
    const now = nowIso();
    const place: Place = {
      ...input,
      name: input.name.trim(),
      id: input.id ?? `adm-${crypto.randomUUID()}`,
      source: existing?.source ?? 'admin',
      osm_id: existing?.osm_id ?? null,
      created_at: existing?.created_at ?? now,
      updated_at: now,
    };
    saveOverride(place);
    return place;
  },

  async adminSetPublished(id, published) {
    await wait();
    requireAdmin();
    const place = allPlaces().find((p) => p.id === id);
    if (!place) throw new AppError('NO_EXISTE', 'No encontramos ese lugar.');
    saveOverride({ ...place, published, updated_at: nowIso() });
  },

  async adminListMessages() {
    await wait();
    requireAdmin();
    return readTable<ContactMessage>(MESSAGES_TABLE).sort((a, b) =>
      b.created_at.localeCompare(a.created_at),
    );
  },

  async adminMarkMessageRead(id, read) {
    await wait();
    requireAdmin();
    const messages = readTable<ContactMessage>(MESSAGES_TABLE);
    const message = messages.find((m) => m.id === id);
    if (!message) throw new AppError('NO_EXISTE', 'No encontramos ese mensaje.');
    message.read = read;
    writeTable(MESSAGES_TABLE, messages);
  },
};

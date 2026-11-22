/** Catálogo con Supabase: sectores, deportes, lugares, contacto y administración de lugares y mensajes (dueño: D1). */
import type {
  ContactInput,
  ContactMessage,
  Hours,
  Place,
  PlaceFilters,
  PlaceInput,
  Repo,
  Sector,
  ServiceId,
  Sport,
} from '../types';
import { AppError } from '../types';
import { matchesSchedule } from '../../lib/hours';
import { supabase } from './client';
import { unwrap } from './errors';

const DATOS_INVALIDOS = 'Revisa los datos: hay campos vacíos o con formato incorrecto.';
const SELECT_PLACE = '*, place_sports(sport_id)';

/** Fila de `places` tal como llega de PostgREST, con sus deportes embebidos. */
interface PlaceRow extends Omit<Place, 'sport_ids' | 'price_from' | 'lat' | 'lng'> {
  price_from: number | string | null;
  lat: number | string;
  lng: number | string;
  place_sports?: { sport_id: string }[] | null;
}

function rowToPlace(row: PlaceRow, sportIds?: string[]): Place {
  const { place_sports, ...rest } = row;
  return {
    ...rest,
    price_from: row.price_from === null ? null : Number(row.price_from),
    lat: Number(row.lat),
    lng: Number(row.lng),
    gallery: row.gallery ?? [],
    services: (row.services ?? []) as ServiceId[],
    hours: (row.hours ?? null) as Hours | null,
    sport_ids: sportIds ?? (place_sports ?? []).map((s) => s.sport_id),
  };
}

/** Quita tildes y pasa a minúsculas (para buscar por nombre). Igual que el simulador. */
function normalize(text: string): string {
  return text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

function byName(a: Place, b: Place): number {
  return a.name.localeCompare(b.name, 'es');
}

/** Igual que el simulador (src/data/mock/catalog.ts). */
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

/** Mismas reglas que el simulador y que la base (Guayaquil y alrededores). */
function validatePlace(input: PlaceInput): void {
  const name = input.name?.trim() ?? '';
  const inRange = (value: number, min: number, max: number) =>
    typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
  if (name.length < 2 || name.length > 160) throw new AppError('DATOS_INVALIDOS', DATOS_INVALIDOS);
  if (!inRange(input.lat, -2.6, -1.8) || !inRange(input.lng, -80.3, -79.5)) {
    throw new AppError('DATOS_INVALIDOS', 'El lugar debe estar en Guayaquil y alrededores.');
  }
}

/** Fila que se guarda en `places` (sin id, source ni osm_id, que los pone la base). */
function placeToRow(input: PlaceInput) {
  return {
    name: input.name.trim(),
    description: input.description,
    address: input.address,
    sector_id: input.sector_id,
    lat: input.lat,
    lng: input.lng,
    phone: input.phone,
    whatsapp: input.whatsapp,
    website: input.website,
    instagram: input.instagram,
    photo_url: input.photo_url,
    gallery: input.gallery,
    price_from: input.price_from,
    price_note: input.price_note,
    promotions: input.promotions,
    services: input.services,
    hours: input.hours,
    published: input.published,
    verified_at: input.verified_at,
  };
}

export const catalogPart: Partial<Repo> = {
  async listSectors() {
    const rows = unwrap(await supabase.from('sectors').select('*').order('sort'));
    return rows as Sector[];
  },

  async listSports() {
    const rows = unwrap(await supabase.from('sports').select('*').order('sort'));
    return rows as Sport[];
  },

  async searchPlaces(filters: PlaceFilters) {
    const rows = unwrap(
      await supabase.from('places').select(SELECT_PLACE).eq('published', true),
    ) as PlaceRow[];
    const name = filters.name ? normalize(filters.name.trim()) : '';
    return rows
      .map((r) => rowToPlace(r))
      .filter((p) => !name || normalize(p.name).includes(name))
      .filter((p) => !filters.sector || p.sector_id === filters.sector)
      .filter((p) => !filters.sport || p.sport_ids.includes(filters.sport))
      .filter((p) => !filters.price || priceMatches(p.price_from, filters.price))
      .filter((p) => !filters.schedule || matchesSchedule(p.hours, filters.schedule))
      .filter((p) => !filters.services || filters.services.every((s) => p.services.includes(s)))
      .sort(byName);
  },

  async getPlace(id: string) {
    // RLS: sin sesión de admin solo llegan los publicados.
    const row = unwrap<PlaceRow | null>(
      await supabase.from('places').select(SELECT_PLACE).eq('id', id).maybeSingle(),
    );
    return row ? rowToPlace(row) : null;
  },

  async getPlaces(ids: string[]) {
    if (ids.length === 0) return [];
    const rows = unwrap(
      await supabase.from('places').select(SELECT_PLACE).in('id', ids).eq('published', true),
    ) as PlaceRow[];
    const byId = new Map(rows.map((r) => [r.id, rowToPlace(r)] as const));
    return ids.map((id) => byId.get(id)).filter((p): p is Place => p !== undefined);
  },

  async sendContact(input: ContactInput) {
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
    // El límite de 5 mensajes por hora lo aplica la base (DEMASIADOS_MENSAJES).
    unwrap(await supabase.from('contact_messages').insert({ name, email, subject, message }));
  },

  async adminListPlaces(search?: string) {
    const rows = unwrap(
      await supabase.from('places').select(SELECT_PLACE).order('name'),
    ) as PlaceRow[];
    const term = search ? normalize(search.trim()) : '';
    return rows
      .map((r) => rowToPlace(r))
      .filter((p) => !term || normalize(p.name).includes(term))
      .sort(byName);
  },

  async adminSavePlace(input: PlaceInput) {
    validatePlace(input);
    const row = placeToRow(input);
    const placeRow = input.id
      ? unwrap<PlaceRow>(await supabase.from('places').update(row).eq('id', input.id).select(SELECT_PLACE).single())
      : unwrap<PlaceRow>(await supabase.from('places').insert(row).select(SELECT_PLACE).single());
    const id = placeRow.id;

    // Reemplaza los deportes del lugar: borra los anteriores y guarda los nuevos.
    unwrap(await supabase.from('place_sports').delete().eq('place_id', id));
    if (input.sport_ids.length > 0) {
      unwrap(
        await supabase.from('place_sports').insert(input.sport_ids.map((sport_id) => ({ place_id: id, sport_id }))),
      );
    }
    return rowToPlace(placeRow, [...input.sport_ids]);
  },

  async adminSetPublished(id: string, published: boolean) {
    const rows = unwrap(
      await supabase.from('places').update({ published }).eq('id', id).select('id'),
    ) as { id: string }[];
    if (rows.length === 0) throw new AppError('NO_EXISTE', 'No encontramos ese lugar.');
  },

  async adminListIncompletePlaces() {
    const rows = unwrap(
      await supabase
        .from('places')
        .select(SELECT_PLACE)
        .or('price_from.is.null,hours.is.null')
        .order('name'),
    ) as PlaceRow[];
    return rows.map((r) => rowToPlace(r));
  },

  async adminListMessages() {
    const rows = unwrap(
      await supabase.from('contact_messages').select('*').order('created_at', { ascending: false }),
    );
    return rows as ContactMessage[];
  },

  async adminMarkMessageRead(id: string, read: boolean) {
    const rows = unwrap(
      await supabase.from('contact_messages').update({ read }).eq('id', id).select('id'),
    ) as { id: string }[];
    if (rows.length === 0) throw new AppError('NO_EXISTE', 'No encontramos ese mensaje.');
  },
};

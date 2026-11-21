import { describe, it, expect, beforeEach } from 'vitest';
import { catalogPart } from './catalog';
import { setSessionUserId, writeTable, type StoredUser } from './store';
import { AppError, type Place, type PlaceInput } from '../types';

const CREATED = '2026-11-21T00:00:00.000Z';

function seedSession(role: 'usuario' | 'admin') {
  const id = `user-${role}`;
  const user: StoredUser = {
    id,
    email: `${role}@prueba.ec`,
    password_hash: 'x',
    profile: {
      id,
      full_name: 'Persona de prueba',
      birth_date: null,
      sex: null,
      phone: null,
      sector_id: null,
      goal: null,
      activity_level: null,
      role,
      created_at: CREATED,
      updated_at: CREATED,
    },
  };
  writeTable('users', [user]);
  setSessionUserId(id);
}

function placeInput(overrides: Partial<PlaceInput> = {}): PlaceInput {
  return {
    name: 'Centro Deportivo Prueba',
    description: null,
    address: null,
    sector_id: 'centro',
    lat: -2.192,
    lng: -79.884,
    phone: null,
    whatsapp: null,
    website: null,
    instagram: null,
    photo_url: null,
    gallery: [],
    price_from: null,
    price_note: null,
    promotions: null,
    services: [],
    hours: null,
    published: true,
    verified_at: null,
    sport_ids: ['gimnasios'],
    ...overrides,
  };
}

function seedPlace(overrides: Partial<Place>): Place {
  return {
    ...placeInput(),
    id: 'adm-seed',
    source: 'admin',
    osm_id: null,
    created_at: CREATED,
    updated_at: CREATED,
    ...overrides,
  } as Place;
}

beforeEach(() => {
  localStorage.clear();
});

describe('catalog', () => {
  it('searchPlaces sin filtros devuelve solo publicados', async () => {
    seedSession('admin');
    const all = await catalogPart.searchPlaces!({});
    expect(all.length).toBeGreaterThan(0);
    expect(all.every((p) => p.published)).toBe(true);

    // Ocultar un lugar real de OSM con un cambio del admin.
    const hidden = all[0];
    writeTable('places_admin', [{ ...hidden, published: false }]);
    const after = await catalogPart.searchPlaces!({});
    expect(after.find((p) => p.id === hidden.id)).toBeUndefined();
    expect(after.length).toBe(all.length - 1);
  });

  it('filtra por nombre sin tildes', async () => {
    writeTable('places_admin', [seedPlace({ id: 'adm-1', name: 'Academia Ñandú de Baile' })]);
    const found = await catalogPart.searchPlaces!({ name: 'ANDU' });
    expect(found.map((p) => p.id)).toEqual(['adm-1']);
    const foundAccent = await catalogPart.searchPlaces!({ name: 'ñandú' });
    expect(foundAccent.map((p) => p.id)).toEqual(['adm-1']);
  });

  it('filtro de precio excluye precio null', async () => {
    writeTable('places_admin', [
      seedPlace({ id: 'adm-barato', name: 'Yoga Barato', price_from: 15, sport_ids: ['yoga'] }),
      seedPlace({ id: 'adm-sin-precio', name: 'Yoga Consultar', price_from: null, sport_ids: ['yoga'] }),
    ]);
    const results = await catalogPart.searchPlaces!({ sport: 'yoga', price: 'hasta20' });
    expect(results.map((p) => p.id)).toEqual(['adm-barato']);
    const all = await catalogPart.searchPlaces!({ price: 'hasta20' });
    expect(all.every((p) => p.price_from !== null)).toBe(true);
  });

  it('admin oculta un lugar y deja de aparecer', async () => {
    seedSession('admin');
    const saved = await catalogPart.adminSavePlace!(placeInput({ name: 'Gimnasio Prueba Oculto' }));
    expect((await catalogPart.searchPlaces!({ name: 'prueba oculto' })).map((p) => p.id)).toEqual([saved.id]);

    await catalogPart.adminSetPublished!(saved.id, false);
    expect(await catalogPart.searchPlaces!({ name: 'prueba oculto' })).toEqual([]);

    seedSession('usuario');
    expect(await catalogPart.getPlace!(saved.id)).toBeNull();
  });

  it('usuario normal no puede adminSavePlace (SOLO_ADMIN)', async () => {
    seedSession('usuario');
    const error = await catalogPart.adminSavePlace!(placeInput()).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AppError);
    expect((error as AppError).code).toBe('SOLO_ADMIN');
  });

  it('sendContact rechaza el sexto mensaje en una hora', async () => {
    const input = {
      name: 'Ana Prueba',
      email: 'ana@prueba.ec',
      subject: 'Consulta',
      message: 'Hola, quisiera saber más.',
    };
    for (let i = 0; i < 5; i++) {
      await catalogPart.sendContact!(input);
    }
    const error = await catalogPart.sendContact!(input).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AppError);
    expect((error as AppError).code).toBe('DEMASIADOS_MENSAJES');
  });
});

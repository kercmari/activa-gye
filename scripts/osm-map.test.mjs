import { describe, it, expect } from 'vitest';
import { parseOpeningHours, mapSports, nearestSector, mapElement, dedupe } from './osm-map.mjs';

const EMPTY = { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] };

describe('osm-map', () => {
  it('parseOpeningHours', () => {
    expect(parseOpeningHours('Mo-Fr 06:00-22:00')).toEqual({
      ...EMPTY,
      mon: [['06:00', '22:00']],
      tue: [['06:00', '22:00']],
      wed: [['06:00', '22:00']],
      thu: [['06:00', '22:00']],
      fri: [['06:00', '22:00']],
    });
    expect(parseOpeningHours('Mo-Fr 06:00-22:00; Sa 07:00-14:00')).toEqual({
      ...EMPTY,
      mon: [['06:00', '22:00']],
      tue: [['06:00', '22:00']],
      wed: [['06:00', '22:00']],
      thu: [['06:00', '22:00']],
      fri: [['06:00', '22:00']],
      sat: [['07:00', '14:00']],
    });
    expect(parseOpeningHours('Mo-Sa 06:00-21:00; Su 08:00-12:00')).toEqual({
      ...EMPTY,
      mon: [['06:00', '21:00']],
      tue: [['06:00', '21:00']],
      wed: [['06:00', '21:00']],
      thu: [['06:00', '21:00']],
      fri: [['06:00', '21:00']],
      sat: [['06:00', '21:00']],
      sun: [['08:00', '12:00']],
    });
    expect(parseOpeningHours('Mo,We,Fr 18:00-20:00')).toEqual({
      ...EMPTY,
      mon: [['18:00', '20:00']],
      wed: [['18:00', '20:00']],
      fri: [['18:00', '20:00']],
    });
    expect(parseOpeningHours('24/7')).toEqual({
      mon: [['00:00', '23:59']],
      tue: [['00:00', '23:59']],
      wed: [['00:00', '23:59']],
      thu: [['00:00', '23:59']],
      fri: [['00:00', '23:59']],
      sat: [['00:00', '23:59']],
      sun: [['00:00', '23:59']],
    });
    expect(parseOpeningHours('Mo-Fr 06:00-12:00,15:00-21:00')).toEqual({
      ...EMPTY,
      mon: [['06:00', '12:00'], ['15:00', '21:00']],
      tue: [['06:00', '12:00'], ['15:00', '21:00']],
      wed: [['06:00', '12:00'], ['15:00', '21:00']],
      thu: [['06:00', '12:00'], ['15:00', '21:00']],
      fri: [['06:00', '12:00'], ['15:00', '21:00']],
    });
    expect(parseOpeningHours('PH off')).toBeNull();
    expect(parseOpeningHours(undefined)).toBeNull();
    expect(parseOpeningHours('')).toBeNull();
  });

  it('mapSports', () => {
    expect(mapSports({ leisure: 'fitness_centre' })).toEqual(['gimnasios']);
    expect(mapSports({ leisure: 'swimming_pool' })).toEqual(['natacion']);
    expect(mapSports({ leisure: 'dance' })).toEqual(['baile']);
    expect(mapSports({ leisure: 'sports_centre', sport: 'soccer' })).toEqual(['colectivos']);
    expect(mapSports({ leisure: 'sports_centre' })).toEqual(['otras']);
    expect(mapSports({})).toEqual(['otras']);
    expect(mapSports({ sport: 'fitness;yoga;yoga' })).toEqual(['gimnasios', 'yoga']);
  });

  it('nearestSector', () => {
    expect(nearestSector(-2.137, -79.902)).toBe('alborada');
  });

  it('mapElement sin name → null', () => {
    expect(mapElement({ type: 'node', id: 1, lat: -2.17, lon: -79.9, tags: { leisure: 'fitness_centre' } })).toBeNull();
  });

  it('mapElement arma un Place completo', () => {
    const place = mapElement({
      type: 'way',
      id: 42,
      center: { lat: -2.137, lon: -79.902 },
      tags: {
        name: 'Gym Prueba',
        leisure: 'fitness_centre',
        'addr:street': 'Av. Principal',
        'addr:housenumber': '123',
        'contact:phone': '042000000',
        opening_hours: 'Mo-Fr 06:00-22:00',
      },
    });
    expect(place).toMatchObject({
      id: 'osm-way-42',
      name: 'Gym Prueba',
      address: 'Av. Principal 123',
      phone: '042000000',
      source: 'osm',
      osm_id: 'way/42',
      published: true,
      sector_id: 'alborada',
      sport_ids: ['gimnasios'],
      services: [],
      price_from: null,
    });
    expect(place.hours.mon).toEqual([['06:00', '22:00']]);
  });

  it('dedupe quita duplicados a menos de 80 m', () => {
    const base = { lat: -2.17, lng: -79.9, hours: null };
    const withHours = { ...base, hours: EMPTY };
    const places = [
      { ...base, id: 'a', name: 'Gimnasio Élite' },
      { ...base, id: 'b', name: 'gimnasio elite', lat: -2.1702, lng: -79.9 }, // ~22 m, mismo nombre
      { ...base, id: 'c', name: 'Gimnasio Élite', lat: -2.2, lng: -79.9 }, // lejos
      { ...withHours, id: 'd', name: 'Club Norte', lat: -2.13, lng: -79.9 },
      { ...base, id: 'e', name: 'Club Norte', lat: -2.1301, lng: -79.9 }, // ~11 m, sin horario
    ];
    const out = dedupe(places);
    expect(out.map((p) => p.id)).toEqual(['a', 'c', 'd']);

    const withHoursLater = dedupe([
      { ...base, id: 'x', name: 'Yoga Sol' },
      { ...withHours, id: 'y', name: 'Yoga Sol', lat: -2.1701, lng: -79.9 },
    ]);
    expect(withHoursLater.map((p) => p.id)).toEqual(['y']);
  });
});

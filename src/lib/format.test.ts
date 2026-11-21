import { describe, expect, it } from 'vitest';
import type { DayKey, Hours } from '../data/types';
import { formatPrice, summarizeHours } from './format';

const closed = (): Hours => ({ mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] });

describe('formatPrice', () => {
  it('formatPrice', () => {
    expect(formatPrice({ price_from: 0 })).toBe('Gratis');
    expect(formatPrice({ price_from: 25 })).toBe('Desde $25');
    expect(formatPrice({ price_from: 7.5 })).toBe('Desde $7,50');
    expect(formatPrice({ price_from: null })).toBe('Consultar precio');
  });
});

describe('summarizeHours', () => {
  it('summarizeHours', () => {
    expect(summarizeHours(null)).toBe('Horario por confirmar');

    const hours = closed();
    (['mon', 'tue', 'wed', 'thu', 'fri'] as DayKey[]).forEach((d) => { hours[d] = [['06:00', '22:00']]; });
    hours.sat = [['07:00', '14:00']];
    expect(summarizeHours(hours)).toBe('Lun–Vie · 06:00–22:00 · Sáb 07:00–14:00');
  });

  it('muestra la primera franja abierta cuando lun–vie no coinciden', () => {
    const hours = closed();
    hours.wed = [['09:00', '13:00']];
    hours.sun = [['10:00', '12:00']];
    expect(summarizeHours(hours)).toBe('Mié 09:00–13:00');
  });
});

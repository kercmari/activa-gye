import { describe, it, expect } from 'vitest';
import type { Hours } from '../data/types';
import { isOpenNow, matchesSchedule } from './hours';

const WEEKDAYS_6_22: Hours = {
  mon: [['06:00', '22:00']], tue: [['06:00', '22:00']], wed: [['06:00', '22:00']],
  thu: [['06:00', '22:00']], fri: [['06:00', '22:00']], sat: [], sun: [],
};
const NIGHT_18_20: Hours = {
  mon: [['18:00', '20:00']], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [],
};

describe('hours', () => {
  it('isOpenNow: lunes 07:00 con Lun–Vie 06–22 → true; domingo → false', () => {
    // 23 de noviembre de 2026 es lunes.
    expect(isOpenNow(WEEKDAYS_6_22, new Date(2026, 10, 23, 7, 0))).toBe(true);
    // 22 de noviembre de 2026 es domingo.
    expect(isOpenNow(WEEKDAYS_6_22, new Date(2026, 10, 22, 10, 0))).toBe(false);
    expect(isOpenNow(null, new Date(2026, 10, 23, 7, 0))).toBe(false);
  });

  it('matchesSchedule: franja 18:00–20:00 → noche true, mañana false; null → false', () => {
    expect(matchesSchedule(NIGHT_18_20, 'noche')).toBe(true);
    expect(matchesSchedule(NIGHT_18_20, 'manana')).toBe(false);
    expect(matchesSchedule(null, 'noche')).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';
import { addDays, formatDayLabel, isToday, mondayOf, toISODate, weekDays } from './dates';

describe('dates', () => {
  it('mondayOf de un domingo devuelve el lunes anterior', () => {
    // 2026-11-22 es domingo; el lunes de esa semana es 2026-11-16.
    expect(mondayOf('2026-11-22')).toBe('2026-11-16');
    expect(mondayOf(new Date(2026, 10, 22))).toBe('2026-11-16');
  });

  it('mondayOf de un lunes devuelve el mismo día', () => {
    expect(mondayOf('2026-11-23')).toBe('2026-11-23');
  });

  it('weekDays devuelve 7 fechas seguidas', () => {
    expect(weekDays('2026-11-30')).toEqual([
      '2026-11-30', '2026-12-01', '2026-12-02', '2026-12-03', '2026-12-04', '2026-12-05', '2026-12-06',
    ]);
  });

  it('addDays cruza meses y acepta negativos', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('toISODate usa la fecha local con ceros', () => {
    expect(toISODate(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('formatDayLabel muestra día corto y dd/mm', () => {
    expect(formatDayLabel('2026-11-23')).toBe('Lun 23/11');
  });

  it('isToday compara con la fecha de hoy', () => {
    expect(isToday(toISODate(new Date()))).toBe(true);
    expect(isToday('1999-01-01')).toBe(false);
  });
});

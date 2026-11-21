/** Horario de un lugar: qué días y en qué franjas abre. Usa los tipos del contrato de datos. */
import type { DayKey, Hours, ScheduleRange } from '../data/types';

export const DAY_KEYS: DayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

/** getDay() de JavaScript: 0 = domingo. */
const KEY_BY_JS_DAY: DayKey[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

export function dayKeyOf(date: Date): DayKey {
  return KEY_BY_JS_DAY[date.getDay()];
}

/** "HH:MM" -> minutos desde medianoche. */
function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/** true si el lugar está abierto ahora (hora local): alguna franja de hoy contiene la hora. */
export function isOpenNow(hours: Hours | null, date: Date = new Date()): boolean {
  if (!hours) return false;
  const now = date.getHours() * 60 + date.getMinutes();
  return hours[dayKeyOf(date)].some(([open, close]) => {
    const start = toMinutes(open);
    const end = toMinutes(close);
    return now >= start && now < end;
  });
}

/** Ventanas del filtro de horario, en minutos desde medianoche. */
const WINDOWS: Record<ScheduleRange, [number, number]> = {
  manana: [5 * 60, 12 * 60],
  tarde: [12 * 60, 18 * 60],
  noche: [18 * 60, 23 * 60],
};

/** true si algún día tiene una franja que se cruce con la ventana (mañana, tarde o noche). */
export function matchesSchedule(hours: Hours | null, range: ScheduleRange): boolean {
  if (!hours) return false;
  const [windowStart, windowEnd] = WINDOWS[range];
  return DAY_KEYS.some((day) =>
    hours[day].some(([open, close]) => {
      const start = toMinutes(open);
      const end = toMinutes(close);
      return start < windowEnd && end > windowStart;
    }),
  );
}

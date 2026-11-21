import type { DayKey, Hours, Place } from '../data/types';

export const DAY_ORDER: DayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const WEEKDAYS: DayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri'];

export const DAY_LABELS: Record<DayKey, string> = {
  mon: 'Lunes', tue: 'Martes', wed: 'Miércoles', thu: 'Jueves', fri: 'Viernes', sat: 'Sábado', sun: 'Domingo',
};
export const DAY_SHORT: Record<DayKey, string> = {
  mon: 'Lun', tue: 'Mar', wed: 'Mié', thu: 'Jue', fri: 'Vie', sat: 'Sáb', sun: 'Dom',
};

/** Precio para mostrar: "Gratis", "Desde $25", "Desde $7,50" o "Consultar precio". */
export function formatPrice(place: Pick<Place, 'price_from'>): string {
  const price = place.price_from;
  if (price === null || price === undefined) return 'Consultar precio';
  if (price === 0) return 'Gratis';
  const text = Number.isInteger(price) ? String(price) : price.toFixed(2).replace('.', ',');
  return `Desde $${text}`;
}

function formatSlots(slots: [string, string][]): string {
  return slots.map(([open, close]) => `${open}–${close}`).join(', ');
}

/** Resumen corto del horario: "Lun–Vie · 06:00–22:00 · Sáb 07:00–14:00". */
export function summarizeHours(hours: Hours | null): string {
  if (!hours) return 'Horario por confirmar';
  const weekdays = WEEKDAYS.map((day) => hours[day] ?? []);
  const first = weekdays[0];
  const sameWeekdays =
    first.length > 0 && weekdays.every((slots) => JSON.stringify(slots) === JSON.stringify(first));
  if (sameWeekdays) {
    const saturday = hours.sat ?? [];
    const base = `Lun–Vie · ${formatSlots(first)}`;
    return saturday.length > 0 ? `${base} · Sáb ${formatSlots(saturday)}` : base;
  }
  const open = DAY_ORDER.find((day) => (hours[day] ?? []).length > 0);
  if (!open) return 'Horario por confirmar';
  return `${DAY_SHORT[open]} ${formatSlots(hours[open])}`;
}

/** Imagen de un lugar: su foto, o la del primer deporte, o una genérica. */
export function placeImage(place: Pick<Place, 'photo_url' | 'sport_ids'>): string {
  if (place.photo_url) return place.photo_url;
  const sport = place.sport_ids[0];
  return sport ? `/img/sports/${sport}.jpg` : '/img/lugar-gimnasio.jpg';
}

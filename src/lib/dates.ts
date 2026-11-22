/** Fechas locales en formato 'AAAA-MM-DD'. Sin librerías: todo se calcula con la fecha local del navegador. */

const WEEKDAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** Convierte una fecha a 'AAAA-MM-DD' usando la fecha local (no UTC). */
export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Convierte 'AAAA-MM-DD' a Date local a medianoche. */
function fromISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Lunes de la semana de `d` (acepta Date o 'AAAA-MM-DD'). Devuelve 'AAAA-MM-DD'. */
export function mondayOf(d: Date | string): string {
  const base = typeof d === 'string' ? fromISODate(d) : new Date(d.getFullYear(), d.getMonth(), d.getDate());
  // getDay(): 0 = domingo. Con la semana empezando en lunes, el domingo retrocede 6 días.
  const offset = (base.getDay() + 6) % 7;
  return toISODate(new Date(base.getFullYear(), base.getMonth(), base.getDate() - offset));
}

/** Suma `n` días (puede ser negativo) a una fecha 'AAAA-MM-DD'. */
export function addDays(iso: string, n: number): string {
  const d = fromISODate(iso);
  return toISODate(new Date(d.getFullYear(), d.getMonth(), d.getDate() + n));
}

/** Los 7 días de la semana que empieza en `mondayISO`, en orden. */
export function weekDays(mondayISO: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(mondayISO, i));
}

/** Etiqueta corta para un día: «Lun 24/11». */
export function formatDayLabel(iso: string): string {
  const d = fromISODate(iso);
  return `${WEEKDAYS[d.getDay()]} ${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
}

/** true si la fecha 'AAAA-MM-DD' es hoy (zona local). */
export function isToday(iso: string): boolean {
  return iso === toISODate(new Date());
}

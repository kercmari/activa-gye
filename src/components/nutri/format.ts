/** Ayudas de texto del panel del nutricionista (sin datos inventados). */

/** «hace N horas» / «hace N días» a partir de una fecha ISO. */
export function hace(iso: string, now: Date = new Date()): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const minutes = Math.max(0, Math.floor((now.getTime() - then) / 60000));
  if (minutes < 60) return 'hace menos de una hora';
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} ${hours === 1 ? 'hora' : 'horas'}`;
  const days = Math.floor(hours / 24);
  return `hace ${days} ${days === 1 ? 'día' : 'días'}`;
}

/** Porcentaje entero de `done` sobre `total`; 0 si no hay días. */
export function percent(done: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((done / total) * 100);
}

/** Código de error de negocio (AppError.code) o null. */
export function codeOf(error: unknown): string | null {
  const code = (error as { code?: unknown } | null)?.code;
  return typeof code === 'string' ? code : null;
}

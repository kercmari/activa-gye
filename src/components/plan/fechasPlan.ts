/** Fechas del plan del paciente (sin depender de la zona horaria del navegador). */

/** Hoy en Guayaquil, como 'AAAA-MM-DD'. */
export function todayGuayaquil(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Guayaquil', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

const TIPOS: Record<string, string> = { dieta: 'Dieta', rutina: 'Rutina', recomendacion: 'Recomendación' };

/** «Dieta», «Rutina» o «Recomendación». */
export function tipoReceta(kind: string): string {
  return TIPOS[kind] ?? 'Receta';
}

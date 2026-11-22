/** Nombres legibles y ayudas de fecha para las pantallas de cuenta. */
import type { ActivityLevel, Goal, Role, Sex } from '../../data/types';

export const GOAL_LABELS: Record<Goal, string> = {
  bajar_peso: 'Bajar de peso',
  ganar_musculo: 'Ganar músculo',
  mantener: 'Mantenerme',
  resistencia: 'Mejorar la resistencia',
  bienestar: 'Bienestar general',
};

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentario: 'Sedentario (poca o ninguna actividad)',
  ligero: 'Ligero (1 a 3 días a la semana)',
  moderado: 'Moderado (3 a 5 días a la semana)',
  intenso: 'Intenso (6 a 7 días a la semana)',
};

export const SEX_LABELS: Record<Sex, string> = {
  femenino: 'Femenino',
  masculino: 'Masculino',
  otro: 'Otro',
  prefiero_no_decir: 'Prefiero no decir',
};

export const ROLE_LABELS: Record<Role, string> = {
  usuario: 'Usuario',
  nutricionista: 'Nutricionista',
  admin: 'Administración',
};

const pad = (n: number) => String(n).padStart(2, '0');

/** Fecha local como 'AAAA-MM-DD'. */
export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayISO(): string {
  return toISODate(new Date());
}

/** Convierte 'AAAA-MM-DD' en fecha local (sin desfase de zona horaria). */
export function parseISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDaysISO(iso: string, days: number): string {
  const d = parseISO(iso);
  return toISODate(new Date(d.getFullYear(), d.getMonth(), d.getDate() + days));
}

export function ageFrom(iso: string, today: Date = new Date()): number {
  const b = parseISO(iso);
  let age = today.getFullYear() - b.getFullYear();
  const monthDiff = today.getMonth() - b.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < b.getDate())) age -= 1;
  return age;
}

export function formatDateLong(iso: string): string {
  return parseISO(iso).toLocaleDateString('es-EC', { day: 'numeric', month: 'long', year: 'numeric' });
}

/**
 * Fecha larga desde un timestamp completo (p. ej. '2026-12-21T15:00:00+00:00'), en zona America/Guayaquil.
 * Una fecha sola 'AAAA-MM-DD' se lee como fecha local (sin desfase). Devuelve '' si el texto no es válido.
 */
export function formatDateTimeLong(iso: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return formatDateLong(iso);
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return '';
  return fecha.toLocaleDateString('es-EC', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Guayaquil',
  });
}

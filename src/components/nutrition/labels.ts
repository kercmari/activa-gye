import type { ActivityLevel, CareRequest, Goal, Sex } from '../../data';

export const SEX_OPTIONS: { value: Sex; label: string }[] = [
  { value: 'femenino', label: 'Femenino' },
  { value: 'masculino', label: 'Masculino' },
  { value: 'otro', label: 'Otro' },
  { value: 'prefiero_no_decir', label: 'Prefiero no decir' },
];

export const GOAL_OPTIONS: { value: Goal; label: string }[] = [
  { value: 'bajar_peso', label: 'Bajar de peso' },
  { value: 'ganar_musculo', label: 'Ganar músculo' },
  { value: 'mantener', label: 'Mantener mi peso' },
  { value: 'resistencia', label: 'Mejorar mi resistencia' },
  { value: 'bienestar', label: 'Bienestar general' },
];

export const ACTIVITY_OPTIONS: { value: ActivityLevel; label: string }[] = [
  { value: 'sedentario', label: 'Sedentario (casi no me muevo)' },
  { value: 'ligero', label: 'Ligero (1 a 3 días a la semana)' },
  { value: 'moderado', label: 'Moderado (3 a 5 días a la semana)' },
  { value: 'intenso', label: 'Intenso (6 a 7 días a la semana)' },
];

export const GOAL_LABELS: Record<Goal, string> = Object.fromEntries(
  GOAL_OPTIONS.map((o) => [o.value, o.label]),
) as Record<Goal, string>;

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = Object.fromEntries(
  ACTIVITY_OPTIONS.map((o) => [o.value, o.label]),
) as Record<ActivityLevel, string>;

export const SEX_LABELS: Record<Sex, string> = Object.fromEntries(
  SEX_OPTIONS.map((o) => [o.value, o.label]),
) as Record<Sex, string>;

export const STATUS_LABELS: Record<CareRequest['status'], string> = {
  abierta: 'Esperando nutricionista',
  aceptada: 'En atención',
  finalizada: 'Finalizada',
  cancelada: 'Cancelada',
};

/** Edad en años cumplidos a partir de 'AAAA-MM-DD'. null si no hay fecha válida. */
export function ageFromBirth(birth: string | null | undefined): number | null {
  if (!birth) return null;
  const [y, m, d] = birth.split('-').map(Number);
  if (!y || !m || !d) return null;
  const now = new Date();
  let age = now.getFullYear() - y;
  const hadBirthday = now.getMonth() + 1 > m || (now.getMonth() + 1 === m && now.getDate() >= d);
  if (!hadBirthday) age -= 1;
  return age;
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('es-EC', { day: 'numeric', month: 'long', year: 'numeric' });
}

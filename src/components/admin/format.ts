import type { ActivityLevel, DayKey, Goal, Role, ServiceId, Sex } from '../../data';

export const GOAL_LABELS: Record<Goal, string> = {
  bajar_peso: 'Bajar de peso',
  ganar_musculo: 'Ganar músculo',
  mantener: 'Mantener el peso',
  resistencia: 'Mejorar resistencia',
  bienestar: 'Bienestar general',
};

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentario: 'Sedentario',
  ligero: 'Ligera',
  moderado: 'Moderada',
  intenso: 'Intensa',
};

export const SEX_LABELS: Record<Sex, string> = {
  femenino: 'Femenino',
  masculino: 'Masculino',
  otro: 'Otro',
  prefiero_no_decir: 'Prefiere no decir',
};

export const ROLE_LABELS: Record<Role, string> = {
  usuario: 'Usuario',
  nutricionista: 'Nutricionista',
  admin: 'Administrador',
};

export const SERVICE_LABELS: Record<ServiceId, string> = {
  duchas: 'Duchas',
  parqueo: 'Parqueo',
  entrenador: 'Entrenador',
  casilleros: 'Casilleros',
  clases_grupales: 'Clases grupales',
  piscina: 'Piscina',
  wifi: 'Wi-Fi',
  cafeteria: 'Cafetería',
};

export const DAYS: { key: DayKey; label: string }[] = [
  { key: 'mon', label: 'Lunes' },
  { key: 'tue', label: 'Martes' },
  { key: 'wed', label: 'Miércoles' },
  { key: 'thu', label: 'Jueves' },
  { key: 'fri', label: 'Viernes' },
  { key: 'sat', label: 'Sábado' },
  { key: 'sun', label: 'Domingo' },
];

export const NUTRITION_STATUS_LABELS: Record<'enviada' | 'guia_lista' | 'respondida', string> = {
  enviada: 'Enviada',
  guia_lista: 'Guía lista',
  respondida: 'Respondida',
};

/** Fecha corta en español de Ecuador. Vacío si la fecha no es válida. */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' });
}

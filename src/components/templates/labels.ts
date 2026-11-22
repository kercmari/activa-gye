import type { PlanTemplate, PlanTemplateItem, TemplateSex, TemplateStatus, TrialItemKind } from '../../data';
import { GOAL_LABELS } from '../profile/labels';

export const SEX_TEMPLATE_LABELS: Record<TemplateSex, string> = {
  cualquiera: 'Cualquier género',
  femenino: 'Mujeres',
  masculino: 'Hombres',
};

export const KIND_LABELS: Record<TrialItemKind, string> = {
  comida: 'Comida',
  rutina: 'Rutina',
  habito: 'Hábito',
};

export const STATUS_LABELS: Record<TemplateStatus, string> = {
  borrador: 'Borrador',
  aprobada: 'Aprobada',
};

export const DAYS = [1, 2, 3, 4, 5, 6, 7] as const;

/** Objetivo en palabras, o «Cualquier objetivo» si la plantilla no pide uno. */
export function goalText(goal: PlanTemplate['goal']): string {
  return goal ? GOAL_LABELS[goal] : 'Cualquier objetivo';
}

/** Resumen de para quién es la plantilla: género, edad, IMC y objetivo. */
export function audienceText(t: Pick<PlanTemplate, 'sex' | 'age_min' | 'age_max' | 'bmi_min' | 'bmi_max' | 'goal'>): string {
  return [
    SEX_TEMPLATE_LABELS[t.sex],
    `${t.age_min}–${t.age_max} años`,
    `IMC ${t.bmi_min}–${t.bmi_max}`,
    goalText(t.goal),
  ].join(' · ');
}

/** Comprueba formato HH:MM. */
export function isValidTime(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function sortItems(items: PlanTemplateItem[]): PlanTemplateItem[] {
  return [...items].sort((a, b) => a.at_time.localeCompare(b.at_time) || a.sort - b.sort);
}

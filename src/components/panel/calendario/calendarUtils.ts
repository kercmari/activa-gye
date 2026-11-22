import type { PlanDay } from '../../../data/types';
import { addDaysISO, parseISO, toISODate } from '../../profile/labels';

export const WEEKDAY_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

/** Primer día del mes de `iso`, como 'AAAA-MM-01'. */
export function monthStartOf(iso: string): string {
  return `${iso.slice(0, 7)}-01`;
}

/** Desplaza un mes (mes inicial 'AAAA-MM-01') hacia adelante o atrás. */
export function shiftMonth(monthStart: string, delta: number): string {
  const d = parseISO(monthStart);
  return toISODate(new Date(d.getFullYear(), d.getMonth() + delta, 1));
}

/** Rango del mes completo: primer y último día, como 'AAAA-MM-DD'. */
export function monthRange(monthStart: string): { from: string; to: string } {
  const d = parseISO(monthStart);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return { from: monthStart, to: toISODate(last) };
}

/** Título del mes, p. ej. 'noviembre de 2026'. */
export function monthTitle(monthStart: string): string {
  return parseISO(monthStart).toLocaleDateString('es-EC', { month: 'long', year: 'numeric' });
}

/** Lunes de la semana que contiene `iso`. */
export function mondayOf(iso: string): string {
  const dow = (parseISO(iso).getDay() + 6) % 7; // 0 = lunes
  return addDaysISO(iso, -dow);
}

/** Siete fechas de la semana (lunes a domingo) que contiene `iso`. */
export function weekDays(iso: string): string[] {
  const monday = mondayOf(iso);
  return Array.from({ length: 7 }, (_, i) => addDaysISO(monday, i));
}

/** Cuadrícula del mes en semanas lunes–domingo. Incluye días de meses vecinos para completar filas. */
export function monthGrid(monthStart: string): string[][] {
  const { to } = monthRange(monthStart);
  const weeks: string[][] = [];
  let cursor = mondayOf(monthStart);
  while (cursor <= to) {
    weeks.push(weekDays(cursor));
    cursor = addDaysISO(cursor, 7);
  }
  return weeks;
}

/** Solo se puede marcar cumplido un día de hoy o anterior. */
export function canMarkDone(day: string, today: string): boolean {
  return day <= today;
}

export interface MonthProgress {
  done: number;
  total: number;
  /** Porcentaje entero de días cumplidos (0 si no hay días). */
  pct: number;
  /** Días seguidos cumplidos hasta hoy (ver `streakOf`). */
  streak: number;
}

/**
 * Racha: cuenta hacia atrás desde hoy los días con plan ya cumplidos. Un día de hoy aún
 * pendiente no corta la racha; un día pasado pendiente sí. Solo mira los días recibidos.
 */
export function streakOf(days: PlanDay[], today: string): number {
  const past = days.filter((d) => d.day <= today).sort((a, b) => (a.day < b.day ? 1 : -1));
  let streak = 0;
  for (const d of past) {
    if (d.done_at) streak += 1;
    else if (d.day === today) continue;
    else break;
  }
  return streak;
}

export function monthProgress(days: PlanDay[], today: string): MonthProgress {
  const total = days.length;
  const done = days.filter((d) => d.done_at).length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return { done, total, pct, streak: streakOf(days, today) };
}

/** 'lunes 16 de noviembre de 2026', para textos y etiquetas accesibles. */
export function dayLabel(iso: string): string {
  return parseISO(iso).toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

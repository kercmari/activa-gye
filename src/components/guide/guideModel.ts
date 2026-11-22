import { BookOpen, Droplets, Scale, Zap, Dumbbell, UtensilsCrossed, Moon, ShoppingCart, type LucideIcon } from 'lucide-react';
import type { GuideCategory, GuideEntry } from '../../data';

export const GUIDE_CATEGORIES: { key: GuideCategory; label: string; icon: LucideIcon }[] = [
  { key: 'hidratacion', label: 'Hidratación', icon: Droplets },
  { key: 'porciones', label: 'Porciones', icon: Scale },
  { key: 'antes_entrenar', label: 'Antes de entrenar', icon: Zap },
  { key: 'despues_entrenar', label: 'Después de entrenar', icon: Dumbbell },
  { key: 'comer_fuera', label: 'Comer fuera', icon: UtensilsCrossed },
  { key: 'descanso', label: 'Descanso', icon: Moon },
  { key: 'compras', label: 'Compras', icon: ShoppingCart },
];

export const CATEGORY_LABELS: Record<GuideCategory, string> = Object.fromEntries(
  GUIDE_CATEGORIES.map((c) => [c.key, c.label]),
) as Record<GuideCategory, string>;

/** Ícono de una categoría (libro si no hay categoría conocida). */
export function categoryIcon(category: GuideCategory): LucideIcon {
  return GUIDE_CATEGORIES.find((c) => c.key === category)?.icon ?? BookOpen;
}

/** Minúsculas y sin tildes, para comparar textos en el buscador. */
export function normalize(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

/** Filtra por categoría y por texto (título, resumen y ítems Sí/Evita). */
export function filterGuide(entries: GuideEntry[], category: GuideCategory | 'todas', query: string): GuideEntry[] {
  const q = normalize(query);
  return entries.filter((entry) => {
    if (category !== 'todas' && entry.category !== category) return false;
    if (!q) return true;
    const haystack = normalize([entry.title, entry.summary ?? '', ...entry.do_items, ...entry.avoid_items].join(' \n '));
    return haystack.includes(q);
  });
}

/** Conteo de entradas por categoría. */
export function countByCategory(entries: GuideEntry[]): Record<GuideCategory, number> {
  const counts = Object.fromEntries(GUIDE_CATEGORIES.map((c) => [c.key, 0])) as Record<GuideCategory, number>;
  for (const entry of entries) counts[entry.category] += 1;
  return counts;
}

/** Convierte un texto de varias líneas en una lista (sin líneas vacías). */
export function linesToList(text: string): string[] {
  return text.split('\n').map((line) => line.trim()).filter(Boolean);
}

export function listToLines(items: string[]): string {
  return items.join('\n');
}

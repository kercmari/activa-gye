import { Activity, Bike, Dumbbell, HeartPulse, Sparkles, Swords, Users, Waves, Zap, type LucideIcon } from 'lucide-react';

const ICONS = new Map<string, LucideIcon>([
  ['Dumbbell', Dumbbell],
  ['Zap', Zap],
  ['Sparkles', Sparkles],
  ['HeartPulse', HeartPulse],
  ['Waves', Waves],
  ['Swords', Swords],
  ['Users', Users],
  ['Bike', Bike],
]);

/** Ícono de lucide por nombre (el que guarda el deporte). Si no existe, `Activity`. */
export function sportIcon(name: string): LucideIcon {
  return ICONS.get(name) ?? Activity;
}

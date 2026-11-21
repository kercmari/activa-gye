/** Opciones de filtros y servicios de lugares, compartidas por la búsqueda y la ficha. */
import { Car, Coffee, Lock, ShowerHead, UserCheck, Users, Waves, Wifi, type LucideIcon } from 'lucide-react';
import type { PriceRange, ScheduleRange, ServiceId } from '../../data/types';

export const PRICE_OPTIONS: { value: PriceRange | ''; label: string }[] = [
  { value: '', label: 'Todos los precios' },
  { value: 'gratis', label: 'Gratis' },
  { value: 'hasta20', label: 'Hasta $20' },
  { value: '20a40', label: '$20 a $40' },
  { value: 'mas40', label: 'Más de $40' },
];

export const SCHEDULE_OPTIONS: { value: ScheduleRange | ''; label: string }[] = [
  { value: '', label: 'Cualquier horario' },
  { value: 'manana', label: 'Mañana (5:00–12:00)' },
  { value: 'tarde', label: 'Tarde (12:00–18:00)' },
  { value: 'noche', label: 'Noche (18:00–23:00)' },
];

export const SERVICE_OPTIONS: { id: ServiceId; label: string; icon: LucideIcon }[] = [
  { id: 'duchas', label: 'Duchas', icon: ShowerHead },
  { id: 'parqueo', label: 'Parqueo', icon: Car },
  { id: 'entrenador', label: 'Entrenador personal', icon: UserCheck },
  { id: 'casilleros', label: 'Casilleros', icon: Lock },
  { id: 'clases_grupales', label: 'Clases grupales', icon: Users },
  { id: 'piscina', label: 'Piscina', icon: Waves },
  { id: 'wifi', label: 'Wi-Fi', icon: Wifi },
  { id: 'cafeteria', label: 'Cafetería', icon: Coffee },
];

/**
 * Repo real con Supabase. Une las partes de cada tarea (dueño: orquestador):
 * - account.ts  (D1): auth, perfil, favoritos, progreso, contacto, admin de usuarios/mensajes, fases.
 * - catalog.ts  (D1): sectores, deportes, lugares, admin de lugares.
 * - care.ts     (D2): ficha, solicitudes, pacientes, tablero, avisos.
 * - plan.ts     (D3): seguimientos, calendario, pagos, reseñas, lugares incompletos.
 * Lo que una parte todavía no implementa responde SIN_BASE.
 */
import type { Repo } from '../types';
import { withFallback } from '../fallback';
import { accountPart } from './account';
import { catalogPart } from './catalog';
import { carePart } from './care';
import { planPart } from './plan';

export const supabaseRepo: Repo = withFallback({ ...catalogPart, ...accountPart, ...carePart, ...planPart });

/**
 * Simulador de datos (sin servidor). Se arma con dos partes:
 * - catalog.ts  (tarea F2a): sectores, deportes, lugares, contacto, admin de lugares y mensajes.
 * - accounts.ts (tarea F2b): cuentas, sesión, perfil, favoritos, progreso, nutrición, admin de usuarios.
 * Este archivo solo las une: no lo cambies.
 */
import type { Repo } from '../types';
import { catalogPart } from './catalog';
import { accountsPart } from './accounts';

export const mockRepo: Repo = { ...catalogPart, ...accountsPart } as Repo;

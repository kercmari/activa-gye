/** Punto único de datos. Hoy: simulador en el navegador. Mañana: Supabase (mismo contrato `Repo`). */
import type { Repo } from './types';
import { mockRepo } from './mock';

export const repo: Repo = mockRepo;
export * from './types';

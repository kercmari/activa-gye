/**
 * Punto único de datos (dueño: orquestador).
 * Con VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY → Supabase real. Sin ellas (pruebas) → simulador.
 */
import type { Repo } from './types';
import { mockRepo } from './mock';
import { supabaseRepo } from './supabase';

export const usingSupabase = Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)
  && import.meta.env.MODE !== 'test';

export const repo: Repo = usingSupabase ? supabaseRepo : mockRepo;
export * from './types';

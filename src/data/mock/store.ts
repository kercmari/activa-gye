/**
 * Almacén del simulador: tablas guardadas en localStorage. Lo usan catalog.ts y accounts.ts. NO cambiar la forma.
 * Cada tabla es una lista JSON en la clave `activa-gye:v1:<nombre>`.
 */
import type { Profile } from '../types';

const PREFIX = 'activa-gye:v1:';
const SESSION_KEY = PREFIX + 'session';

export type StoredUser = { id: string; email: string; password_hash: string; profile: Profile };

export function readTable<T>(name: string): T[] {
  try {
    const raw = localStorage.getItem(PREFIX + name);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

export function writeTable<T>(name: string, rows: T[]): void {
  localStorage.setItem(PREFIX + name, JSON.stringify(rows));
}

export function getSessionUserId(): string | null {
  try { return localStorage.getItem(SESSION_KEY); } catch { return null; }
}

export function setSessionUserId(id: string | null): void {
  if (id) localStorage.setItem(SESSION_KEY, id);
  else localStorage.removeItem(SESSION_KEY);
}

/** Cuenta con sesión iniciada (tabla 'users'), o null. */
export function currentUser(): StoredUser | null {
  const id = getSessionUserId();
  if (!id) return null;
  return readTable<StoredUser>('users').find((u) => u.id === id) ?? null;
}

/** Hash SHA-256 de "activa-gye:" + correo + ":" + contraseña (simulado; en Supabase lo hace el servidor). */
export async function hashPassword(email: string, password: string): Promise<string> {
  const data = new TextEncoder().encode(`activa-gye:${email.toLowerCase()}:${password}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Simula la espera de la red (0 ms en tests). */
export function wait(ms = 120): Promise<void> {
  const delay = import.meta.env.MODE === 'test' ? 0 : ms;
  return new Promise((resolve) => setTimeout(resolve, delay));
}

export const nowIso = () => new Date().toISOString();

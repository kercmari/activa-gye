/** Une partes de un Repo; lo que falta responde AppError('SIN_BASE'). Dueño: orquestador. */
import { AppError, type Repo } from './types';

const sinBase = () => Promise.reject(new AppError('SIN_BASE', 'Esta función necesita la base de datos. Inténtalo más tarde.'));

export function withFallback(parts: Partial<Repo>): Repo {
  return new Proxy(parts, {
    get(target, key: string | symbol) {
      if (key in target) return (target as Record<string | symbol, unknown>)[key];
      if (typeof key === 'symbol' || key === 'then') return undefined;
      return sinBase;
    },
  }) as Repo;
}

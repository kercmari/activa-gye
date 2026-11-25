import { useEffect, useState } from 'react';
import { repo } from '../../data';

/**
 * Cuántas solicitudes de suscripción esperan aprobación (pacientes y nutricionistas).
 * Devuelve null mientras carga o si falla: el contador es un extra y nunca bloquea el menú.
 */
export function usePendingCount(enabled: boolean): number | null {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    // Promise.resolve().then: un error síncrono de repo también termina en el catch.
    Promise.resolve()
      .then(() => repo.adminSubscriptionsOverview())
      .then((overview) => { if (alive) setCount(overview.pending.length); })
      .catch(() => { if (alive) setCount(null); });
    return () => { alive = false; };
  }, [enabled]);

  return count;
}

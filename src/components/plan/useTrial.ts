/** Semana gratis del paciente: carga la semana y marca ítems. Sustituto creado por U7d (si U7a lo entrega, usar el de U7a). */
import { useCallback, useEffect, useState } from 'react';
import { repo, type Trial } from '../../data';
import { errorMessage } from '../ui/States';

export function useTrial() {
  const [trial, setTrial] = useState<Trial | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [run, setRun] = useState(0);

  useEffect(() => {
    let alive = true;
    repo.getMyTrial().then(
      (t) => { if (alive) { setTrial(t); setLoading(false); } },
      (e: unknown) => { if (alive) { setError(errorMessage(e)); setLoading(false); } },
    );
    return () => { alive = false; };
  }, [run]);

  const reload = useCallback(() => {
    setLoading(true);
    setError(null);
    setRun((n) => n + 1);
  }, []);

  /** Marca o desmarca un ítem y reemplaza la semana con la respuesta de la base. */
  const setItemDone = useCallback(async (itemId: string, done: boolean) => {
    const next = await repo.setTrialItemDone(itemId, done);
    setTrial(next);
    return next;
  }, []);

  return { trial, loading, error, reload, setItemDone };
}

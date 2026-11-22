import { useCallback, useEffect, useRef, useState } from 'react';
import { repo, type Trial } from '../../data';
import { errorMessage } from '../ui/States';

export interface UseTrial {
  trial: Trial | null;
  loading: boolean;
  /** Mensaje ya en español, o null. */
  error: string | null;
  reload: () => Promise<void>;
  /** Marca/desmarca un ítem. Reemplaza el estado con la semana que devuelve la base. Si falla, lanza el error. */
  setItemDone: (itemId: string, done: boolean) => Promise<void>;
}

/** Mi semana gratis (Hoy, Agenda y Progreso comparten estos datos). */
export function useTrial(): UseTrial {
  const [trial, setTrial] = useState<Trial | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await repo.getMyTrial();
      if (alive.current) setTrial(next);
    } catch (e) {
      if (alive.current) setError(errorMessage(e));
    } finally {
      if (alive.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const setItemDone = useCallback(async (itemId: string, done: boolean) => {
    const next = await repo.setTrialItemDone(itemId, done);
    if (alive.current) setTrial(next);
  }, []);

  return { trial, loading, error, reload, setItemDone };
}

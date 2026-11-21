import { useCallback, useEffect, useState } from 'react';
import { errorMessage } from '../ui/States';

export type AsyncState<T> =
  | { status: 'loading' }
  | { status: 'ok'; data: T }
  | { status: 'error'; message: string };

/** Carga datos con los tres estados (cargando, ok, error) y `reload` para "Reintentar". */
export function useAsync<T>(load: () => Promise<T>, deps: unknown[] = []) {
  const [run, setRun] = useState(0);
  const [state, setState] = useState<AsyncState<T>>({ status: 'loading' });

  useEffect(() => {
    let alive = true;
    load().then(
      (data) => { if (alive) setState({ status: 'ok', data }); },
      (error: unknown) => { if (alive) setState({ status: 'error', message: errorMessage(error) }); },
    );
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run, ...deps]);

  const reload = useCallback(() => {
    setState({ status: 'loading' });
    setRun((n) => n + 1);
  }, []);

  return { ...state, reload };
}

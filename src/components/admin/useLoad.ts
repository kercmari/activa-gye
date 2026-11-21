import { useCallback, useEffect, useState } from 'react';
import { errorMessage } from '../ui/States';

export type LoadState<T> =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ok'; data: T };

/** Carga datos al montar (y cuando cambian `deps`). `retry` vuelve a intentar. */
export function useLoad<T>(load: () => Promise<T>, deps: unknown[] = []) {
  const [state, setState] = useState<LoadState<T>>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    setState({ status: 'loading' });
    load().then(
      (data) => { if (alive) setState({ status: 'ok', data }); },
      (error: unknown) => { if (alive) setState({ status: 'error', message: errorMessage(error) }); },
    );
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt, ...deps]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { state, retry };
}

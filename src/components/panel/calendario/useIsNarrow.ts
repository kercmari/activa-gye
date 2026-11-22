import { useEffect, useState } from 'react';

const QUERY = '(max-width: 767px)';

function canMatch(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function';
}

/** true en pantallas de celular (menos de 768 px). Sin matchMedia (p. ej. pruebas) devuelve false. */
export function useIsNarrow(): boolean {
  const [narrow, setNarrow] = useState(() => canMatch() && window.matchMedia(QUERY).matches);

  useEffect(() => {
    if (!canMatch()) return;
    const mq = window.matchMedia(QUERY);
    const onChange = () => setNarrow(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return narrow;
}

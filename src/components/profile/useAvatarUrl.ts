import { useEffect, useState } from 'react';
import { repo } from '../../data';

/** URL firmada de la foto guardada en `path` (o null si no hay foto o no se pudo cargar). */
export function useAvatarUrl(path: string | null | undefined): string | null {
  const [cargada, setCargada] = useState<{ path: string; url: string | null } | null>(null);

  useEffect(() => {
    if (!path) return;
    let vigente = true;
    repo.avatarUrl(path).then(
      (url) => { if (vigente) setCargada({ path, url }); },
      () => { if (vigente) setCargada({ path, url: null }); },
    );
    return () => { vigente = false; };
  }, [path]);

  // Si la ruta cambió, la URL anterior ya no vale: se devuelve null hasta que llegue la nueva.
  return path && cargada?.path === path ? cargada.url : null;
}

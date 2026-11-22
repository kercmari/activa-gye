/** Semana gratis del paciente con los tres estados (cargando, ok, error) y `reload`. Lo crea U7a; esta copia tiene la misma firma. */
import { repo, type Trial } from '../../data';
import { useAsync } from '../profile/useAsync';

export function useTrial() {
  return useAsync<Trial | null>(() => repo.getMyTrial());
}

/** Estado del buscador de la portada. Vacíos = sin filtro. */
export interface SearchState {
  nombre: string;
  sector: string;
  deporte: string;
  precio: string;
  horario: string;
  servicios: string[];
  cerca: boolean;
}

/**
 * Convierte el buscador en la query de /lugares (sin "?").
 * Omite lo vacío; los servicios van separados por coma; cerca=1 solo si está marcado.
 */
export function buildSearchParams(state: Partial<SearchState>): string {
  const params = new URLSearchParams();
  const put = (key: string, value: string | undefined) => {
    if (value && value.trim() !== '') params.set(key, value.trim());
  };
  put('nombre', state.nombre);
  put('sector', state.sector);
  put('deporte', state.deporte);
  put('precio', state.precio);
  put('horario', state.horario);
  if (state.servicios && state.servicios.length > 0) params.set('servicios', state.servicios.join(','));
  if (state.cerca) params.set('cerca', '1');
  return params.toString();
}

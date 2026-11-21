import { describe, expect, it } from 'vitest';
import { buildSearchParams } from './searchParams';

describe('buildSearchParams', () => {
  it('buildSearchParams omite vacíos y une servicios con coma', () => {
    const query = buildSearchParams({
      nombre: 'Olympic',
      sector: 'norte',
      deporte: '',
      precio: '',
      horario: '',
      servicios: ['duchas', 'parqueo'],
      cerca: true,
    });
    expect(query).toBe('nombre=Olympic&sector=norte&servicios=duchas%2Cparqueo&cerca=1');
  });

  it('devuelve cadena vacía sin filtros', () => {
    expect(buildSearchParams({ nombre: '  ', servicios: [], cerca: false })).toBe('');
  });
});

import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DeportesPage from './DeportesPage';

vi.mock('../data', () => ({
  repo: {
    listSectors: vi.fn().mockResolvedValue([]),
    listSports: vi.fn().mockResolvedValue([]),
    searchPlaces: vi.fn().mockResolvedValue([]),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('DeportesPage (panel de deportes)', () => {
  it('muestra el buscador, «Explora por deporte» y «Lugares recomendados»', async () => {
    render(
      <MemoryRouter>
        <DeportesPage />
      </MemoryRouter>,
    );
    expect(screen.getByRole('search', { name: 'Buscar lugares' })).toBeInTheDocument();
    expect(await screen.findByText('Explora por deporte')).toBeInTheDocument();
    expect(screen.getByText('Lugares recomendados')).toBeInTheDocument();
  });

  it('ofrece accesos a Buscar lugares y Comparar', () => {
    render(
      <MemoryRouter>
        <DeportesPage />
      </MemoryRouter>,
    );
    const accesos = screen.getByRole('navigation', { name: 'Accesos de deportes' });
    expect(accesos.querySelector('a[href="/lugares"]')).not.toBeNull();
    expect(accesos.querySelector('a[href="/comparar"]')).not.toBeNull();
  });
});

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Place } from '../data';
import CompararPage from './CompararPage';

const { getPlaces, fases } = vi.hoisted(() => ({ getPlaces: vi.fn(), fases: { fase3: false } }));

vi.mock('../auth/SettingsContext', () => ({
  usePhase: (n: number) => (n === 3 ? fases.fase3 : true),
}));

vi.mock('../data', () => ({
  repo: {
    getPlaces,
    listSectors: async () => [{ id: 'norte', name: 'Norte', sort: 1 }],
  },
}));

function place(id: string, name: string): Place {
  return {
    id, name, description: null, address: null, sector_id: 'norte', lat: -2.17, lng: -79.9,
    phone: null, whatsapp: null, website: null, instagram: null, photo_url: null, gallery: [],
    price_from: 10, price_note: null, promotions: null, services: ['duchas'], hours: null,
    source: 'admin', osm_id: null, published: true, verified_at: null,
    created_at: '2026-11-21', updated_at: '2026-11-21', sport_ids: ['yoga'],
  };
}

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="url">{location.pathname + location.search}</div>;
}

function renderAt(url: string) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/comparar" element={<CompararPage />} />
        <Route path="/lugares" element={<div>Buscar</div>} />
      </Routes>
      <LocationProbe />
    </MemoryRouter>,
  );
}

describe('CompararPage', () => {
  beforeEach(() => {
    getPlaces.mockReset();
    getPlaces.mockImplementation(async (ids: string[]) =>
      ids.map((id) => place(id, id === 'p1' ? 'Yoga Norte' : id === 'p2' ? 'Yoga Sol' : 'Yoga Mar')),
    );
  });

  it('con menos de 2 pide elegir', async () => {
    renderAt('/comparar?ids=p1');
    expect(await screen.findByText('Elige al menos 2 lugares para comparar')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Buscar lugares' })).toHaveAttribute('href', '/lugares');
    expect(getPlaces).not.toHaveBeenCalled();
  });

  it('quitar actualiza la URL', async () => {
    renderAt('/comparar?ids=p1,p2,p3');
    const removeFirst = (await screen.findAllByRole('button', { name: 'Quitar Yoga Norte' }))[0];
    fireEvent.click(removeFirst);
    await waitFor(() => expect(screen.getByTestId('url')).toHaveTextContent('/comparar?ids=p2,p3'));
  });
});

describe('CompararPage · precio, horario y abierto solo con la fase 3', () => {
  beforeEach(() => {
    getPlaces.mockReset();
    getPlaces.mockImplementation(async (ids: string[]) =>
      ids.map((id) => ({ ...place(id, id === 'p1' ? 'Yoga Norte' : 'Yoga Sol'), hours: { mon: [['06:00', '22:00']], tue: [['06:00', '22:00']], wed: [['06:00', '22:00']], thu: [['06:00', '22:00']], fri: [['06:00', '22:00']], sat: [], sun: [] } })),
    );
  });

  it('con fase 3 apagada no tiene filas de precio, horario ni abierto, y sigue con sector y promociones', async () => {
    fases.fase3 = false;
    renderAt('/comparar?ids=p1,p2');
    expect((await screen.findAllByText('Sector')).length).toBeGreaterThan(0);
    expect(screen.queryByText('Precio')).toBeNull();
    expect(screen.queryByText('Horario')).toBeNull();
    expect(screen.queryByText('Abierto ahora')).toBeNull();
    expect(screen.queryByText(/Desde \$10/)).toBeNull();
    expect(screen.getAllByText('Promociones').length).toBeGreaterThan(0);
  });

  it('con fase 3 encendida muestra precio, horario y abierto ahora', async () => {
    fases.fase3 = true;
    renderAt('/comparar?ids=p1,p2');
    expect((await screen.findAllByText('Precio')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Horario').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Abierto ahora').length).toBeGreaterThan(0);
  });
});

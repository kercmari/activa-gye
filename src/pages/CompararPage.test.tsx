import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Place } from '../data';
import CompararPage from './CompararPage';

const { getPlaces } = vi.hoisted(() => ({ getPlaces: vi.fn() }));

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

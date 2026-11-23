import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Place } from '../data';
import { googleDirectionsUrl } from '../lib/directions';
import LugarPage from './LugarPage';

const { getPlace, fases } = vi.hoisted(() => ({
  getPlace: vi.fn(),
  fases: { fase3: false },
}));

vi.mock('../data', () => ({
  repo: {
    getPlace,
    listSports: async () => [{ id: 'yoga', name: 'Yoga', icon: 'Sparkles', image_url: null, sort: 1 }],
    listSectors: async () => [{ id: 'norte', name: 'Norte', sort: 1 }],
    isFavorite: async () => false,
    toggleFavorite: async () => true,
    getRating: async () => ({ average: null, count: 0 }),
    listReviews: async () => [],
    saveReview: async () => { throw new Error('no usado'); },
    deleteMyReview: async () => {},
  },
}));

vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({ session: null, loading: false, refresh: async () => {} }),
}));

vi.mock('../auth/SettingsContext', () => ({
  usePhase: (n: number) => (n === 3 ? fases.fase3 : true),
  useSettings: () => ({ settings: { phase1: true, phase2: true, phase3: fases.fase3 }, loading: false, reload: async () => {} }),
}));

vi.mock('react-leaflet', () => ({
  MapContainer: () => null,
  TileLayer: () => null,
  CircleMarker: () => null,
  Popup: () => null,
}));

const PLACE: Place = {
  id: 'p1', name: 'Yoga Norte', description: null, address: 'Av. Principal 123', sector_id: 'norte',
  lat: -2.1894, lng: -79.9, phone: null, whatsapp: null, website: null, instagram: null,
  photo_url: null, gallery: [], price_from: 0, price_note: null, promotions: null, services: [],
  hours: null, source: 'admin', osm_id: null, published: true, verified_at: null,
  created_at: '2026-11-21', updated_at: '2026-11-21', sport_ids: ['yoga'],
};

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="url">{location.pathname + location.search}</div>;
}

function renderAt(url: string) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/lugares/:id" element={<LugarPage />} />
        <Route path="/ingresar" element={<div>Pantalla de ingreso</div>} />
        <Route path="/lugares" element={<div>Buscar</div>} />
      </Routes>
      <LocationProbe />
    </MemoryRouter>,
  );
}

describe('LugarPage', () => {
  beforeEach(() => {
    getPlace.mockReset();
    getPlace.mockResolvedValue(PLACE);
    fases.fase3 = false;
  });

  it('muestra Cómo llegar con el enlace de Google Maps correcto', async () => {
    renderAt('/lugares/p1');
    const link = await screen.findByRole('link', { name: /Cómo llegar/ });
    expect(link).toHaveAttribute('href', googleDirectionsUrl(PLACE));
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('favorito sin sesión lleva a ingresar', async () => {
    renderAt('/lugares/p1');
    fireEvent.click(await screen.findByRole('button', { name: /Guardar en favoritos/ }));
    expect(await screen.findByText('Pantalla de ingreso')).toBeInTheDocument();
    expect(screen.getByTestId('url')).toHaveTextContent('/ingresar?volver=/lugares/p1');
  });

  it('con fase 3 apagada no muestra la sección de reseñas ni su aviso', async () => {
    renderAt('/lugares/p1');
    expect(await screen.findByRole('link', { name: /Cómo llegar/ })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Reseñas' })).not.toBeInTheDocument();
    expect(screen.queryByText(/Próximamente/)).not.toBeInTheDocument();
  });

  it('con fase 3 encendida muestra la sección de reseñas', async () => {
    fases.fase3 = true;
    renderAt('/lugares/p1');
    expect(await screen.findByRole('heading', { name: 'Reseñas' })).toBeInTheDocument();
  });

  it('lugar inexistente muestra mensaje y enlace de búsqueda', async () => {
    getPlace.mockResolvedValue(null);
    renderAt('/lugares/no-existe');
    expect(await screen.findByText('Este lugar no existe o ya no está publicado')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('link', { name: 'Buscar lugares' })).toHaveAttribute('href', '/lugares'));
  });
});

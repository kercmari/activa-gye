import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Place } from '../data';
import LugaresPage from './LugaresPage';

const { searchPlaces, fases } = vi.hoisted(() => ({ searchPlaces: vi.fn(), fases: { fase3: false } }));

vi.mock('../auth/SettingsContext', () => ({
  usePhase: (n: number) => (n === 3 ? fases.fase3 : true),
}));

vi.mock('../data', () => ({
  repo: {
    listSectors: async () => [{ id: 'norte', name: 'Norte', sort: 1 }],
    listSports: async () => [{ id: 'yoga', name: 'Yoga', icon: 'Sparkles', image_url: null, sort: 1 }],
    searchPlaces,
  },
}));

vi.mock('react-leaflet', () => ({
  MapContainer: () => null,
  TileLayer: () => null,
  CircleMarker: () => null,
  Popup: () => null,
}));

function place(id: string, name: string): Place {
  return {
    id, name, description: null, address: null, sector_id: 'norte', lat: -2.17, lng: -79.9,
    phone: null, whatsapp: null, website: null, instagram: null, photo_url: null, gallery: [],
    price_from: 0, price_note: null, promotions: null, services: [], hours: null,
    source: 'admin', osm_id: null, published: true, verified_at: null,
    created_at: '2026-11-21', updated_at: '2026-11-21', sport_ids: ['yoga'],
  };
}

const PLACES = [place('p1', 'Yoga Norte'), place('p2', 'Yoga Sol'), place('p3', 'Yoga Mar'), place('p4', 'Yoga Río')];

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="url">{location.pathname + location.search}</div>;
}

function renderAt(url: string) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/lugares" element={<LugaresPage />} />
        <Route path="/comparar" element={<div>Comparar destino</div>} />
      </Routes>
      <LocationProbe />
    </MemoryRouter>,
  );
}

describe('LugaresPage', () => {
  beforeEach(() => {
    searchPlaces.mockReset();
    searchPlaces.mockResolvedValue(PLACES);
  });

  it('lee filtros de la URL y llama searchPlaces con sport yoga', async () => {
    renderAt('/lugares?deporte=yoga');
    await waitFor(() => expect(searchPlaces).toHaveBeenCalledWith({ sport: 'yoga' }));
    expect(await screen.findByText('4 lugares encontrados')).toBeInTheDocument();
  });

  it('sin resultados muestra Quitar filtros', async () => {
    searchPlaces.mockResolvedValue([]);
    renderAt('/lugares?deporte=yoga');
    expect(await screen.findByText('No encontramos lugares con esos filtros')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Quitar filtros' })).toHaveAttribute('href', '/lugares');
  });

  it('comparar habilita el botón con 2 y bloquea el cuarto', async () => {
    renderAt('/lugares');
    const boxes = await screen.findAllByRole('checkbox', { name: 'Comparar' });
    expect(boxes).toHaveLength(4);

    fireEvent.click(boxes[0]);
    fireEvent.click(boxes[1]);
    expect(screen.getByRole('link', { name: 'Comparar (2)' })).toHaveAttribute('href', '/comparar?ids=p1,p2');

    fireEvent.click(boxes[2]);
    expect(screen.getByRole('link', { name: 'Comparar (3)' })).toBeInTheDocument();
    // Con 3 elegidos, la cuarta casilla queda deshabilitada con el texto "Máximo 3".
    expect(screen.getByRole('checkbox', { name: 'Máximo 3' })).toBeDisabled();
  });
});

describe('LugaresPage · filtros de precio y horario solo con la fase 3', () => {
  beforeEach(() => {
    searchPlaces.mockReset();
    searchPlaces.mockResolvedValue(PLACES);
  });

  it('con fase 3 apagada no muestra los filtros y ignora ?precio= y ?horario= de la URL', async () => {
    fases.fase3 = false;
    renderAt('/lugares?precio=gratis&horario=manana');
    await waitFor(() => expect(searchPlaces).toHaveBeenCalled());
    expect(searchPlaces).toHaveBeenLastCalledWith({});
    expect(screen.queryByLabelText('Precio')).toBeNull();
    expect(screen.queryByLabelText('Horario')).toBeNull();
    expect(screen.getByLabelText('Zona o sector')).toBeInTheDocument();
  });

  it('con fase 3 encendida muestra los filtros y aplica ?precio=', async () => {
    fases.fase3 = true;
    renderAt('/lugares?precio=gratis');
    await waitFor(() => expect(searchPlaces).toHaveBeenCalledWith({ price: 'gratis' }));
    expect(screen.getByLabelText('Precio')).toBeInTheDocument();
    expect(screen.getByLabelText('Horario')).toBeInTheDocument();
  });
});

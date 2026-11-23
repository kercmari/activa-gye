import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Hours, Place } from '../../data/types';
import PlaceCard from './PlaceCard';

const { fases } = vi.hoisted(() => ({ fases: { fase3: false } }));

vi.mock('../../auth/SettingsContext', () => ({
  usePhase: (n: number) => (n === 3 ? fases.fase3 : true),
}));

const HOURS: Hours = {
  mon: [['06:00', '22:00']], tue: [['06:00', '22:00']], wed: [['06:00', '22:00']],
  thu: [['06:00', '22:00']], fri: [['06:00', '22:00']], sat: [], sun: [],
};

const PLACE: Place = {
  id: 'p1', name: 'Yoga Norte', description: 'Clases de yoga', address: null, sector_id: 'norte',
  lat: -2.17, lng: -79.9, phone: null, whatsapp: null, website: null, instagram: null,
  photo_url: null, gallery: [], price_from: 25, price_note: null, promotions: null, services: [],
  hours: HOURS, source: 'admin', osm_id: null, published: true, verified_at: null,
  created_at: '2026-11-21', updated_at: '2026-11-21', sport_ids: ['yoga'],
};

function renderCard(place: Place) {
  return render(
    <MemoryRouter>
      <PlaceCard place={place} sectorName="Norte" sportName="Yoga" distanceKm={1.2} />
    </MemoryRouter>,
  );
}

describe('PlaceCard · precio y horario solo con la fase 3', () => {
  beforeEach(() => {
    fases.fase3 = false;
  });

  it('con fase 3 apagada no muestra horario ni precio, pero sí la tarjeta y el enlace a la ficha', () => {
    renderCard(PLACE);
    expect(screen.getByText('Yoga Norte')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver Yoga Norte' })).toHaveAttribute('href', '/lugares/p1');
    expect(screen.queryByText(/Desde \$25/)).toBeNull();
    expect(screen.queryByText(/Consultar precio|Gratis/)).toBeNull();
    expect(screen.queryByText(/06:00/)).toBeNull();
    expect(screen.queryByText(/Horario por confirmar/)).toBeNull();
    expect(screen.queryByText(/OpenStreetMap/)).toBeNull();
  });

  it('con fase 3 encendida muestra el horario y el precio', () => {
    fases.fase3 = true;
    renderCard(PLACE);
    expect(screen.getByText('Desde $25')).toBeInTheDocument();
    expect(screen.getByText(/06:00/)).toBeInTheDocument();
  });
});

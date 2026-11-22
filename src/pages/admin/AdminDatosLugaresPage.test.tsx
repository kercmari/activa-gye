import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { usePhase } from '../../auth/SettingsContext';
import AdminDatosLugaresPage from './AdminDatosLugaresPage';

const h = vi.hoisted(() => ({
  repo: {
    adminListIncompletePlaces: vi.fn(),
    adminSavePlace: vi.fn(),
    listSectors: vi.fn(),
  },
}));

vi.mock('../../data', () => ({ repo: h.repo }));
vi.mock('../../auth/AuthContext', () => ({
  useAuth: () => ({
    session: { user: { id: 'admin-1', email: 'admin@activagye.test' }, profile: { role: 'admin' } },
    loading: false,
    refresh: async () => {},
  }),
}));
vi.mock('../../auth/SettingsContext', () => ({ usePhase: vi.fn() }));

const lugar = (over: Partial<Record<string, unknown>>) => ({
  id: 'l1',
  name: 'Gimnasio Norte',
  description: null,
  address: null,
  sector_id: 'norte',
  lat: -2.1,
  lng: -79.9,
  phone: null,
  whatsapp: null,
  website: null,
  instagram: null,
  photo_url: null,
  gallery: [],
  price_from: null,
  price_note: null,
  promotions: null,
  services: [],
  hours: null,
  source: 'admin',
  osm_id: null,
  published: true,
  verified_at: null,
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
  sport_ids: [],
  ...over,
});

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/admin/datos-lugares']}>
      <Routes>
        <Route path="/admin/datos-lugares" element={<AdminDatosLugaresPage />} />
        <Route path="/admin/lugares/:id" element={<p>Editar lugar</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(usePhase).mockReturnValue(true);
  h.repo.listSectors.mockResolvedValue([{ id: 'norte', name: 'Norte', sort: 1 }]);
  h.repo.adminListIncompletePlaces.mockResolvedValue([
    lugar({ id: 'l1', name: 'Gimnasio Norte', hours: { mon: [['06:00', '18:00']] } }),
    lugar({ id: 'l2', name: 'Yoga Centro', price_from: 5, hours: null }),
  ]);
  h.repo.adminSavePlace.mockResolvedValue({});
});

describe('AdminDatosLugaresPage', () => {
  it('lista lugares incompletos con su contador', async () => {
    renderPage();

    expect(await screen.findByText('2 lugares por completar')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Gimnasio Norte' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Yoga Centro' })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Editar todo' })[0]).toHaveAttribute('href', '/admin/lugares/l1');
    expect(screen.getAllByLabelText('Precio desde (USD)')).toHaveLength(1);
  });

  it('guardar precio llama adminSavePlace', async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('2 lugares por completar');
    await user.type(screen.getByLabelText('Precio desde (USD)'), '12.5');
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(h.repo.adminSavePlace).toHaveBeenCalledTimes(1));
    expect(h.repo.adminSavePlace).toHaveBeenCalledWith(expect.objectContaining({ id: 'l1', price_from: 12.5 }));
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Gimnasio Norte' })).not.toBeInTheDocument());
  });
});

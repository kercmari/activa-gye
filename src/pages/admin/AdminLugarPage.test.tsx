import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import AdminLugarPage from './AdminLugarPage';

const h = vi.hoisted(() => ({
  repo: {
    listSectors: vi.fn(),
    listSports: vi.fn(),
    adminListPlaces: vi.fn(),
    adminSavePlace: vi.fn(),
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
vi.mock('react-leaflet', () => ({
  MapContainer: (props: { children?: ReactNode }) => props.children ?? null,
  TileLayer: () => null,
  CircleMarker: () => null,
  useMapEvents: () => null,
}));

function renderNuevo() {
  return render(
    <MemoryRouter initialEntries={['/admin/lugares/nuevo']}>
      <Routes>
        <Route path="/admin/lugares/nuevo" element={<AdminLugarPage />} />
        <Route path="/admin/lugares" element={<p>Lista de lugares</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

async function llenarBasicos(user: ReturnType<typeof userEvent.setup>) {
  await user.type(await screen.findByLabelText('Nombre'), 'Gimnasio Prueba');
  await user.type(screen.getByLabelText('Latitud'), '-2.19');
  await user.type(screen.getByLabelText('Longitud'), '-79.89');
}

beforeEach(() => {
  vi.clearAllMocks();
  h.repo.listSectors.mockResolvedValue([{ id: 'norte', name: 'Norte', sort: 1 }]);
  h.repo.listSports.mockResolvedValue([
    { id: 'gimnasio', name: 'Gimnasio', icon: 'dumbbell', image_url: null, sort: 1 },
    { id: 'yoga', name: 'Yoga', icon: 'leaf', image_url: null, sort: 2 },
  ]);
  h.repo.adminListPlaces.mockResolvedValue([]);
  h.repo.adminSavePlace.mockResolvedValue({});
});

describe('AdminLugarPage', () => {
  it('horario por confirmar guarda hours null', async () => {
    const user = userEvent.setup();
    renderNuevo();
    await llenarBasicos(user);
    await user.click(screen.getByLabelText('Gimnasio'));
    await user.click(screen.getByLabelText('Horario por confirmar'));
    await user.click(screen.getByRole('button', { name: 'Guardar lugar' }));

    expect(h.repo.adminSavePlace).toHaveBeenCalledTimes(1);
    expect(h.repo.adminSavePlace).toHaveBeenCalledWith(expect.objectContaining({ name: 'Gimnasio Prueba', hours: null }));
  });

  it('copiar lunes a días hábiles', async () => {
    const user = userEvent.setup();
    renderNuevo();
    await llenarBasicos(user);
    await user.click(screen.getByLabelText('Gimnasio'));

    await user.click(screen.getByLabelText('Lunes: abierto'));
    fireEvent.change(screen.getByLabelText('Lunes: abre'), { target: { value: '07:00' } });
    await user.click(screen.getByRole('button', { name: 'Copiar lunes a días hábiles' }));

    expect(screen.getByLabelText('Martes: abierto')).toBeChecked();
    expect(screen.getByLabelText('Viernes: abre')).toHaveValue('07:00');
    expect(screen.getByLabelText('Sábado: abierto')).not.toBeChecked();

    await user.click(screen.getByRole('button', { name: 'Guardar lugar' }));
    const input = h.repo.adminSavePlace.mock.calls[0][0];
    expect(input.hours.mon).toEqual([['07:00', '18:00']]);
    expect(input.hours.fri).toEqual([['07:00', '18:00']]);
    expect(input.hours.sat).toEqual([]);
    expect(input.hours.sun).toEqual([]);
  });

  it('exige al menos un deporte', async () => {
    const user = userEvent.setup();
    renderNuevo();
    await llenarBasicos(user);
    await user.click(screen.getByLabelText('Lunes: abierto'));
    await user.click(screen.getByRole('button', { name: 'Guardar lugar' }));

    expect(await screen.findByText('Elige al menos un deporte.')).toBeInTheDocument();
    expect(h.repo.adminSavePlace).not.toHaveBeenCalled();
  });
});

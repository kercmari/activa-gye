import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { repo, type Session } from '../data';
import { useAuth } from '../auth/AuthContext';
import { todayISO } from '../components/profile/labels';
import PerfilPage from './PerfilPage';

vi.mock('../auth/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../data', () => ({
  repo: {
    listFavorites: vi.fn(),
    listSectors: vi.fn(),
    listSports: vi.fn(),
    listMyNutritionRequests: vi.fn(),
    listProgress: vi.fn(),
    addProgress: vi.fn(),
    deleteProgress: vi.fn(),
    signOut: vi.fn(),
  },
}));

const SESSION: Session = {
  user: { id: 'u1', email: 'usuario@activagye.test' },
  profile: {
    id: 'u1', full_name: 'Usuario de prueba', birth_date: '2000-05-10', sex: null, phone: null, sector_id: null,
    goal: 'bajar_peso', activity_level: null, role: 'usuario', created_at: '2026-01-01', updated_at: '2026-01-01',
  },
};

function renderAt(url: string) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/perfil" element={<PerfilPage />} />
        <Route path="/lugares" element={<p>PANTALLA LUGARES</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.mocked(useAuth).mockReturnValue({ session: SESSION, loading: false, refresh: vi.fn(async () => {}) });
  vi.mocked(repo.listSectors).mockResolvedValue([]);
  vi.mocked(repo.listSports).mockResolvedValue([]);
  vi.mocked(repo.listFavorites).mockResolvedValue([]);
  vi.mocked(repo.listMyNutritionRequests).mockResolvedValue([]);
  vi.mocked(repo.listProgress).mockResolvedValue([]);
  vi.mocked(repo.addProgress).mockReset();
});

describe('PerfilPage', () => {
  it('muestra pestaña progreso desde ?tab=progreso', async () => {
    renderAt('/perfil?tab=progreso');
    expect(screen.getByRole('tab', { name: 'Mi progreso' })).toHaveAttribute('aria-selected', 'true');
    expect(await screen.findByLabelText('Peso (kg)')).toBeInTheDocument();
  });

  it('agregar progreso llama addProgress y refresca la lista', async () => {
    const entry = {
      id: 'p1', user_id: 'u1', entry_date: todayISO(), weight_kg: 75.5, active_minutes: null,
      activity: null, note: null, created_at: '2026-11-21',
    };
    vi.mocked(repo.listProgress).mockResolvedValueOnce([]).mockResolvedValue([entry]);
    vi.mocked(repo.addProgress).mockResolvedValue(entry);
    const user = userEvent.setup();
    renderAt('/perfil?tab=progreso');
    await user.type(await screen.findByLabelText('Peso (kg)'), '75.5');
    await user.click(screen.getByRole('button', { name: 'Guardar registro' }));
    expect(repo.addProgress).toHaveBeenCalledWith(
      expect.objectContaining({ entry_date: todayISO(), weight_kg: 75.5 }),
    );
    expect(await screen.findByText(/75,5 kg/)).toBeInTheDocument();
    expect(repo.listProgress).toHaveBeenCalledTimes(2);
  });

  it('favoritos vacíos muestran Buscar lugares', async () => {
    const user = userEvent.setup();
    renderAt('/perfil');
    await user.click(screen.getByRole('tab', { name: 'Mis favoritos' }));
    expect(await screen.findByText('Aún no guardas lugares')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Buscar lugares' })).toHaveAttribute('href', '/lugares');
    expect(repo.listFavorites).toHaveBeenCalled();
  });
});

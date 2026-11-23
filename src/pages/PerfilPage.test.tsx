import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { repo, type Session } from '../data';
import { useAuth } from '../auth/AuthContext';
import { usePhase } from '../auth/SettingsContext';
import PerfilPage from './PerfilPage';

vi.mock('../auth/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../auth/SettingsContext', () => ({ usePhase: vi.fn(() => true) }));
vi.mock('../data', () => ({
  repo: {
    avatarUrl: vi.fn(async () => null),
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
  vi.mocked(repo.listProgress).mockResolvedValue([]);
  vi.mocked(repo.addProgress).mockReset();
});

describe('PerfilPage', () => {
  it('favoritos vacíos muestran Buscar lugares', async () => {
    const user = userEvent.setup();
    renderAt('/perfil');
    await user.click(screen.getByRole('tab', { name: 'Mis favoritos' }));
    expect(await screen.findByText('Aún no guardas lugares')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Buscar lugares' })).toHaveAttribute('href', '/lugares');
    expect(repo.listFavorites).toHaveBeenCalled();
  });
});

describe('PerfilPage · Mi panel', () => {
  it('tiene el enlace Abrir mi panel a /mi-panel', async () => {
    renderAt('/perfil');
    expect(await screen.findByRole('link', { name: 'Abrir mi panel' })).toHaveAttribute('href', '/mi-panel');
  });

  it('con la fase 2 apagada no muestra el enlace a Mi panel', async () => {
    vi.mocked(usePhase).mockReturnValue(false);
    renderAt('/perfil');
    expect(screen.queryByRole('link', { name: 'Abrir mi panel' })).not.toBeInTheDocument();
    vi.mocked(usePhase).mockReturnValue(true);
  });
});

function conPerfil(extra: Partial<Session['profile']>) {
  vi.mocked(useAuth).mockReturnValue({
    session: { ...SESSION, profile: { ...SESSION.profile, ...extra } },
    loading: false,
    refresh: vi.fn(async () => {}),
  });
}

describe('PerfilPage · foto', () => {
  it('muestra la foto guardada cuando hay avatar_path', async () => {
    vi.mocked(repo.avatarUrl).mockResolvedValue('https://fotos.test/u1.jpg');
    conPerfil({ avatar_path: 'u1/avatar.jpg' });
    const { container } = renderAt('/perfil');
    await vi.waitFor(() => expect(container.querySelector('img')).toHaveAttribute('src', 'https://fotos.test/u1.jpg'));
    expect(repo.avatarUrl).toHaveBeenCalledWith('u1/avatar.jpg');
    expect(screen.queryByText('Agrega tu foto para que tu perfil se vea completo.')).not.toBeInTheDocument();
  });

  it('sin foto pide agregarla con un enlace a Editar perfil', async () => {
    conPerfil({ avatar_path: null });
    renderAt('/perfil');
    expect(screen.getByText('Agrega tu foto para que tu perfil se vea completo.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Agregar foto' })).toHaveAttribute('href', '/perfil/editar');
  });
});

describe('PerfilPage · solicitud de nutricionista', () => {
  it('pendiente muestra que la solicitud está en revisión', async () => {
    conPerfil({ avatar_path: 'u1/avatar.jpg', requested_role: 'nutricionista', nutri_status: 'pendiente' });
    renderAt('/perfil');
    expect(screen.getByText('Tu solicitud de nutricionista está en revisión. El equipo la aprueba y te avisamos.')).toBeInTheDocument();
  });
});

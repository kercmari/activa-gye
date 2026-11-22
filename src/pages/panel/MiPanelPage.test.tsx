import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { repo, type Session } from '../../data';
import { useAuth } from '../../auth/AuthContext';
import { usePhase } from '../../auth/SettingsContext';
import MiPanelPage from './MiPanelPage';

vi.mock('../../auth/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../../auth/SettingsContext', () => ({ usePhase: vi.fn() }));
vi.mock('../../data', () => ({
  repo: {
    getMyIntake: vi.fn(),
    getIntakePhotoUrl: vi.fn(),
  },
}));

const SESSION: Session = {
  user: { id: 'u1', email: 'ana@activagye.test' },
  profile: {
    id: 'u1', full_name: 'Ana Pérez', birth_date: '2000-05-10', sex: 'femenino', phone: null, sector_id: null,
    goal: null, activity_level: null, role: 'usuario', created_at: '2026-01-01', updated_at: '2026-01-01',
  },
};

function renderAt(url: string) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/mi-panel" element={<MiPanelPage />} />
        <Route path="/perfil" element={<p>PANTALLA PERFIL</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.mocked(useAuth).mockReturnValue({ session: SESSION, loading: false, refresh: vi.fn(async () => {}) });
  vi.mocked(usePhase).mockReturnValue(true);
  vi.mocked(repo.getMyIntake).mockResolvedValue(null);
  vi.mocked(repo.getIntakePhotoUrl).mockResolvedValue(null);
});

describe('MiPanelPage', () => {
  it('abre la pestaña de ?tab=pagos', async () => {
    renderAt('/mi-panel?tab=pagos');

    expect(screen.getByRole('tab', { name: 'Pagos' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Mi ficha' })).toHaveAttribute('aria-selected', 'false');
    expect(await screen.findByText('En construcción.')).toBeInTheDocument();
  });

  it('con fase 2 apagada, Calendario muestra Próximamente', async () => {
    vi.mocked(usePhase).mockReturnValue(false);
    renderAt('/mi-panel?tab=calendario');

    expect(await screen.findByTestId('fase-2-bloqueada')).toBeInTheDocument();
    expect(screen.getByText('Próximamente')).toBeInTheDocument();
    expect(screen.queryByText('En construcción.')).not.toBeInTheDocument();
  });

  it('por defecto muestra Mi ficha y saluda por el primer nombre', async () => {
    renderAt('/mi-panel');

    expect(screen.getByRole('heading', { name: 'Hola, Ana' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Mi ficha' })).toHaveAttribute('aria-selected', 'true');
    expect(await screen.findByRole('button', { name: 'Guardar mi ficha' })).toBeInTheDocument();
  });

  it('cambia de pestaña con el teclado y el botón Volver regresa a /perfil', async () => {
    renderAt('/mi-panel');
    await screen.findByRole('button', { name: 'Guardar mi ficha' });

    screen.getByRole('tab', { name: 'Mi ficha' }).focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Calendario y progreso' })).toHaveAttribute('aria-selected', 'true');

    await userEvent.click(screen.getByRole('button', { name: /Volver/ }));
    expect(await screen.findByText('PANTALLA PERFIL')).toBeInTheDocument();
  });
});

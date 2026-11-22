import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { usePhase } from '../auth/SettingsContext';
import { repo } from '../data';
import NotificationBell from './NotificationBell';

vi.mock('../auth/SettingsContext', () => ({ usePhase: vi.fn() }));
vi.mock('../data', () => ({
  repo: { countUnreadNotifications: vi.fn() },
}));

function renderBell() {
  return render(
    <MemoryRouter>
      <NotificationBell />
    </MemoryRouter>,
  );
}

describe('NotificationBell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(usePhase).mockReturnValue(true);
  });

  it('muestra el número de no leídos', async () => {
    vi.mocked(repo.countUnreadNotifications).mockResolvedValue(3);
    renderBell();

    expect(await screen.findByText('3')).toBeInTheDocument();
    const link = screen.getByRole('link', { name: 'Notificaciones (3 sin leer)' });
    expect(link).toHaveAttribute('href', '/notificaciones');
  });

  it('con fase 2 apagada no se muestra', () => {
    vi.mocked(usePhase).mockReturnValue(false);
    renderBell();

    expect(screen.queryByRole('link', { name: /Notificaciones/ })).not.toBeInTheDocument();
    expect(repo.countUnreadNotifications).not.toHaveBeenCalled();
  });

  it('muestra 9+ cuando hay más de nueve sin leer', async () => {
    vi.mocked(repo.countUnreadNotifications).mockResolvedValue(12);
    renderBell();

    expect(await screen.findByText('9+')).toBeInTheDocument();
  });

  it('si la consulta falla, no muestra número y la campana sigue', async () => {
    vi.mocked(repo.countUnreadNotifications).mockRejectedValue(new Error('caído'));
    renderBell();

    await waitFor(() => expect(repo.countUnreadNotifications).toHaveBeenCalled());
    expect(screen.getByRole('link', { name: 'Notificaciones' })).toBeInTheDocument();
    expect(screen.queryByText(/^\d/)).not.toBeInTheDocument();
  });
});

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { usePhase } from '../auth/SettingsContext';
import { repo, type AppNotification } from '../data';
import NotificacionesPage from './NotificacionesPage';

vi.mock('../auth/SettingsContext', () => ({ usePhase: vi.fn() }));
vi.mock('../data', () => ({
  repo: {
    listNotifications: vi.fn(),
    markNotificationRead: vi.fn(),
    markAllNotificationsRead: vi.fn(),
  },
}));

const AHORA = new Date().toISOString();

const NOTIS: AppNotification[] = [
  {
    id: 'n1', user_id: 'u1', kind: 'solicitud_aceptada', title: 'Solicitud aceptada',
    body: 'Tu nutricionista aceptó la solicitud.', link: '/mi-panel?tab=calendario',
    read_at: null, created_at: AHORA,
  },
  {
    id: 'n2', user_id: 'u1', kind: 'factura_nueva', title: 'Nueva factura',
    body: null, link: null, read_at: AHORA, created_at: AHORA,
  },
];

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/notificaciones']}>
      <Routes>
        <Route path="/notificaciones" element={<NotificacionesPage />} />
        <Route path="/mi-panel" element={<p>Panel de prueba</p>} />
        <Route path="/perfil" element={<p>Mi perfil de prueba</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('NotificacionesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(usePhase).mockReturnValue(true);
    vi.mocked(repo.listNotifications).mockResolvedValue(NOTIS.map((n) => ({ ...n })));
    vi.mocked(repo.markNotificationRead).mockResolvedValue(undefined);
    vi.mocked(repo.markAllNotificationsRead).mockResolvedValue(undefined);
  });

  it('al pulsar una notificación la marca leída y navega a su enlace', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: /Solicitud aceptada/ }));

    expect(repo.markNotificationRead).toHaveBeenCalledWith('n1');
    expect(await screen.findByText('Panel de prueba')).toBeInTheDocument();
  });

  it('marcar todas llama markAllNotificationsRead', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Marcar todas como leídas' }));

    expect(repo.markAllNotificationsRead).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.getByText('Todo leído')).toBeInTheDocument());
  });

  it('con lista vacía muestra el mensaje y una salida', async () => {
    vi.mocked(repo.listNotifications).mockResolvedValue([]);
    renderPage();

    expect(await screen.findByText('No tienes notificaciones.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Volver al inicio' })).toBeInTheDocument();
  });

  it('con error muestra Reintentar', async () => {
    vi.mocked(repo.listNotifications).mockRejectedValueOnce(new Error('sin red'));
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent('Algo salió mal. Inténtalo de nuevo.');
    await user.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByRole('button', { name: /Solicitud aceptada/ })).toBeInTheDocument();
  });

  it('con fase 2 apagada lleva a Mi perfil y no consulta', () => {
    vi.mocked(usePhase).mockReturnValue(false);
    renderPage();

    expect(screen.getByText('Mi perfil de prueba')).toBeInTheDocument();
    expect(screen.queryByText('Próximamente')).not.toBeInTheDocument();
    expect(repo.listNotifications).not.toHaveBeenCalled();
  });
});

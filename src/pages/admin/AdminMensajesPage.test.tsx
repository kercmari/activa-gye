import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import AdminMensajesPage from './AdminMensajesPage';

const h = vi.hoisted(() => ({
  repo: {
    adminListMessages: vi.fn(),
    adminMarkMessageRead: vi.fn(),
  },
}));

vi.mock('../../data', () => ({ repo: h.repo }));
vi.mock('../../auth/AuthContext', () => ({
  useAuth: () => ({
    session: { user: { id: 'yo', email: 'yo@activagye.test' }, profile: { role: 'admin' } },
    loading: false,
    refresh: async () => {},
  }),
}));
vi.mock('../../auth/SettingsContext', () => ({
  usePhase: (n: number) => n === 1,
}));

const MENSAJE = {
  id: 'm-1',
  name: 'Ana Pérez',
  email: 'ana@correo.test',
  subject: 'Consulta de precios',
  message: 'Hola, ¿cuánto cuesta el plan?',
  read: true,
  created_at: '2026-11-20T15:00:00Z',
};

beforeEach(() => {
  vi.clearAllMocks();
  h.repo.adminListMessages.mockResolvedValue([MENSAJE]);
  h.repo.adminMarkMessageRead.mockResolvedValue(undefined);
});

describe('AdminMensajesPage', () => {
  it('«Responder por correo» abre mailto: al remitente con el asunto Re:', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <AdminMensajesPage />
      </MemoryRouter>,
    );

    await user.click(await screen.findByRole('button', { name: /Consulta de precios/ }));
    const responder = await screen.findByRole('link', { name: 'Responder por correo' });
    expect(responder).toHaveAttribute('href', 'mailto:ana@correo.test?subject=Re%3A%20Consulta%20de%20precios');
  });
});

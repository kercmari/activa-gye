import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import AdminUsuariosPage from './AdminUsuariosPage';

const h = vi.hoisted(() => ({
  repo: {
    adminListUsers: vi.fn(),
    adminSetRole: vi.fn(),
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

beforeEach(() => {
  vi.clearAllMocks();
  h.repo.adminListUsers.mockResolvedValue([
    { id: 'yo', email: 'yo@activagye.test', full_name: 'Yo', role: 'admin', created_at: '2026-11-01T10:00:00Z' },
    { id: 'otra', email: 'otra@activagye.test', full_name: 'Otra persona', role: 'usuario', created_at: '2026-11-02T10:00:00Z' },
  ]);
});

describe('AdminUsuariosPage', () => {
  it('no deja cambiar tu propio rol', async () => {
    render(
      <MemoryRouter>
        <AdminUsuariosPage />
      </MemoryRouter>,
    );

    expect(await screen.findByLabelText('Rol de yo@activagye.test')).toBeDisabled();
    expect(screen.getByText('Tú')).toBeInTheDocument();
    expect(screen.getByLabelText('Rol de otra@activagye.test')).toBeEnabled();
  });
});

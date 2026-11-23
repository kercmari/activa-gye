import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import AdminUsuariosPage from './AdminUsuariosPage';

const h = vi.hoisted(() => ({
  repo: {
    adminListUsers: vi.fn(),
    adminSetRole: vi.fn(),
    adminReviewNutri: vi.fn(),
    avatarUrl: vi.fn(async () => null),
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

const USUARIOS = [
  { id: 'yo', email: 'yo@activagye.test', full_name: 'Yo', role: 'admin', created_at: '2026-11-01T10:00:00Z' },
  { id: 'otra', email: 'otra@activagye.test', full_name: 'Otra persona', role: 'usuario', created_at: '2026-11-02T10:00:00Z' },
];

const SOLICITANTE = {
  id: 'nutri', email: 'nutri@activagye.test', full_name: 'Carla Nutri', role: 'usuario', created_at: '2026-11-03T10:00:00Z',
  requested_role: 'nutricionista', nutri_status: 'pendiente', avatar_path: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  h.repo.adminListUsers.mockResolvedValue([...USUARIOS, SOLICITANTE]);
  h.repo.adminReviewNutri.mockResolvedValue(undefined);
});

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminUsuariosPage />
    </MemoryRouter>,
  );
}

describe('AdminUsuariosPage', () => {
  it('no deja cambiar tu propio rol', async () => {
    renderPage();

    expect(await screen.findByLabelText('Rol de yo@activagye.test')).toBeDisabled();
    expect(screen.getByText('Tú')).toBeInTheDocument();
    expect(screen.getByLabelText('Rol de otra@activagye.test')).toBeEnabled();
  });

  it('muestra el bloque de solicitudes con Aprobar y Rechazar', async () => {
    renderPage();
    const bloque = await screen.findByRole('region', { name: 'Solicitudes de nutricionista' });
    expect(within(bloque).getByText('Carla Nutri')).toBeInTheDocument();
    expect(within(bloque).getByRole('button', { name: 'Aprobar' })).toBeEnabled();
    expect(within(bloque).getByRole('button', { name: 'Rechazar' })).toBeEnabled();
    expect(screen.getByText('Pendiente de revisión')).toBeInTheDocument();
  });

  it('aprobar pide confirmación, llama a adminReviewNutri y refresca la lista', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Aprobar' }));
    const dialogo = screen.getByRole('dialog');
    expect(h.repo.adminReviewNutri).not.toHaveBeenCalled();
    await user.click(within(dialogo).getByRole('button', { name: 'Sí, aprobar' }));

    expect(h.repo.adminReviewNutri).toHaveBeenCalledWith('nutri', true);
    expect(await screen.findByRole('status')).toHaveTextContent('nutri@activagye.test ya es nutricionista.');
    expect(h.repo.adminListUsers).toHaveBeenCalledTimes(2);
  });

  it('rechazar pide confirmación y llama a adminReviewNutri con false', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Rechazar' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Sí, rechazar' }));

    expect(h.repo.adminReviewNutri).toHaveBeenCalledWith('nutri', false);
    expect(await screen.findByRole('status')).toHaveTextContent('Solicitud de nutri@activagye.test rechazada.');
  });

  it('cancelar la confirmación no llama al servidor', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Aprobar' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(h.repo.adminReviewNutri).not.toHaveBeenCalled();
  });
});

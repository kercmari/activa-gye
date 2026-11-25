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

    const mio = await screen.findByRole('group', { name: 'Rol de yo@activagye.test' });
    for (const b of within(mio).getAllByRole('button')) expect(b).toBeDisabled();
    expect(screen.getByText('Tú')).toBeInTheDocument();
    const otra = screen.getByRole('group', { name: 'Rol de otra@activagye.test' });
    expect(within(otra).getByRole('button', { name: 'Usuario' })).toBeEnabled();
    expect(within(otra).getByRole('button', { name: 'Usuario' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('solo ofrece «Administrador» a correos de la lista permitida', async () => {
    h.repo.adminListUsers.mockResolvedValue([
      ...USUARIOS,
      { id: 'dani', email: 'dani@activagye.test', full_name: 'Dani', role: 'usuario', created_at: '2026-11-04T10:00:00Z', can_be_admin: true },
    ]);
    renderPage();
    const otra = await screen.findByRole('group', { name: 'Rol de otra@activagye.test' });
    expect(within(otra).queryByRole('button', { name: 'Administrador' })).not.toBeInTheDocument();
    expect(within(otra).getByRole('button', { name: 'Nutricionista' })).toBeInTheDocument();
    const dani = screen.getByRole('group', { name: 'Rol de dani@activagye.test' });
    expect(within(dani).getByRole('button', { name: 'Administrador' })).toBeEnabled();
  });

  it('elegir un rol pide confirmación y llama a adminSetRole', async () => {
    h.repo.adminSetRole.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderPage();
    const otra = await screen.findByRole('group', { name: 'Rol de otra@activagye.test' });
    await user.click(within(otra).getByRole('button', { name: 'Nutricionista' }));
    const dialogo = await screen.findByRole('dialog');
    await user.click(within(dialogo).getAllByRole('button').at(-1)!);
    expect(h.repo.adminSetRole).toHaveBeenCalledWith('otra', 'nutricionista');
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

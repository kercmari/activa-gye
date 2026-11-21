import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import AdminShell from './AdminShell';

const h = vi.hoisted(() => ({ role: 'nutricionista' as 'nutricionista' | 'admin' }));

vi.mock('../../auth/AuthContext', () => ({
  useAuth: () => ({
    session: { user: { id: 'x', email: 'x@activagye.test' }, profile: { role: h.role } },
    loading: false,
    refresh: async () => {},
  }),
}));

function renderShell() {
  return render(
    <MemoryRouter>
      <AdminShell title="Prueba">
        <p>Contenido</p>
      </AdminShell>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  h.role = 'nutricionista';
});

describe('AdminShell', () => {
  it('nutricionista no ve Lugares, Mensajes ni Usuarios', () => {
    renderShell();

    expect(screen.queryByRole('link', { name: 'Lugares' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Mensajes' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Usuarios' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Resumen' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Solicitudes' })).toBeInTheDocument();
  });

  it('admin ve todas las secciones', () => {
    h.role = 'admin';
    renderShell();

    expect(screen.getByRole('link', { name: 'Lugares' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Mensajes' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Usuarios' })).toBeInTheDocument();
  });
});

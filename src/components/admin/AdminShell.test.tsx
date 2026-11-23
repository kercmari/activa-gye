import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import AdminShell from './AdminShell';

const h = vi.hoisted(() => ({
  role: 'nutricionista' as 'nutricionista' | 'admin',
  phase2: true,
  phase3: true,
}));

vi.mock('../../auth/SettingsContext', () => ({
  usePhase: (n: number) => (n === 2 ? h.phase2 : n === 3 ? h.phase3 : true),
}));

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
  h.phase2 = true;
  h.phase3 = true;
});

describe('AdminShell', () => {
  it('nutricionista no ve Lugares, Mensajes ni Usuarios', () => {
    renderShell();

    expect(screen.queryByRole('link', { name: 'Lugares' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Mensajes' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Usuarios' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Fases' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Panel nutricionista' })).toBeInTheDocument();
  });

  it('con fases 2 y 3 apagadas no muestra Pagos, Datos de lugares ni Panel nutricionista', () => {
    h.role = 'admin';
    h.phase2 = false;
    h.phase3 = false;
    renderShell();

    expect(screen.queryByRole('link', { name: 'Pagos' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Datos de lugares' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Panel nutricionista' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Fases' })).toBeInTheDocument();
  });

  it('admin ve todas las secciones', () => {
    h.role = 'admin';
    renderShell();

    expect(screen.getByRole('link', { name: 'Lugares' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Mensajes' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Usuarios' })).toBeInTheDocument();
  });
});

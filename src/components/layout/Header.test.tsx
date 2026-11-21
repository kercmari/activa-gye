import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { useAuth } from '../../auth/AuthContext';
import { Header } from './Header';

vi.mock('../../auth/AuthContext', () => ({
  useAuth: vi.fn(),
}));

const sessionFor = (role: 'usuario' | 'nutricionista' | 'admin') => ({
  user: { id: '1', email: 'x@correo.com' },
  profile: {
    id: '1', full_name: 'Lucía Mora', birth_date: null, sex: null, phone: null, sector_id: null,
    goal: null, activity_level: null, role, created_at: '', updated_at: '',
  },
});

function renderHeader() {
  return render(
    <MemoryRouter>
      <Header />
    </MemoryRouter>,
  );
}

describe('Header', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({ session: null, loading: false, refresh: async () => {} });
  });

  it('muestra Ingresar sin sesión', () => {
    renderHeader();
    expect(screen.getByRole('link', { name: /Ingresar/ })).toHaveAttribute('href', '/ingresar');
  });

  it('muestra Panel solo a nutricionista o admin', () => {
    vi.mocked(useAuth).mockReturnValue({ session: sessionFor('usuario') as never, loading: false, refresh: async () => {} });
    const { unmount } = renderHeader();
    expect(screen.queryByText('Panel nutricionista')).not.toBeInTheDocument();
    unmount();

    vi.mocked(useAuth).mockReturnValue({ session: sessionFor('nutricionista') as never, loading: false, refresh: async () => {} });
    const second = renderHeader();
    expect(screen.getByText('Panel nutricionista')).toBeInTheDocument();
    second.unmount();
  });

  it('el menú móvil abre y cierra', async () => {
    const user = userEvent.setup();
    renderHeader();
    const boton = screen.getByRole('button', { name: 'Abrir menú' });
    expect(boton).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('navigation', { name: 'Menú móvil' })).not.toBeInTheDocument();

    await user.click(boton);
    expect(boton).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('navigation', { name: 'Menú móvil' })).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('navigation', { name: 'Menú móvil' })).not.toBeInTheDocument();
  });
});

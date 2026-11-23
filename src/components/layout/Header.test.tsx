import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { useAuth } from '../../auth/AuthContext';
import { usePhase } from '../../auth/SettingsContext';
import { Header } from './Header';

vi.mock('../../auth/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../../auth/SettingsContext', () => ({
  usePhase: vi.fn(),
}));

vi.mock('../../data', () => ({
  repo: { avatarUrl: vi.fn(async () => 'https://fotos.test/lucia.jpg'), signOut: vi.fn() },
}));

vi.mock('../NotificationBell', async () => {
  const { createElement } = await import('react');
  return { default: () => createElement('span', { 'data-testid': 'campana' }, 'campana') };
});

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
    vi.mocked(usePhase).mockReturnValue(true);
  });

  it('con fase 2 apagada no muestra Mi panel, Notificaciones ni la campana', () => {
    vi.mocked(usePhase).mockReturnValue(false);
    vi.mocked(useAuth).mockReturnValue({ session: sessionFor('admin') as never, loading: false, refresh: async () => {} });
    renderHeader();
    expect(screen.queryByText('Mi panel')).not.toBeInTheDocument();
    expect(screen.queryByText('Notificaciones')).not.toBeInTheDocument();
    expect(screen.queryByTestId('campana')).not.toBeInTheDocument();
    expect(screen.queryByText('Panel nutricionista')).not.toBeInTheDocument();
    expect(screen.queryByText('Mi plan')).not.toBeInTheDocument();
  });

  it('el usuario paciente ve Mi plan en el menú de cuenta', () => {
    vi.mocked(useAuth).mockReturnValue({ session: sessionFor('usuario') as never, loading: false, refresh: async () => {} });
    renderHeader();
    expect(screen.getByText('Mi plan')).toBeInTheDocument();
  });

  it('con fase 2 encendida muestra Mi panel, Notificaciones y la campana', () => {
    vi.mocked(useAuth).mockReturnValue({ session: sessionFor('usuario') as never, loading: false, refresh: async () => {} });
    renderHeader();
    expect(screen.getByText('Mi panel')).toBeInTheDocument();
    expect(screen.getByText('Notificaciones')).toBeInTheDocument();
    expect(screen.getByTestId('campana')).toBeInTheDocument();
  });

  it('el logo se ve completo: el texto no se corta', () => {
    renderHeader();
    const texto = screen.getByText('GYE', { exact: false }).parentElement;
    expect(texto?.className).toContain('whitespace-nowrap');
    expect(texto?.className).not.toContain('truncate');
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

  it('menú de escritorio: Inicio, Deportes, Guía, Conócenos y Contacto, sin Nutricionista ni Buscar lugares', () => {
    vi.mocked(usePhase).mockReturnValue(false);
    renderHeader();
    const nav = screen.getByRole('navigation', { name: 'Principal' });
    const enlaces = within(nav).getAllByRole('link');
    expect(enlaces.map((a) => a.textContent)).toEqual(['Inicio', 'Deportes', 'Guía', 'Conócenos', 'Contacto']);
    expect(enlaces.map((a) => a.getAttribute('href'))).toEqual(['/', '/deportes', '/guia', '/conocenos', '/contacto']);
    expect(screen.queryByText('Nutricionista')).not.toBeInTheDocument();
    expect(screen.queryByText('Buscar lugares')).not.toBeInTheDocument();
  });

  it('menú móvil: mismos enlaces que el de escritorio', async () => {
    const user = userEvent.setup();
    renderHeader();
    await user.click(screen.getByRole('button', { name: 'Abrir menú' }));
    const nav = screen.getByRole('navigation', { name: 'Menú móvil' });
    expect(within(nav).getAllByRole('link').map((a) => a.textContent)).toEqual(['Inicio', 'Deportes', 'Guía', 'Conócenos', 'Contacto']);
    expect(within(nav).queryByText('Nutricionista')).not.toBeInTheDocument();
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

describe('Header · foto de cuenta', () => {
  it('muestra la foto del perfil en el círculo de cuenta si hay avatar_path', async () => {
    const session = sessionFor('usuario') as never as { profile: Record<string, unknown> };
    session.profile.avatar_path = 'u1/avatar.jpg';
    vi.mocked(usePhase).mockReturnValue(false);
    vi.mocked(useAuth).mockReturnValue({ session: session as never, loading: false, refresh: async () => {} });
    renderHeader();
    const boton = screen.getByRole('button', { name: 'Menú de cuenta de Lucía Mora' });
    await vi.waitFor(() => expect(boton.querySelector('img')).toHaveAttribute('src', 'https://fotos.test/lucia.jpg'));
  });

  it('sin foto muestra la inicial del nombre', async () => {
    vi.mocked(usePhase).mockReturnValue(false);
    vi.mocked(useAuth).mockReturnValue({ session: sessionFor('usuario') as never, loading: false, refresh: async () => {} });
    renderHeader();
    const boton = screen.getByRole('button', { name: 'Menú de cuenta de Lucía Mora' });
    expect(boton.querySelector('img')).toBeNull();
    expect(boton).toHaveTextContent('L');
  });
});

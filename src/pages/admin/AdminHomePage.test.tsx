import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AdminHomePage from './AdminHomePage';

const h = vi.hoisted(() => ({
  settings: { phase1: true, phase2: false, phase3: false, patient_limit: 5, patients_count: 2 },
}));

vi.mock('../../auth/AuthContext', () => ({
  useAuth: () => ({
    session: { user: { id: 'yo', email: 'yo@activagye.test' }, profile: { role: 'admin' } },
    loading: false,
    refresh: async () => {},
  }),
}));
vi.mock('../../auth/SettingsContext', () => ({
  usePhase: (n: number) => (n === 1 ? true : n === 2 ? h.settings.phase2 : h.settings.phase3),
  useSettings: () => ({ settings: h.settings, loading: false, reload: async () => {} }),
}));

beforeEach(() => {
  h.settings = { phase1: true, phase2: false, phase3: false, patient_limit: 5, patients_count: 2 };
});

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminHomePage />
    </MemoryRouter>,
  );
}

describe('AdminHomePage', () => {
  it('con fase 2 y 3 apagadas muestra solo las secciones de fase 1 y el estado de las fases', () => {
    renderPage();

    expect(screen.getByRole('heading', { name: 'Administración' })).toBeInTheDocument();
    expect(screen.getByText('Fase 1 ✓ · Fase 2 ✗ · Fase 3 ✗')).toBeInTheDocument();

    const resumen = screen.getByRole('list', { name: 'Secciones de administración' });
    const visibles: Record<string, string> = {
      Fases: '/admin/fases',
      Lugares: '/admin/lugares',
      Usuarios: '/admin/usuarios',
      Mensajes: '/admin/mensajes',
    };
    for (const [nombre, ruta] of Object.entries(visibles)) {
      expect(within(resumen).getByRole('link', { name: nombre })).toHaveAttribute('href', ruta);
    }
    for (const nombre of ['Datos de lugares', 'Pagos', 'Panel nutricionista']) {
      expect(within(resumen).queryByRole('link', { name: nombre })).not.toBeInTheDocument();
    }
  });

  it('con fase 2 y 3 encendidas muestra todas las secciones', () => {
    h.settings = { phase1: true, phase2: true, phase3: true, patient_limit: 5, patients_count: 2 };
    renderPage();

    expect(screen.getByText('Fase 1 ✓ · Fase 2 ✓ · Fase 3 ✓')).toBeInTheDocument();

    const enlaces: Record<string, string> = {
      Fases: '/admin/fases',
      Lugares: '/admin/lugares',
      'Datos de lugares': '/admin/datos-lugares',
      Pagos: '/admin/pagos',
      Usuarios: '/admin/usuarios',
      Mensajes: '/admin/mensajes',
      'Panel nutricionista': '/nutri',
    };
    const resumen = screen.getByRole('list', { name: 'Secciones de administración' });
    for (const [nombre, ruta] of Object.entries(enlaces)) {
      expect(within(resumen).getByRole('link', { name: nombre })).toHaveAttribute('href', ruta);
    }
  });

  it('con solo fase 3 encendida muestra Datos de lugares y oculta Pagos y Panel nutricionista', () => {
    h.settings = { phase1: true, phase2: false, phase3: true, patient_limit: 5, patients_count: 2 };
    renderPage();

    const resumen = screen.getByRole('list', { name: 'Secciones de administración' });
    expect(within(resumen).getByRole('link', { name: 'Datos de lugares' })).toHaveAttribute('href', '/admin/datos-lugares');
    expect(within(resumen).queryByRole('link', { name: 'Pagos' })).not.toBeInTheDocument();
    expect(within(resumen).queryByRole('link', { name: 'Panel nutricionista' })).not.toBeInTheDocument();
  });
});

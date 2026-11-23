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
  it('muestra el estado de las fases y los enlaces', () => {
    renderPage();

    expect(screen.getByRole('heading', { name: 'Administración' })).toBeInTheDocument();
    expect(screen.getByText('Fase 1 ✓ · Fase 2 ✗ · Fase 3 ✗')).toBeInTheDocument();

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
});

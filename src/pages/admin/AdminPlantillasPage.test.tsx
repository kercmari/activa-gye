import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import AdminPlantillasPage from './AdminPlantillasPage';
import type { PlanTemplate } from '../../data';

const h = vi.hoisted(() => ({
  repo: {
    adminListTemplates: vi.fn(),
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

const base: PlanTemplate = {
  id: 't1',
  name: 'Plan mantenimiento',
  description: null,
  sex: 'cualquiera',
  age_min: 18,
  age_max: 65,
  bmi_min: 18.5,
  bmi_max: 25,
  goal: null,
  kcal_base: 1800,
  author_name: 'Lic. Ana Torres',
  status: 'borrador',
  is_fallback: false,
  items_count: 14,
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/admin/plantillas']}>
      <Routes>
        <Route path="/admin/plantillas" element={<AdminPlantillasPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('AdminPlantillasPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('muestra cargando y luego las plantillas con su estado', async () => {
    h.repo.adminListTemplates.mockResolvedValue([
      base,
      { ...base, id: 't2', name: 'Plan respaldo', status: 'aprobada', is_fallback: true, sex: 'femenino', goal: 'bajar_peso' },
    ]);
    renderPage();

    expect(screen.getByRole('status')).toHaveTextContent('Cargando plantillas');
    expect(await screen.findByText('Plan mantenimiento')).toBeInTheDocument();
    const cards = screen.getByRole('list', { name: 'Plantillas' });
    expect(within(cards).getByText('Borrador')).toBeInTheDocument();
    expect(within(cards).getByText('Aprobada')).toBeInTheDocument();
    expect(screen.getByText('Respaldo')).toBeInTheDocument();
    expect(screen.getByText(/Mujeres · 18–65 años · IMC 18.5–25 · Bajar de peso/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Nueva plantilla' })).toHaveAttribute('href', '/admin/plantillas/nuevo');
  });

  it('muestra un estado vacío con acción para crear', async () => {
    h.repo.adminListTemplates.mockResolvedValue([]);
    renderPage();
    expect(await screen.findByText('Todavía no hay plantillas')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Nueva plantilla' }).length).toBeGreaterThan(0);
  });

  it('filtra por estado', async () => {
    h.repo.adminListTemplates.mockResolvedValue([base, { ...base, id: 't2', name: 'Plan aprobado', status: 'aprobada' }]);
    renderPage();
    await screen.findByText('Plan mantenimiento');
    await userEvent.selectOptions(screen.getByLabelText('Estado'), 'aprobada');
    expect(screen.queryByText('Plan mantenimiento')).not.toBeInTheDocument();
    expect(screen.getByText('Plan aprobado')).toBeInTheDocument();
  });

  it('muestra error con Reintentar y vuelve a cargar', async () => {
    h.repo.adminListTemplates
      .mockRejectedValueOnce(new Error('falla'))
      .mockResolvedValueOnce([base]);
    renderPage();
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    await waitFor(() => expect(screen.getByText('Plan mantenimiento')).toBeInTheDocument());
    expect(h.repo.adminListTemplates).toHaveBeenCalledTimes(2);
  });
});

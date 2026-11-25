import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { repo, type Prescription } from '../../data';
import { MisRecetas } from './RecetasPaciente';

vi.mock('../../data', () => ({
  repo: {
    listMyPrescriptions: vi.fn(),
    listPlanDays: vi.fn(),
  },
}));

vi.mock('../../auth/AuthContext', () => ({
  useAuth: () => ({ session: { user: { id: 'pac-1', email: 'ana@ejemplo.ec' }, profile: {} }, loading: false, refresh: async () => {} }),
}));

function receta(over: Partial<Prescription> = {}): Prescription {
  return {
    id: 'rx-1',
    patient_id: 'pac-1',
    nutritionist_id: 'nut-1',
    kind: 'dieta',
    title: 'Plan de desayunos',
    body: 'Avena con fruta\nTostada integral con huevo',
    status: 'entregada',
    counts_against_patient: true,
    delivered_at: '2026-11-20T15:00:00Z',
    created_at: '2026-11-20T14:00:00Z',
    updated_at: '2026-11-20T15:00:00Z',
    ...over,
  };
}

function renderLista() {
  return render(
    <MemoryRouter>
      <MisRecetas />
    </MemoryRouter>,
  );
}

describe('MisRecetas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lista las recetas con su tipo y título, y expande el texto completo', async () => {
    vi.mocked(repo.listMyPrescriptions).mockResolvedValue([receta()]);
    renderLista();
    const user = userEvent.setup();

    expect(await screen.findByText('Plan de desayunos')).toBeInTheDocument();
    expect(screen.getByText('Dieta')).toBeInTheDocument();
    const boton = screen.getByRole('button', { name: /Ver receta/ });
    expect(boton).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText(/Tostada integral/)).toBeNull();

    await user.click(boton);

    expect(screen.getByRole('button', { name: /Ocultar/ })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText(/Tostada integral con huevo/)).toBeInTheDocument();
  });

  it('sin recetas muestra el estado vacío con salida a Hoy', async () => {
    vi.mocked(repo.listMyPrescriptions).mockResolvedValue([]);
    renderLista();

    expect(await screen.findByText('Aún no tienes recetas')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ir a Hoy' })).toBeInTheDocument();
  });

  it('si falla la carga muestra el error y Reintentar vuelve a cargar', async () => {
    vi.mocked(repo.listMyPrescriptions).mockRejectedValueOnce(new Error('sin red')).mockResolvedValueOnce([receta()]);
    renderLista();
    const user = userEvent.setup();

    expect(await screen.findByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Reintentar' }));

    await waitFor(() => expect(screen.getByText('Plan de desayunos')).toBeInTheDocument());
    expect(repo.listMyPrescriptions).toHaveBeenCalledTimes(2);
  });
});

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { repo, type PlanDay, type Prescription } from '../../data';
import { addDays, mondayOf } from '../../lib/dates';
import PlanEditor from './PlanEditor';

vi.mock('../../data', () => ({
  repo: {
    listPlanDays: vi.fn(),
    listPrescriptions: vi.fn(),
    copyPlanWeek: vi.fn(),
  },
}));

const MONDAY = mondayOf(new Date());
const SUNDAY = addDays(MONDAY, 6);

function plan(day: string, overrides: Partial<PlanDay> = {}): PlanDay {
  return {
    id: `p-${day}`,
    patient_id: 'pac1',
    prescription_id: 'rx1',
    nutritionist_id: 'nut1',
    day,
    title: 'Día de prueba',
    meals: null,
    exercise: null,
    notes: null,
    done_at: null,
    patient_note: null,
    created_at: '2026-11-01T00:00:00Z',
    updated_at: '2026-11-01T00:00:00Z',
    ...overrides,
  };
}

function receta(overrides: Partial<Prescription> = {}): Prescription {
  return {
    id: 'rx1',
    patient_id: 'pac1',
    nutritionist_id: 'nut1',
    kind: 'dieta',
    title: 'Plan semana 1',
    body: '',
    status: 'borrador',
    counts_against_patient: false,
    delivered_at: null,
    created_at: '2026-11-01T00:00:00Z',
    updated_at: '2026-11-01T00:00:00Z',
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(repo.listPrescriptions).mockResolvedValue([receta()]);
});

describe('PlanEditor', () => {
  it('muestra los días con su estado y a qué receta pertenecen', async () => {
    const lunes = MONDAY;
    const miercoles = addDays(MONDAY, 2);
    vi.mocked(repo.listPlanDays).mockResolvedValue([
      plan(lunes, { title: 'Ensalada y pollo', done_at: '2026-11-17T12:00:00Z', patient_note: 'Muy rico' }),
      plan(miercoles, { title: 'Sopa de verduras', prescription_id: null }),
    ]);

    render(<PlanEditor patientId="pac1" />);

    expect(await screen.findByText('Ensalada y pollo')).toBeInTheDocument();
    expect(screen.getByText('Receta: Plan semana 1')).toBeInTheDocument();
    expect(screen.getByText('Día anterior a las recetas')).toBeInTheDocument();
    expect(screen.getByText('Sopa de verduras')).toBeInTheDocument();
    expect(screen.getByText('✓ Cumplido')).toBeInTheDocument();
    expect(screen.getByText('Nota del paciente: Muy rico')).toBeInTheDocument();
    expect(screen.getByText('Pendiente')).toBeInTheDocument();
    expect(screen.getAllByText('Sin plan para este día.')).toHaveLength(5);
    expect(screen.getByText('1 de 7 días cumplidos esta semana')).toBeInTheDocument();
    expect(repo.listPlanDays).toHaveBeenCalledWith('pac1', MONDAY, SUNDAY);
  });

  it('el botón de día vacío lleva a Recetas', async () => {
    const user = userEvent.setup();
    const onGoToRecipes = vi.fn();
    vi.mocked(repo.listPlanDays).mockResolvedValue([]);

    render(<PlanEditor patientId="pac1" onGoToRecipes={onGoToRecipes} />);

    const agregar = await screen.findAllByRole('button', { name: 'Agregar en una receta' });
    expect(agregar).toHaveLength(7);
    await user.click(agregar[0]);
    expect(onGoToRecipes).toHaveBeenCalledTimes(1);
  });

  it('copiar semana pasa la receta borrador destino como 4.º parámetro', async () => {
    const user = userEvent.setup();
    vi.mocked(repo.listPlanDays).mockResolvedValue([]);
    vi.mocked(repo.copyPlanWeek).mockResolvedValue(3);

    render(<PlanEditor patientId="pac1" />);
    await user.click(await screen.findByRole('button', { name: 'Copiar esta semana a la siguiente' }));

    await waitFor(() => expect(repo.copyPlanWeek).toHaveBeenCalledTimes(1));
    expect(repo.copyPlanWeek).toHaveBeenCalledWith('pac1', MONDAY, addDays(MONDAY, 7), 'rx1');
    expect(await screen.findByText('Se copiaron 3 días.')).toBeInTheDocument();
    await waitFor(() =>
      expect(repo.listPlanDays).toHaveBeenLastCalledWith('pac1', addDays(MONDAY, 7), addDays(MONDAY, 13)),
    );
  });

  it('sin recetas borrador pide crear una y no copia', async () => {
    const user = userEvent.setup();
    const onGoToRecipes = vi.fn();
    vi.mocked(repo.listPrescriptions).mockResolvedValue([receta({ status: 'entregada' })]);
    vi.mocked(repo.listPlanDays).mockResolvedValue([]);

    render(<PlanEditor patientId="pac1" onGoToRecipes={onGoToRecipes} />);

    expect(await screen.findByText('Para copiar una semana, primero crea una receta borrador.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Copiar esta semana a la siguiente' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Ir a Recetas' }));
    expect(onGoToRecipes).toHaveBeenCalledTimes(1);
  });

  it('muestra error con Reintentar si falla la carga', async () => {
    const user = userEvent.setup();
    vi.mocked(repo.listPlanDays).mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce([]);

    render(<PlanEditor patientId="pac1" />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Algo salió mal');
    await user.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findAllByText('Sin plan para este día.')).toHaveLength(7);
  });
});

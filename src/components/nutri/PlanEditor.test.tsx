import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { repo, type PlanDay } from '../../data';
import { addDays, mondayOf } from '../../lib/dates';
import PlanEditor from './PlanEditor';

vi.mock('../../data', () => ({
  repo: {
    listPlanDays: vi.fn(),
    savePlanDay: vi.fn(),
    deletePlanDay: vi.fn(),
    copyPlanWeek: vi.fn(),
  },
}));

const MONDAY = mondayOf(new Date());
const SUNDAY = addDays(MONDAY, 6);

function plan(day: string, overrides: Partial<PlanDay> = {}): PlanDay {
  return {
    id: `p-${day}`,
    patient_id: 'pac1',
    prescription_id: null,
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

beforeEach(() => {
  vi.clearAllMocks();
});

describe('PlanEditor', () => {
  it('muestra los días de la semana con su estado', async () => {
    const lunes = MONDAY;
    const miercoles = addDays(MONDAY, 2);
    vi.mocked(repo.listPlanDays).mockResolvedValue([
      plan(lunes, { title: 'Ensalada y pollo', done_at: '2026-11-17T12:00:00Z', patient_note: 'Muy rico' }),
      plan(miercoles, { title: 'Sopa de verduras' }),
    ]);

    render(<PlanEditor patientId="pac1" />);

    expect(await screen.findByText('Ensalada y pollo')).toBeInTheDocument();
    expect(screen.getByText('Sopa de verduras')).toBeInTheDocument();
    expect(screen.getByText('✓ Cumplido')).toBeInTheDocument();
    expect(screen.getByText('Nota del paciente: Muy rico')).toBeInTheDocument();
    expect(screen.getByText('Pendiente')).toBeInTheDocument();
    expect(screen.getAllByText('Sin plan para este día.')).toHaveLength(5);
    expect(screen.getByText('1 de 7 días cumplidos esta semana')).toBeInTheDocument();
    expect(repo.listPlanDays).toHaveBeenCalledWith('pac1', MONDAY, SUNDAY);
  });

  it('agregar plan llama savePlanDay', async () => {
    const user = userEvent.setup();
    vi.mocked(repo.listPlanDays).mockResolvedValue([]);
    vi.mocked(repo.savePlanDay).mockResolvedValue(plan(MONDAY, { title: 'Plan nuevo' }));

    render(<PlanEditor patientId="pac1" />);

    const agregar = await screen.findAllByRole('button', { name: 'Agregar plan' });
    await user.click(agregar[0]);
    await user.type(screen.getByLabelText('Título'), 'Plan nuevo');
    await user.type(screen.getByLabelText('Comidas'), 'Avena');
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(repo.savePlanDay).toHaveBeenCalledTimes(1));
    expect(repo.savePlanDay).toHaveBeenCalledWith('pac1', {
      day: MONDAY,
      title: 'Plan nuevo',
      meals: 'Avena',
      exercise: null,
      notes: null,
      prescription_id: '', // provisional hasta UN2
    });
  });

  it('copiar semana llama copyPlanWeek con lunes y lunes+7', async () => {
    const user = userEvent.setup();
    vi.mocked(repo.listPlanDays).mockResolvedValue([]);
    vi.mocked(repo.copyPlanWeek).mockResolvedValue(3);

    render(<PlanEditor patientId="pac1" />);
    await screen.findAllByRole('button', { name: 'Agregar plan' });

    await user.click(screen.getByRole('button', { name: 'Copiar esta semana a la siguiente' }));

    await waitFor(() => expect(repo.copyPlanWeek).toHaveBeenCalledTimes(1));
    expect(repo.copyPlanWeek).toHaveBeenCalledWith('pac1', MONDAY, addDays(MONDAY, 7), ''); // provisional hasta UN2
    expect(await screen.findByText('Se copiaron 3 días.')).toBeInTheDocument();
    // Pasa a la semana siguiente: vuelve a pedir los días de ese rango.
    await waitFor(() =>
      expect(repo.listPlanDays).toHaveBeenLastCalledWith('pac1', addDays(MONDAY, 7), addDays(MONDAY, 13)),
    );
  });

  it('borrar pide confirmación y llama deletePlanDay', async () => {
    const user = userEvent.setup();
    vi.mocked(repo.listPlanDays).mockResolvedValue([plan(MONDAY, { title: 'Para borrar' })]);
    vi.mocked(repo.deletePlanDay).mockResolvedValue(undefined);

    render(<PlanEditor patientId="pac1" />);
    await screen.findByText('Para borrar');

    await user.click(screen.getByRole('button', { name: 'Borrar' }));
    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Borrar' }));

    await waitFor(() => expect(repo.deletePlanDay).toHaveBeenCalledWith('p-' + MONDAY));
  });

  it('muestra error con Reintentar si falla la carga', async () => {
    const user = userEvent.setup();
    vi.mocked(repo.listPlanDays).mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce([]);

    render(<PlanEditor patientId="pac1" />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Algo salió mal');
    await user.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findAllByRole('button', { name: 'Agregar plan' })).toHaveLength(7);
  });
});

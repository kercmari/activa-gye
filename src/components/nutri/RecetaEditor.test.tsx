import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { repo, type PlanDay, type Prescription } from '../../data';
import RecetaEditor from './RecetaEditor';

vi.mock('../../data', () => ({
  repo: {
    listPlanDays: vi.fn(),
    savePlanDay: vi.fn(),
    deletePlanDay: vi.fn(),
    savePrescription: vi.fn(),
    deletePrescription: vi.fn(),
    deliverPrescription: vi.fn(),
    getRecipeBalance: vi.fn(),
  },
}));

function receta(overrides: Partial<Prescription> = {}): Prescription {
  return {
    id: 'rx1',
    patient_id: 'pac1',
    nutritionist_id: 'nut1',
    kind: 'dieta',
    title: 'Plan de la semana',
    body: '',
    status: 'borrador',
    counts_against_patient: false,
    delivered_at: null,
    created_at: '2026-11-20T10:00:00Z',
    updated_at: '2026-11-20T10:00:00Z',
    ...overrides,
  };
}

function dia(day: string, overrides: Partial<PlanDay> = {}): PlanDay {
  return {
    id: `d-${day}`,
    patient_id: 'pac1',
    nutritionist_id: 'nut1',
    day,
    title: 'Día de prueba',
    meals: null,
    exercise: null,
    notes: null,
    done_at: null,
    patient_note: null,
    prescription_id: 'rx1',
    created_at: '2026-11-20T10:00:00Z',
    updated_at: '2026-11-20T10:00:00Z',
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(repo.listPlanDays).mockResolvedValue([]);
});

describe('RecetaEditor', () => {
  it('crea un borrador con 2 días: guarda la receta y cada día con prescription_id', async () => {
    const user = userEvent.setup();
    vi.mocked(repo.savePrescription).mockResolvedValue(receta());
    vi.mocked(repo.savePlanDay).mockResolvedValue(dia('2026-12-01'));

    render(<RecetaEditor patientId="pac1" origin="plataforma" prescription={null} onBack={() => {}} onChanged={() => {}} />);
    await waitFor(() => expect(repo.listPlanDays).toHaveBeenCalled());

    await user.type(screen.getByLabelText('Título'), 'Plan de la semana');
    fireEvent.change(screen.getByLabelText('Fecha'), { target: { value: '2026-12-01' } });
    await user.type(screen.getByLabelText('Título del día'), 'Lunes');
    await user.click(screen.getByRole('button', { name: 'Agregar día' }));

    await waitFor(() => expect(repo.savePlanDay).toHaveBeenCalledTimes(1));
    expect(repo.savePrescription).toHaveBeenCalledTimes(1);
    expect(repo.savePrescription).toHaveBeenCalledWith({
      patient_id: 'pac1',
      kind: 'dieta',
      title: 'Plan de la semana',
      body: '',
    });
    expect(repo.savePlanDay).toHaveBeenLastCalledWith(
      'pac1',
      expect.objectContaining({ day: '2026-12-01', title: 'Lunes', prescription_id: 'rx1' }),
    );

    fireEvent.change(screen.getByLabelText('Fecha'), { target: { value: '2026-12-02' } });
    await user.type(screen.getByLabelText('Título del día'), 'Martes');
    await user.click(screen.getByRole('button', { name: 'Agregar día' }));

    await waitFor(() => expect(repo.savePlanDay).toHaveBeenCalledTimes(2));
    expect(repo.savePlanDay).toHaveBeenLastCalledWith(
      'pac1',
      expect.objectContaining({ day: '2026-12-02', prescription_id: 'rx1' }),
    );
    expect(repo.savePrescription).toHaveBeenCalledTimes(1);
  });

  it('avisa si el día ya está ocupado y no lo guarda', async () => {
    const user = userEvent.setup();
    vi.mocked(repo.listPlanDays).mockResolvedValue([dia('2026-12-01', { prescription_id: 'otra' })]);

    render(<RecetaEditor patientId="pac1" origin="plataforma" prescription={receta()} onBack={() => {}} onChanged={() => {}} />);
    await waitFor(() => expect(repo.listPlanDays).toHaveBeenCalled());

    fireEvent.change(screen.getByLabelText('Fecha'), { target: { value: '2026-12-01' } });
    await user.type(screen.getByLabelText('Título del día'), 'Lunes');
    await user.click(screen.getByRole('button', { name: 'Agregar día' }));

    expect(await screen.findByText('Ese día ya tiene una receta. Elige un día libre.')).toBeInTheDocument();
    expect(repo.savePlanDay).not.toHaveBeenCalled();
  });

  it('entregar muestra el saldo en la confirmación y llama deliverPrescription', async () => {
    const user = userEvent.setup();
    vi.mocked(repo.savePrescription).mockResolvedValue(receta());
    vi.mocked(repo.getRecipeBalance).mockResolvedValue({ left: 7, quota: 10, period_end: '2026-12-20' });
    vi.mocked(repo.deliverPrescription).mockResolvedValue(receta({ status: 'entregada', counts_against_patient: true, delivered_at: '2026-11-24T10:00:00Z' }));

    render(<RecetaEditor patientId="pac1" origin="plataforma" prescription={receta()} onBack={() => {}} onChanged={() => {}} />);

    await user.click(screen.getByRole('button', { name: 'Entregar' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/le quedarán 6/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Entregar receta' }));

    await waitFor(() => expect(repo.deliverPrescription).toHaveBeenCalledWith('rx1'));
    expect(await screen.findByText('Receta entregada. Sus días ya aparecen en el calendario del paciente.')).toBeInTheDocument();
  });

  it('sin recetas disponibles muestra el texto de SIN_RECETAS y no entrega', async () => {
    const user = userEvent.setup();
    vi.mocked(repo.getRecipeBalance).mockResolvedValue({ left: 0, quota: 10, period_end: '2026-12-20' });

    render(<RecetaEditor patientId="pac1" origin="plataforma" prescription={receta()} onBack={() => {}} onChanged={() => {}} />);

    await user.click(screen.getByRole('button', { name: 'Entregar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Este paciente ya usó sus 10 recetas del mes.');
    expect(repo.deliverPrescription).not.toHaveBeenCalled();
  });

  it('una receta entregada no tiene botones de editar', async () => {
    const entregada = receta({ status: 'entregada', counts_against_patient: true, delivered_at: '2026-11-24T10:00:00Z' });
    vi.mocked(repo.listPlanDays).mockResolvedValue([dia('2026-12-01')]);

    render(<RecetaEditor patientId="pac1" origin="plataforma" prescription={entregada} onBack={() => {}} onChanged={() => {}} />);

    expect(await screen.findByText(/Día de prueba/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Guardar borrador' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Entregar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Quitar día' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Agregar día' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Título')).toBeDisabled();
  });

  it('paciente propio: la confirmación dice que no descuenta recetas', async () => {
    const user = userEvent.setup();
    vi.mocked(repo.savePrescription).mockResolvedValue(receta());
    vi.mocked(repo.deliverPrescription).mockResolvedValue(receta({ status: 'entregada' }));

    render(<RecetaEditor patientId="pac1" origin="propio" prescription={receta()} onBack={() => {}} onChanged={() => {}} />);

    await user.click(screen.getByRole('button', { name: 'Entregar' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/no descuenta recetas/)).toBeInTheDocument();
    expect(repo.getRecipeBalance).not.toHaveBeenCalled();
  });

  it('muestra error con Reintentar si fallan los días', async () => {
    const user = userEvent.setup();
    vi.mocked(repo.listPlanDays).mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce([]);

    render(<RecetaEditor patientId="pac1" origin="plataforma" prescription={receta()} onBack={() => {}} onChanged={() => {}} />);

    expect(await screen.findByText('Algo salió mal. Inténtalo de nuevo.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('Esta receta aún no tiene días.')).toBeInTheDocument();
  });
});

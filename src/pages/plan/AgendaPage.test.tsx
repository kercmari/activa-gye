import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PlanDay, Session, Trial, TrialDay } from '../../data';
import AgendaPage from './AgendaPage';

const mocks = vi.hoisted(() => ({
  getMyTrial: vi.fn(),
  setTrialItemDone: vi.fn(),
  getMyPatientSubscription: vi.fn(),
  listPlanDays: vi.fn(),
  phase2: { on: true },
}));

vi.mock('../../data', () => ({
  repo: {
    getMyTrial: mocks.getMyTrial,
    setTrialItemDone: mocks.setTrialItemDone,
    getMyPatientSubscription: mocks.getMyPatientSubscription,
    listPlanDays: mocks.listPlanDays,
  },
}));

const SESSION = { user: { id: 'pac-1', email: 'paciente@ejemplo.ec' }, profile: {} } as unknown as Session;

vi.mock('../../auth/AuthContext', () => ({
  useAuth: () => ({ session: SESSION, loading: false, refresh: async () => {} }),
}));

vi.mock('../../auth/SettingsContext', () => ({
  usePhase: (n: number) => (n === 2 ? mocks.phase2.on : true),
}));

function day(n: number, over: Partial<TrialDay> = {}): TrialDay {
  const open = n === 1;
  return {
    day_number: n,
    unlocked: open,
    unlocked_on: open ? '2026-11-21' : null,
    completed_at: null,
    items_total: 2,
    items_done: 0,
    items: open
      ? [
          { id: 'i1', at_time: '08:00', kind: 'comida', title: 'Avena con fruta', detail: 'Sin azúcar añadida', done: false },
          { id: 'i2', at_time: '13:00', kind: 'rutina', title: 'Caminata de 20 minutos', detail: null, done: false },
        ]
      : [],
    ...over,
  };
}

function trial(over: Partial<Trial> = {}): Trial {
  return {
    template_name: 'Plan de muestra',
    template_status: 'borrador',
    author_name: 'Pendiente de revisión',
    kcal_target: 1800,
    portion_factor: 1,
    started_on: '2026-11-21',
    today: '2026-11-21',
    current_day: 1,
    finished: false,
    days: [1, 2, 3, 4, 5, 6, 7].map((n) => day(n)),
    ...over,
  };
}

function renderAgenda() {
  return render(
    <MemoryRouter>
      <AgendaPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mocks.phase2.on = true;
  mocks.getMyTrial.mockReset().mockResolvedValue(trial());
  mocks.setTrialItemDone.mockReset();
  mocks.getMyPatientSubscription.mockReset().mockResolvedValue(null);
  mocks.listPlanDays.mockReset().mockResolvedValue([]);
});

describe('AgendaPage', () => {
  it('muestra noviembre de 2026 con la primera fila de octubre atenuada', async () => {
    renderAgenda();
    expect(await screen.findByRole('heading', { name: 'Noviembre 2026' })).toBeInTheDocument();
    const primero = screen.getByRole('button', { name: '26 de octubre de 2026' });
    expect(primero).toHaveAttribute('data-outside', 'true');
    expect(screen.getByRole('button', { name: '1 de noviembre de 2026' })).not.toHaveAttribute('data-outside');
  });

  it('un día abierto muestra sus actividades con la hora', async () => {
    renderAgenda();
    expect(await screen.findByText('Avena con fruta')).toBeInTheDocument();
    expect(screen.getByText('Caminata de 20 minutos')).toBeInTheDocument();
    expect(screen.getByText('08:00')).toBeInTheDocument();
    expect(screen.getByText('Sábado, 21 de noviembre de 2026')).toBeInTheDocument();
  });

  it('un día cerrado muestra el candado y ningún ítem', async () => {
    renderAgenda();
    await screen.findByText('Avena con fruta');
    fireEvent.click(screen.getByRole('button', { name: '22 de noviembre de 2026' }));
    expect(screen.getByText('Este día se abre cuando completes el anterior')).toBeInTheDocument();
    expect(screen.queryByText('Avena con fruta')).not.toBeInTheDocument();
  });

  it('el día 8 sin suscripción muestra el muro con enlace a suscripción', async () => {
    renderAgenda();
    await screen.findByText('Avena con fruta');
    fireEvent.click(screen.getByRole('button', { name: '28 de noviembre de 2026' }));
    expect(await screen.findByText(/Suscríbete para que una nutricionista siga tu plan/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Suscribirme' })).toHaveAttribute('href', '/mi-plan/suscripcion');
  });

  it('con fase 2 apagada el muro dice «Próximamente»', async () => {
    mocks.phase2.on = false;
    renderAgenda();
    await screen.findByText('Avena con fruta');
    fireEvent.click(screen.getByRole('button', { name: '28 de noviembre de 2026' }));
    expect(await screen.findByText('Próximamente.')).toBeInTheDocument();
    expect(mocks.getMyPatientSubscription).not.toHaveBeenCalled();
  });

  it('con suscripción activa muestra el plan del día desde listPlanDays', async () => {
    mocks.getMyPatientSubscription.mockResolvedValue({ id: 's1', plan_id: 'p', plan_name: 'Seguimiento mensual', monthly_price: 15, status: 'activa', current_period_end: null, created_at: '2026-11-21' });
    const plan: PlanDay = {
      id: 'd8', patient_id: 'pac-1', nutritionist_id: 'nut-1', day: '2026-11-28', title: 'Semana 2: fuerza',
      meals: 'Ensalada de quinoa', exercise: 'Sentadillas 3x10', notes: null, done_at: null, patient_note: null,
      created_at: '2026-11-21', updated_at: '2026-11-21',
    };
    mocks.listPlanDays.mockResolvedValue([plan]);
    renderAgenda();
    await screen.findByText('Avena con fruta');
    fireEvent.click(screen.getByRole('button', { name: '28 de noviembre de 2026' }));
    expect(await screen.findByText('Semana 2: fuerza')).toBeInTheDocument();
    expect(screen.getByText('Ensalada de quinoa')).toBeInTheDocument();
    expect(mocks.listPlanDays).toHaveBeenCalledWith('pac-1', '2026-11-01', '2026-11-30');
  });

  it('«Volver a hoy» selecciona hoy', async () => {
    renderAgenda();
    await screen.findByText('Avena con fruta');
    fireEvent.click(screen.getByRole('button', { name: '23 de noviembre de 2026' }));
    expect(screen.getByRole('heading', { name: 'Lunes, 23 de noviembre de 2026' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Volver a hoy' }));
    expect(screen.getByRole('heading', { name: 'Sábado, 21 de noviembre de 2026' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '21 de noviembre de 2026' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('marcar un ítem desde la agenda llama a la base', async () => {
    mocks.setTrialItemDone.mockResolvedValue(trial({ days: [1, 2, 3, 4, 5, 6, 7].map((n) => (n === 1 ? day(1, { items: [{ id: 'i1', at_time: '08:00', kind: 'comida', title: 'Avena con fruta', detail: 'Sin azúcar añadida', done: true }, { id: 'i2', at_time: '13:00', kind: 'rutina', title: 'Caminata de 20 minutos', detail: null, done: false }], items_done: 1 }) : day(n))) }));
    renderAgenda();
    fireEvent.click(await screen.findByRole('button', { name: 'Marcar: Avena con fruta' }));
    await waitFor(() => expect(mocks.setTrialItemDone).toHaveBeenCalledWith('i1', true));
    expect(await screen.findByRole('button', { name: 'Desmarcar: Avena con fruta' })).toBeInTheDocument();
  });

  it('muestra error con «Reintentar» si no carga la semana', async () => {
    mocks.getMyTrial.mockRejectedValueOnce(new Error('sin red')).mockResolvedValueOnce(trial());
    renderAgenda();
    fireEvent.click(await screen.findByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('Avena con fruta')).toBeInTheDocument();
  });
});

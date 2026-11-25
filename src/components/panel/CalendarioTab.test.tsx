import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { repo } from '../../data';
import type { PlanDay, Session } from '../../data/types';
import { useAuth } from '../../auth/AuthContext';
import CalendarioTab from './CalendarioTab';

vi.mock('../../auth/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../../data', () => ({
  repo: {
    listPlanDays: vi.fn(),
    setPlanDayDone: vi.fn(),
  },
}));
vi.mock('../profile/ProgressTab', () => ({ default: () => 'Registro de peso (stub)' }));

const SESSION: Session = {
  user: { id: 'u1', email: 'ana@activagye.test' },
  profile: {
    id: 'u1', full_name: 'Ana Pérez', birth_date: '2000-05-10', sex: 'femenino', phone: null, sector_id: null,
    goal: null, activity_level: null, role: 'usuario', created_at: '2026-01-01', updated_at: '2026-01-01',
  },
};

/** Hoy fijado en 15 de noviembre de 2026 (hora local). */
const TODAY = new Date(2026, 10, 15, 12, 0, 0);

function plan(id: string, day: string, doneAt: string | null = null): PlanDay {
  return {
    id, patient_id: 'u1', nutritionist_id: 'n1', day, title: `Plan ${id}`,
    meals: 'Avena con fruta', exercise: 'Caminata de 30 min', notes: null,
    done_at: doneAt, patient_note: null, prescription_id: null, created_at: '2026-11-01', updated_at: '2026-11-01',
  };
}

function renderTab() {
  return render(
    <MemoryRouter>
      <CalendarioTab />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(TODAY);
  vi.mocked(useAuth).mockReturnValue({ session: SESSION, loading: false, refresh: vi.fn(async () => {}) });
  vi.mocked(repo.setPlanDayDone).mockReset();
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe('CalendarioTab', () => {
  it('muestra días cumplidos y pendientes del mes', async () => {
    vi.mocked(repo.listPlanDays).mockResolvedValue([
      plan('p3', '2026-11-03', '2026-11-03T20:00:00Z'),
      plan('p10', '2026-11-10'),
    ]);
    renderTab();

    expect(await screen.findByRole('button', { name: /3 de noviembre.*, cumplido$/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /10 de noviembre.*, pendiente$/ })).toBeInTheDocument();
    expect(repo.listPlanDays).toHaveBeenCalledWith('u1', '2026-11-01', '2026-11-30');
  });

  it('marcar cumplido llama setPlanDayDone', async () => {
    vi.mocked(repo.listPlanDays).mockResolvedValue([plan('p10', '2026-11-10')]);
    vi.mocked(repo.setPlanDayDone).mockResolvedValue({ ...plan('p10', '2026-11-10'), done_at: '2026-11-15T12:00:00Z' });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderTab();

    await user.click(await screen.findByRole('button', { name: /10 de noviembre/ }));
    await user.click(screen.getByRole('checkbox', { name: /Cumplí este día/ }));
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(repo.setPlanDayDone).toHaveBeenCalledWith('p10', true, null));
    expect(await screen.findByRole('status')).toHaveTextContent('Guardado.');
  });

  it('un día futuro no se puede marcar', async () => {
    vi.mocked(repo.listPlanDays).mockResolvedValue([plan('p20', '2026-11-20')]);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderTab();

    await user.click(await screen.findByRole('button', { name: /20 de noviembre/ }));
    const detail = screen.getByRole('region', { name: 'Plan p20' });
    expect(within(detail).getByRole('checkbox', { name: /Cumplí este día/ })).toBeDisabled();
    expect(within(detail).getByText('Podrás marcarlo ese día.')).toBeInTheDocument();
    expect(repo.setPlanDayDone).not.toHaveBeenCalled();
  });

  it('calcula el porcentaje del mes', async () => {
    vi.mocked(repo.listPlanDays).mockResolvedValue([
      plan('a', '2026-11-02', '2026-11-02T10:00:00Z'),
      plan('b', '2026-11-05', '2026-11-05T10:00:00Z'),
      plan('c', '2026-11-08'),
      plan('d', '2026-11-12'),
    ]);
    renderTab();

    expect(await screen.findByText('Cumpliste 2 de 4 días este mes')).toBeInTheDocument();
    expect(screen.getByText('50% completado')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Días cumplidos este mes' })).toHaveAttribute('aria-valuenow', '50');
  });
});

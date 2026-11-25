import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { repo, type NutriDashboard, type Session } from '../../data';
import { useAuth } from '../../auth/AuthContext';
import { usePhase } from '../../auth/SettingsContext';
import TableroPage from './TableroPage';

vi.mock('../../auth/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../../auth/SettingsContext', () => ({ usePhase: vi.fn() }));
vi.mock('../../data', () => ({
  repo: { getNutriDashboard: vi.fn() },
}));

const SESSION: Session = {
  user: { id: 'n1', email: 'nutri@vitgo.test' },
  profile: {
    id: 'n1', full_name: 'Nutri Prueba', birth_date: null, sex: null, phone: null, sector_id: null,
    goal: null, activity_level: null, role: 'nutricionista', created_at: '2026-01-01', updated_at: '2026-01-01',
  },
};

function dashboard(over: Partial<NutriDashboard> = {}): NutriDashboard {
  return {
    open_requests: 3,
    my_patients: 2,
    week_days_total: 7,
    week_days_done: 4,
    pending_invoices: 0,
    subscription: { id: 's1', nutritionist_id: 'n1', plan_id: 'p1', status: 'activa', current_period_end: '2027-01-01T00:00:00Z', created_at: '2026-11-01T00:00:00Z' },
    limits: { plan_name: 'Starter', patient_quota: 15, daily_record_limit: 60, patients_used: 2, records_today: 4 },
    recipes_week: 5,
    ...over,
  };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <TableroPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(usePhase).mockReturnValue(true);
  vi.mocked(useAuth).mockReturnValue({ session: SESSION } as unknown as ReturnType<typeof useAuth>);
});

describe('TableroPage', () => {
  it('muestra los límites del plan: pacientes x de N y registros de hoy x de N', async () => {
    vi.mocked(repo.getNutriDashboard).mockResolvedValue(dashboard());
    renderPage();
    expect(await screen.findByText('2 de 15')).toBeInTheDocument();
    expect(screen.getByText('4 de 60')).toBeInTheDocument();
    expect(screen.getByText('Plan Starter')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Mejorar plan' })).toHaveAttribute('href', '/nutri/suscripcion');
  });

  it('muestra «sin límite» cuando daily_record_limit es null', async () => {
    vi.mocked(repo.getNutriDashboard).mockResolvedValue(
      dashboard({ limits: { plan_name: 'Profesional', patient_quota: 50, daily_record_limit: null, patients_used: 2, records_today: 7 } }),
    );
    renderPage();
    expect(await screen.findByText('7 · sin límite')).toBeInTheDocument();
  });

  it('sin suscripción muestra el plan gratis con salida a Mejorar plan', async () => {
    vi.mocked(repo.getNutriDashboard).mockResolvedValue(
      dashboard({ my_patients: 1, subscription: null, limits: { plan_name: null, patient_quota: 3, daily_record_limit: 10, patients_used: 1, records_today: 0 } }),
    );
    renderPage();
    expect(await screen.findByText('Plan gratis')).toBeInTheDocument();
    expect(screen.getByText('1 de 3')).toBeInTheDocument();
  });

  it('muestra cargando y luego error con Reintentar', async () => {
    vi.mocked(repo.getNutriDashboard).mockRejectedValueOnce(new Error('caída'));
    vi.mocked(repo.getNutriDashboard).mockResolvedValueOnce(dashboard());
    renderPage();
    expect(screen.getByRole('status')).toBeInTheDocument();
    const retry = await screen.findByRole('button', { name: 'Reintentar' });
    await userEvent.click(retry);
    await waitFor(() => expect(screen.getByText('2 de 15')).toBeInTheDocument());
  });
});

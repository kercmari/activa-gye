import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { repo, type NutriDashboard, type PatientSummary, type Session, type Subscription } from '../../data';
import { useAuth } from '../../auth/AuthContext';
import { usePhase } from '../../auth/SettingsContext';
import TableroPage from './TableroPage';

vi.mock('../../auth/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../../auth/SettingsContext', () => ({ usePhase: vi.fn() }));
vi.mock('../../data', () => ({
  repo: {
    getNutriDashboard: vi.fn(),
    listMyPatients: vi.fn(),
  },
}));

const SESSION: Session = {
  user: { id: 'n1', email: 'nutri@activagye.test' },
  profile: {
    id: 'n1', full_name: 'Nutri Prueba', birth_date: null, sex: null, phone: null, sector_id: null,
    goal: null, activity_level: null, role: 'nutricionista', created_at: '2026-01-01', updated_at: '2026-01-01',
  },
};

const ACTIVA: Subscription = {
  id: 's1', nutritionist_id: 'n1', plan_id: 'p1', status: 'activa', current_period_end: '2027-01-01T00:00:00Z', created_at: '2026-11-01T00:00:00Z',
};

const DASHBOARD: NutriDashboard = {
  open_requests: 3,
  my_patients: 2,
  week_days_total: 7,
  week_days_done: 4,
  pending_invoices: 1,
  subscription: ACTIVA,
};

const PACIENTE: PatientSummary = {
  patient_id: 'u1',
  full_name: 'Ana Pérez',
  age: 34,
  sex: 'femenino',
  request_id: 'r1',
  accepted_at: '2026-11-10T00:00:00Z',
  days_total: 7,
  days_done: 5,
  last_followup_date: null,
};

function renderPage() {
  return render(
    <MemoryRouter>
      <TableroPage />
    </MemoryRouter>,
  );
}

/** Tarjeta de estadística que contiene la etiqueta dada. */
function card(label: string) {
  return screen.getByText(label, { selector: '.eyebrow' }).parentElement as HTMLElement;
}

beforeEach(() => {
  vi.mocked(useAuth).mockReturnValue({ session: SESSION, loading: false, refresh: vi.fn(async () => {}) });
  vi.mocked(usePhase).mockReturnValue(true);
  vi.mocked(repo.getNutriDashboard).mockResolvedValue(DASHBOARD);
  vi.mocked(repo.listMyPatients).mockResolvedValue([PACIENTE]);
});

describe('TableroPage', () => {
  it('muestra las tarjetas con los números del tablero', async () => {
    renderPage();

    expect(await screen.findByText('Ana Pérez')).toBeInTheDocument();
    expect(within(card('Solicitudes abiertas')).getByText('3')).toBeInTheDocument();
    expect(within(card('Mis pacientes')).getByText('2')).toBeInTheDocument();
    expect(within(card('Días cumplidos esta semana')).getByText('4/7')).toBeInTheDocument();
    expect(within(card('Días cumplidos esta semana')).getByText('57% de los días programados')).toBeInTheDocument();
    expect(within(card('Facturas por cobrar')).getByText('1')).toBeInTheDocument();
    expect(screen.getByText('34 años · 5 de 7 días cumplidos')).toBeInTheDocument();
    expect(screen.getByText('Sin seguimiento')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver paciente' })).toHaveAttribute('href', '/nutri/pacientes/u1');
  });

  it('nutricionista sin suscripción ve Elegir plan', async () => {
    vi.mocked(repo.getNutriDashboard).mockResolvedValue({ ...DASHBOARD, subscription: null });
    renderPage();

    expect(await screen.findByText('Necesitas una suscripción activa para aceptar pacientes.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Elegir plan' })).toHaveAttribute('href', '/nutri/suscripcion');
  });

  it('con fase 2 apagada muestra Próximamente', () => {
    vi.mocked(usePhase).mockReturnValue(false);
    renderPage();

    expect(screen.getByText('Próximamente')).toBeInTheDocument();
    expect(repo.getNutriDashboard).not.toHaveBeenCalled();
  });
});

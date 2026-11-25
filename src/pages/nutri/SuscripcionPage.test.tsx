import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { repo, type Session, type SubscriptionPlan } from '../../data';
import { useAuth } from '../../auth/AuthContext';
import { usePhase, useSettings } from '../../auth/SettingsContext';
import * as mailto from '../../lib/mailto';
import SuscripcionPage from './SuscripcionPage';

vi.mock('../../auth/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../../auth/SettingsContext', () => ({ usePhase: vi.fn(), useSettings: vi.fn() }));
vi.mock('../../lib/mailto', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/mailto')>();
  return { ...actual, subscriptionMailto: vi.fn(() => 'mailto:admin@vitgo.test') };
});
vi.mock('../../data', () => ({
  repo: {
    getMySubscription: vi.fn(),
    listPlans: vi.fn(),
    choosePlan: vi.fn(),
  },
}));

const SESSION: Session = {
  user: { id: 'n1', email: 'nutri@vitgo.test' },
  profile: {
    id: 'n1', full_name: 'Nutri Prueba', birth_date: null, sex: null, phone: null, sector_id: null,
    goal: null, activity_level: null, role: 'nutricionista', created_at: '2026-01-01', updated_at: '2026-01-01',
  },
};

const PLANES: SubscriptionPlan[] = [
  { id: 'p1', name: 'Starter', monthly_price: 9, patient_quota: 15, active: true, sort: 1, daily_record_limit: 60, recipe_quota: null, features: ['Agenda de pacientes'] },
  { id: 'p2', name: 'Profesional', monthly_price: 19, patient_quota: 50, active: true, sort: 2, daily_record_limit: null, recipe_quota: null, features: ['Sin límite diario'] },
];

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(usePhase).mockReturnValue(true);
  vi.mocked(useAuth).mockReturnValue({ session: SESSION } as unknown as ReturnType<typeof useAuth>);
  vi.mocked(useSettings).mockReturnValue({
    settings: {
      phase1: true, phase2: true, phase3: false, patient_limit: 5, patients_count: 0,
      admin_email: 'admin@vitgo.test', free_patient_limit: 3, free_daily_record_limit: 10,
    },
    loading: false,
    reload: async () => {},
  });
  vi.mocked(repo.getMySubscription).mockResolvedValue(null);
  vi.mocked(repo.listPlans).mockResolvedValue(PLANES);
});

function renderPage() {
  return render(
    <MemoryRouter>
      <SuscripcionPage />
    </MemoryRouter>,
  );
}

describe('SuscripcionPage (Mi plan)', () => {
  it('muestra tres tarjetas: Gratis y los planes con sus precios del repo', async () => {
    renderPage();
    expect(await screen.findByRole('heading', { name: 'Gratis' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Starter' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Profesional' })).toBeInTheDocument();
    expect(screen.getByText('$9')).toBeInTheDocument();
    expect(screen.getByText('$19')).toBeInTheDocument();
    expect(screen.getByText('Hasta 3 pacientes')).toBeInTheDocument();
    expect(screen.getByText('Sin límite de registros por día')).toBeInTheDocument();
    expect(screen.getByText('Tu plan actual')).toBeInTheDocument();
  });

  it('no muestra datos bancarios ni la palabra transferencia antes de pedir un plan', async () => {
    renderPage();
    await screen.findByRole('heading', { name: 'Starter' });
    expect(screen.queryByText(/transferencia/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/cuenta/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/comprobante/i)).not.toBeInTheDocument();
  });

  it('el botón registra la solicitud y abre el correo con el correo de la administradora', async () => {
    vi.mocked(repo.choosePlan).mockResolvedValue({} as never);
    renderPage();
    await screen.findByRole('heading', { name: 'Starter' });
    await userEvent.click(screen.getAllByRole('button', { name: 'Solicitar este plan' })[0]);
    expect(repo.choosePlan).toHaveBeenCalledWith('p1');
    expect(await screen.findByText(/Tu solicitud quedó registrada/)).toBeInTheDocument();
    expect(mailto.subscriptionMailto).toHaveBeenCalledWith('admin@vitgo.test', {
      plan: 'Starter', price: 9, fullName: 'Nutri Prueba', email: 'nutri@vitgo.test',
    });
  });

  it('si el registro falla, igual abre el correo y muestra el error', async () => {
    vi.mocked(repo.choosePlan).mockRejectedValue(new Error('caída'));
    renderPage();
    await screen.findByRole('heading', { name: 'Profesional' });
    await userEvent.click(screen.getAllByRole('button', { name: 'Solicitar este plan' })[1]);
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos registrar tu solicitud');
    await waitFor(() => expect(mailto.subscriptionMailto).toHaveBeenCalledTimes(1));
  });

  it('muestra error con Reintentar si no carga', async () => {
    vi.mocked(repo.listPlans).mockRejectedValueOnce(new Error('caída'));
    renderPage();
    expect(await screen.findByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
  });
});

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { repo, type Invoice, type Session, type Subscription, type SubscriptionPlan } from '../../data';
import { useAuth } from '../../auth/AuthContext';
import { usePhase } from '../../auth/SettingsContext';
import SuscripcionPage from './SuscripcionPage';

vi.mock('../../auth/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../../auth/SettingsContext', () => ({ usePhase: vi.fn() }));
vi.mock('../../data', () => ({
  repo: {
    getMySubscription: vi.fn(),
    listPlans: vi.fn(),
    listMyInvoices: vi.fn(),
    choosePlan: vi.fn(),
    reportInvoicePaid: vi.fn(),
  },
}));

const SESSION: Session = {
  user: { id: 'n1', email: 'nutri@activagye.test' },
  profile: {
    id: 'n1', full_name: 'Nutri Prueba', birth_date: null, sex: null, phone: null, sector_id: null,
    goal: null, activity_level: null, role: 'nutricionista', created_at: '2026-01-01', updated_at: '2026-01-01',
  },
};

const PLANES: SubscriptionPlan[] = [
  { id: 'p1', name: 'Inicial', monthly_price: 20, patient_quota: 10, active: true, sort: 1, daily_record_limit: null, recipe_quota: null, features: [] },
  { id: 'p2', name: 'Pro', monthly_price: 45.5, patient_quota: 30, active: true, sort: 2, daily_record_limit: null, recipe_quota: null, features: [] },
];

const FACTURA_PENDIENTE: Invoice = {
  id: 'f1',
  payer_id: 'n1',
  payee_id: null,
  kind: 'suscripcion',
  subscription_id: 's1',
  concept: 'Plan Inicial — noviembre',
  amount: 20,
  status: 'pendiente',
  payment_reference: null,
  reported_at: null,
  paid_at: null,
  created_at: '2026-11-01T00:00:00Z',
};

const ACTIVA: Subscription = {
  id: 's1', nutritionist_id: 'n1', plan_id: 'p1', status: 'activa', current_period_end: '2027-01-01T00:00:00Z', created_at: '2026-11-01T00:00:00Z',
};

function renderPage() {
  return render(
    <MemoryRouter>
      <SuscripcionPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(usePhase).mockReturnValue(true);
  vi.mocked(useAuth).mockReturnValue({ session: SESSION, loading: false, refresh: vi.fn() } as ReturnType<typeof useAuth>);
  vi.mocked(repo.getMySubscription).mockResolvedValue(null);
  vi.mocked(repo.listPlans).mockResolvedValue(PLANES);
  vi.mocked(repo.listMyInvoices).mockResolvedValue([]);
});

describe('SuscripcionPage', () => {
  it('elegir plan llama choosePlan', async () => {
    const user = userEvent.setup();
    vi.mocked(repo.choosePlan).mockResolvedValue({ ...FACTURA_PENDIENTE, concept: 'Plan Pro — noviembre', amount: 45.5 });
    renderPage();

    const botones = await screen.findAllByRole('button', { name: 'Elegir este plan' });
    await user.click(botones[1]);

    await waitFor(() => expect(repo.choosePlan).toHaveBeenCalledWith('p2'));
    expect(await screen.findByText(/Factura creada: Plan Pro — noviembre por \$45,50/)).toBeInTheDocument();
  });

  it('informar pago valida el comprobante y llama reportInvoicePaid', async () => {
    const user = userEvent.setup();
    vi.mocked(repo.listMyInvoices).mockResolvedValue([FACTURA_PENDIENTE]);
    vi.mocked(repo.reportInvoicePaid).mockResolvedValue(undefined);
    renderPage();

    const campo = await screen.findByLabelText('Número de comprobante');
    await user.type(campo, '12');
    await user.click(screen.getByRole('button', { name: 'Informar pago' }));

    expect(await screen.findByText('El número de comprobante debe tener entre 4 y 100 caracteres.')).toBeInTheDocument();
    expect(repo.reportInvoicePaid).not.toHaveBeenCalled();

    await user.clear(campo);
    await user.type(campo, 'TRX-0001234');
    await user.click(screen.getByRole('button', { name: 'Informar pago' }));

    await waitFor(() => expect(repo.reportInvoicePaid).toHaveBeenCalledWith('f1', 'TRX-0001234'));
  });

  it('con suscripción activa los botones están deshabilitados', async () => {
    vi.mocked(repo.getMySubscription).mockResolvedValue(ACTIVA);
    renderPage();

    const botones = await screen.findAllByRole('button', { name: 'Ya tienes una suscripción activa' });
    expect(botones).toHaveLength(PLANES.length);
    botones.forEach((b) => expect(b).toBeDisabled());
  });
});

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { repo, type Invoice, type PatientSubscription, type Session, type SubscriptionPlan, type Trial } from '../../data';
import { useAuth } from '../../auth/AuthContext';
import { usePhase } from '../../auth/SettingsContext';
import { formatDateTimeLong } from '../../components/profile/labels';
import SuscribirmePage from './SuscribirmePage';

vi.mock('../../auth/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../../auth/SettingsContext', () => ({ usePhase: vi.fn() }));
vi.mock('../../data', () => ({
  repo: {
    getMyPatientSubscription: vi.fn(),
    listPatientPlans: vi.fn(),
    getMyTrial: vi.fn(),
    listMyInvoices: vi.fn(),
    choosePatientPlan: vi.fn(),
    reportInvoicePaid: vi.fn(),
  },
}));

const SESSION: Session = {
  user: { id: 'u1', email: 'ana@activagye.test' },
  profile: {
    id: 'u1', full_name: 'Ana Pérez', birth_date: '2000-05-10', sex: 'femenino', phone: null, sector_id: null,
    goal: null, activity_level: null, role: 'usuario', created_at: '2026-01-01', updated_at: '2026-01-01',
  },
};

const PLAN: SubscriptionPlan = { id: 'p1', name: 'Seguimiento mensual', monthly_price: 15, patient_quota: 10, active: true, sort: 1 };

const FACTURA: Invoice = {
  id: 'inv1', payer_id: 'u1', payee_id: null, kind: 'suscripcion_paciente', subscription_id: 's1',
  concept: 'Suscripción Seguimiento mensual', amount: 15, status: 'pendiente', payment_reference: null,
  reported_at: null, paid_at: null, created_at: '2026-11-21T10:00:00Z',
};

function trialDe(completados: number): Trial {
  return {
    template_name: 'Plantilla', template_status: 'aprobada', author_name: 'Nutri', kcal_target: 1800, portion_factor: 1,
    started_on: '2026-11-14', today: '2026-11-21', current_day: null, finished: completados === 7,
    days: Array.from({ length: 7 }, (_, i) => ({
      day_number: i + 1, unlocked: true, unlocked_on: '2026-11-14', completed_at: i < completados ? '2026-11-20' : null,
      items_total: 4, items_done: 4, items: [],
    })),
  };
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/mi-plan/suscripcion']}>
      <Routes>
        <Route path="/mi-plan/suscripcion" element={<SuscribirmePage />} />
        <Route path="/mi-plan/hoy" element={<p>PANTALLA HOY</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(useAuth).mockReturnValue({ session: SESSION, loading: false, refresh: vi.fn(async () => {}) });
  vi.mocked(usePhase).mockReturnValue(true);
  vi.mocked(repo.getMyPatientSubscription).mockResolvedValue(null);
  vi.mocked(repo.listPatientPlans).mockResolvedValue([PLAN]);
  vi.mocked(repo.getMyTrial).mockResolvedValue(trialDe(7));
  vi.mocked(repo.listMyInvoices).mockResolvedValue([]);
});

describe('SuscribirmePage', () => {
  it('sin suscripción lista los planes y «Suscribirme» llama a choosePatientPlan', async () => {
    const user = userEvent.setup();
    vi.mocked(repo.choosePatientPlan).mockResolvedValue(FACTURA);
    renderPage();

    expect(await screen.findByText('Seguimiento mensual')).toBeInTheDocument();
    expect(screen.getByText('Una nutricionista toma tu caso')).toBeInTheDocument();
    expect(screen.getByText('Agenda personalizada cada semana')).toBeInTheDocument();
    expect(screen.getByText('Seguimiento y chequeos')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Suscribirme' }));

    await waitFor(() => expect(repo.choosePatientPlan).toHaveBeenCalledWith('p1'));
    expect(await screen.findByText(/Te enviaremos los datos de la cuenta por correo/)).toBeInTheDocument();
    expect(screen.getByText('Suscripción Seguimiento mensual')).toBeInTheDocument();
  });

  it('muestra el error de choosePatientPlan si falla', async () => {
    const user = userEvent.setup();
    vi.mocked(repo.choosePatientPlan).mockRejectedValue(Object.assign(new Error('Ya tienes una suscripción en curso.'), { name: 'AppError', code: 'YA_TIENES_SUSCRIPCION' }));
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Suscribirme' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Ya tienes una suscripción en curso.');
  });

  it('pendiente: muestra la factura y reportar el comprobante llama a reportInvoicePaid', async () => {
    const user = userEvent.setup();
    vi.mocked(repo.getMyPatientSubscription).mockResolvedValue({
      id: 's1', plan_id: 'p1', plan_name: 'Seguimiento mensual', monthly_price: 15, status: 'pendiente',
      current_period_end: null, created_at: '2026-11-21',
    } satisfies PatientSubscription);
    vi.mocked(repo.listMyInvoices).mockResolvedValue([FACTURA]);
    vi.mocked(repo.reportInvoicePaid).mockResolvedValue(undefined);
    renderPage();

    expect(await screen.findByText('Suscripción Seguimiento mensual')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Número de comprobante'), 'TRX123456');
    await user.click(screen.getByRole('button', { name: 'Informar pago' }));

    await waitFor(() => expect(repo.reportInvoicePaid).toHaveBeenCalledWith('inv1', 'TRX123456'));
    expect(await screen.findByText(/Comprobante informado/)).toBeInTheDocument();
  });

  it('activa: muestra hasta cuándo y no ofrece planes', async () => {
    vi.mocked(repo.getMyPatientSubscription).mockResolvedValue({
      id: 's1', plan_id: 'p1', plan_name: 'Seguimiento mensual', monthly_price: 15, status: 'activa',
      current_period_end: '2026-12-21', created_at: '2026-11-21',
    });
    renderPage();

    expect(await screen.findByText(/activa hasta el 21 de diciembre de 2026/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Suscribirme' })).not.toBeInTheDocument();
  });

  it('activa con fecha fin con hora: muestra la fecha legible, nunca «Invalid Date»', async () => {
    vi.mocked(repo.getMyPatientSubscription).mockResolvedValue({
      id: 's1', plan_id: 'p1', plan_name: 'Seguimiento mensual', monthly_price: 15, status: 'activa',
      current_period_end: '2099-12-21T15:00:00+00:00', created_at: '2026-11-21',
    });
    renderPage();

    expect(await screen.findByText('Tu suscripción está activa hasta el 21 de diciembre de 2099.')).toBeInTheDocument();
    expect(screen.queryByText(/Invalid Date/)).not.toBeInTheDocument();
  });

  it('vencida: muestra el aviso y «Suscribirme» llama a choosePatientPlan', async () => {
    const user = userEvent.setup();
    vi.mocked(repo.getMyPatientSubscription).mockResolvedValue({
      id: 's1', plan_id: 'p1', plan_name: 'Seguimiento mensual', monthly_price: 15, status: 'vencida',
      current_period_end: '2020-10-21T15:00:00+00:00', created_at: '2026-09-21',
    });
    vi.mocked(repo.choosePatientPlan).mockResolvedValue(FACTURA);
    renderPage();

    expect(await screen.findByText('Tu suscripción venció el 21 de octubre de 2020.')).toBeInTheDocument();
    expect(screen.queryByText(/activa hasta/)).not.toBeInTheDocument();
    await user.click(await screen.findByRole('button', { name: 'Suscribirme' }));

    await waitFor(() => expect(repo.choosePatientPlan).toHaveBeenCalledWith('p1'));
    expect(await screen.findByText(/Te enviaremos los datos de la cuenta por correo/)).toBeInTheDocument();
  });

  it('activa con fecha pasada se trata como vencida', async () => {
    vi.mocked(repo.getMyPatientSubscription).mockResolvedValue({
      id: 's1', plan_id: 'p1', plan_name: 'Seguimiento mensual', monthly_price: 15, status: 'activa',
      current_period_end: '2020-10-21T15:00:00+00:00', created_at: '2026-09-21',
    });
    renderPage();

    expect(await screen.findByText('Tu suscripción venció el 21 de octubre de 2020.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Suscribirme' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Ver mi agenda' })).not.toBeInTheDocument();
  });

  it('formatDateTimeLong convierte un timestamp completo y rechaza texto inválido', () => {
    expect(formatDateTimeLong('2026-12-21T15:00:00+00:00')).toBe('21 de diciembre de 2026');
    expect(formatDateTimeLong('no es fecha')).toBe('');
  });

  it('fase 2 apagada: muestra Próximamente y no carga datos', async () => {
    vi.mocked(usePhase).mockReturnValue(false);
    renderPage();

    expect(await screen.findByTestId('fase-2-bloqueada')).toBeInTheDocument();
    expect(screen.getByText('Próximamente')).toBeInTheDocument();
    expect(repo.listPatientPlans).not.toHaveBeenCalled();
  });

  it('error al cargar muestra Reintentar y vuelve a cargar', async () => {
    const user = userEvent.setup();
    vi.mocked(repo.listPatientPlans).mockRejectedValueOnce(new Error('caída'));
    renderPage();

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('Seguimiento mensual')).toBeInTheDocument();
  });

  it('«Volver a Hoy» lleva a /mi-plan/hoy', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('link', { name: 'Volver a Hoy' }));
    expect(await screen.findByText('PANTALLA HOY')).toBeInTheDocument();
  });
});

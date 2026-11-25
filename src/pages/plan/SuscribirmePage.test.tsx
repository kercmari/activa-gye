import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { repo, type PatientSubscription, type RecipeBalance, type Session, type SubscriptionPlan } from '../../data';
import SuscribirmePage from './SuscribirmePage';

vi.mock('../../auth/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../../auth/SettingsContext', () => ({
  usePhase: vi.fn(() => true),
  useSettings: vi.fn(),
}));
vi.mock('../../data', () => ({
  repo: {
    getMyPatientSubscription: vi.fn(),
    listPatientPlans: vi.fn(),
    getRecipeBalance: vi.fn(),
    choosePatientPlan: vi.fn(),
  },
}));

import { useAuth } from '../../auth/AuthContext';
import { useSettings, usePhase } from '../../auth/SettingsContext';

const SESSION: Session = {
  user: { id: 'pac-1', email: 'ana@ejemplo.ec' },
  profile: {
    id: 'pac-1', full_name: 'Ana Pérez', birth_date: '2000-05-10', sex: 'femenino', phone: null, sector_id: null,
    goal: null, activity_level: null, role: 'usuario', created_at: '2026-01-01', updated_at: '2026-01-01',
  },
} as unknown as Session;

const PLAN: SubscriptionPlan = {
  id: 'plan-seg',
  name: 'Seguimiento mensual',
  audience: 'paciente',
  monthly_price: 40,
  patient_quota: 1,
  daily_record_limit: null,
  recipe_quota: 10,
  features: ['Calendario con días de tus recetas', 'Tu nutricionista te entrega cada receta'],
  active: true,
} as unknown as SubscriptionPlan;

const ACTIVA: PatientSubscription = {
  id: 'sub-1',
  plan_name: 'Seguimiento mensual',
  status: 'activa',
  current_period_end: '2099-01-15T00:00:00Z',
} as unknown as PatientSubscription;

function renderPage() {
  return render(
    <MemoryRouter>
      <SuscribirmePage />
    </MemoryRouter>,
  );
}

const originalLocation = window.location;

describe('SuscribirmePage (suscripción por correo y saldo de recetas)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({ session: SESSION, loading: false, refresh: async () => {} } as never);
    vi.mocked(usePhase).mockReturnValue(true);
    vi.mocked(useSettings).mockReturnValue({
      settings: { phase2: true, admin_email: 'admin@vitgo.test' },
      loading: false,
      reload: async () => {},
    } as never);
    // jsdom no navega: se reemplaza location para comprobar el href del mailto.
    Object.defineProperty(window, 'location', { configurable: true, value: { ...originalLocation, href: '' } });
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', { configurable: true, value: originalLocation });
  });

  it('sin suscripción muestra el plan y el botón de correo', async () => {
    vi.mocked(repo.getMyPatientSubscription).mockResolvedValue(null);
    vi.mocked(repo.listPatientPlans).mockResolvedValue([PLAN]);
    renderPage();

    expect(await screen.findByText('Seguimiento mensual')).toBeInTheDocument();
    expect(screen.getByText('$40 al mes')).toBeInTheDocument();
    expect(screen.getByText('10 recetas de tu nutricionista')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Contactar por correo para solicitar una suscripción' })).toBeInTheDocument();
    // Nunca datos bancarios ni formulario de transferencia.
    expect(screen.queryByText(/transferencia/i)).toBeNull();
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('el botón registra la solicitud, abre el mailto y muestra el aviso', async () => {
    vi.mocked(repo.getMyPatientSubscription).mockResolvedValue(null);
    vi.mocked(repo.listPatientPlans).mockResolvedValue([PLAN]);
    vi.mocked(repo.choosePatientPlan).mockResolvedValue({} as never);
    renderPage();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Contactar por correo para solicitar una suscripción' }));

    await waitFor(() => expect(repo.choosePatientPlan).toHaveBeenCalledWith('plan-seg'));
    expect(await screen.findByText(/Tu solicitud quedó registrada/)).toBeInTheDocument();
    const href = window.location.href;
    expect(href.startsWith('mailto:admin%40vitgo.test?')).toBe(true);
    expect(decodeURIComponent(href)).toContain('subject=Solicitud de suscripción Seguimiento mensual');
    expect(decodeURIComponent(href)).toContain('Nombre: Ana Pérez');
  });

  it('si la solicitud falla, el correo se abre igual y se muestra el error', async () => {
    vi.mocked(repo.getMyPatientSubscription).mockResolvedValue(null);
    vi.mocked(repo.listPatientPlans).mockResolvedValue([PLAN]);
    const fallo = new Error('Sin conexión');
    fallo.name = 'AppError';
    vi.mocked(repo.choosePatientPlan).mockRejectedValue(fallo);
    renderPage();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Contactar por correo para solicitar una suscripción' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Sin conexión');
    expect(window.location.href.startsWith('mailto:')).toBe(true);
  });

  it('con la fase 2 apagada solo muestra el candado con salida, sin cabecera ni datos', () => {
    vi.mocked(usePhase).mockReturnValue(false);
    renderPage();

    expect(screen.getByTestId('fase-2-bloqueada')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Volver a mi plan' })).toHaveAttribute('href', '/mi-plan');
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Volver a la agenda' })).not.toBeInTheDocument();
    expect(repo.getMyPatientSubscription).not.toHaveBeenCalled();
  });

  it('activa muestra el saldo «Te quedan 7 de 10» y deja el botón para renovar', async () => {
    vi.mocked(repo.getMyPatientSubscription).mockResolvedValue(ACTIVA);
    vi.mocked(repo.listPatientPlans).mockResolvedValue([PLAN]);
    const saldo: RecipeBalance = { left: 7, quota: 10, period_end: '2099-01-15T00:00:00Z' };
    vi.mocked(repo.getRecipeBalance).mockResolvedValue(saldo);
    renderPage();

    expect(await screen.findByText(/Te quedan 7 de 10 recetas/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Contactar por correo para solicitar una suscripción' })).toBeInTheDocument();
  });

  it('error al cargar muestra Reintentar y vuelve a cargar', async () => {
    vi.mocked(repo.getMyPatientSubscription).mockRejectedValueOnce(new Error('Falla de red'));
    vi.mocked(repo.getMyPatientSubscription).mockResolvedValueOnce(null);
    vi.mocked(repo.listPatientPlans).mockResolvedValue([PLAN]);
    renderPage();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByText('Seguimiento mensual')).toBeInTheDocument();
  });

  it('muestra un aviso de carga mientras llegan los datos', () => {
    vi.mocked(repo.getMyPatientSubscription).mockReturnValue(new Promise(() => {}));
    vi.mocked(repo.listPatientPlans).mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getByRole('status')).toHaveTextContent('Cargando tu suscripción');
  });
});

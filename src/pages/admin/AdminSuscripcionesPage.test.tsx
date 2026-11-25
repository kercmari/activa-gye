import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import AdminSuscripcionesPage from './AdminSuscripcionesPage';

/** Error con nombre AppError: errorMessage muestra su texto (el resto muestra un mensaje genérico). */
function appError(message: string): Error {
  const e = new Error(message);
  e.name = 'AppError';
  return e;
}

const h = vi.hoisted(() => ({
  repo: {
    adminSubscriptionsOverview: vi.fn(),
    markInvoicePaid: vi.fn(),
    cancelInvoice: vi.fn(),
  },
}));

vi.mock('../../data', () => ({ repo: h.repo }));
vi.mock('../../auth/AuthContext', () => ({
  useAuth: () => ({
    session: { user: { id: 'yo', email: 'yo@activagye.test' }, profile: { role: 'admin' } },
    loading: false,
    refresh: async () => {},
  }),
}));
vi.mock('../../auth/SettingsContext', () => ({
  usePhase: (n: number) => n === 1,
  useSettings: () => ({
    settings: { phase1: true, phase2: false, phase3: false, patient_limit: 5, patients_count: 2 },
    loading: false,
    reload: async () => {},
  }),
}));

const PENDIENTE = {
  invoice_id: 'f-1',
  subscription_id: 's-1',
  audience: 'nutricionista' as const,
  user_id: 'u-1',
  full_name: 'Ana Pérez',
  email: 'ana@correo.test',
  plan_name: 'Starter',
  amount: 9,
  status: 'pendiente' as const,
  created_at: '2026-11-20T15:00:00Z',
  period_end: null,
  recipes_left: null,
};

const ACTIVA = {
  invoice_id: 'f-2',
  subscription_id: 's-2',
  audience: 'paciente' as const,
  user_id: 'u-2',
  full_name: 'Luis Soto',
  email: 'luis@correo.test',
  plan_name: 'Seguimiento mensual',
  amount: 40,
  status: 'activa' as const,
  created_at: '2026-11-01T15:00:00Z',
  period_end: '2026-12-15T00:00:00Z',
  recipes_left: 7,
};

beforeEach(() => {
  vi.clearAllMocks();
  h.repo.adminSubscriptionsOverview.mockResolvedValue({ pending: [PENDIENTE], active: [ACTIVA] });
  h.repo.markInvoicePaid.mockResolvedValue(undefined);
  h.repo.cancelInvoice.mockResolvedValue(undefined);
});

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminSuscripcionesPage />
    </MemoryRouter>,
  );
}

describe('AdminSuscripcionesPage', () => {
  it('muestra cargando y luego las solicitudes pendientes y las activas', async () => {
    renderPage();
    expect(screen.getByRole('status')).toHaveTextContent('Cargando suscripciones');

    expect(await screen.findByRole('heading', { name: 'Solicitudes pendientes' })).toBeInTheDocument();
    expect(screen.getByText('Ana Pérez')).toBeInTheDocument();
    expect(screen.getByText('Luis Soto')).toBeInTheDocument();
    expect(screen.getByText(/Recetas restantes: 7/)).toBeInTheDocument();
  });

  it('«Escribir» abre el correo del usuario con mailto:', async () => {
    renderPage();
    const enlace = await screen.findByRole('link', { name: 'Escribir' });
    expect(enlace.getAttribute('href')).toMatch(/^mailto:ana%40correo\.test\?subject=/);
    expect(enlace.getAttribute('href')).toContain(encodeURIComponent('Tu suscripción VITGO'));
  });

  it('Aprobar pide confirmación y llama markInvoicePaid con la factura', async () => {
    const user = userEvent.setup();
    renderPage();
    const pendientes = await screen.findByRole('heading', { name: 'Solicitudes pendientes' });
    const tarjeta = pendientes.parentElement as HTMLElement;

    await user.click(within(tarjeta).getByRole('button', { name: 'Aprobar' }));
    const dialogo = screen.getByRole('dialog');
    expect(within(dialogo).getByText('¿Aprobar esta suscripción?')).toBeInTheDocument();
    expect(h.repo.markInvoicePaid).not.toHaveBeenCalled();

    await user.click(within(dialogo).getByRole('button', { name: 'Sí, aprobar' }));
    await waitFor(() => expect(h.repo.markInvoicePaid).toHaveBeenCalledWith('f-1'));
    expect(await screen.findByRole('status')).toHaveTextContent('aprobada');
  });

  it('Rechazar llama cancelInvoice tras confirmar', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Ana Pérez');

    await user.click(screen.getByRole('button', { name: 'Rechazar' }));
    await user.click(screen.getByRole('button', { name: 'Sí, rechazar' }));
    await waitFor(() => expect(h.repo.cancelInvoice).toHaveBeenCalledWith('f-1'));
    expect(h.repo.markInvoicePaid).not.toHaveBeenCalled();
  });

  it('sin solicitudes ni activas muestra los estados vacíos', async () => {
    h.repo.adminSubscriptionsOverview.mockResolvedValue({ pending: [], active: [] });
    renderPage();

    expect(await screen.findByText('No hay solicitudes pendientes')).toBeInTheDocument();
    expect(screen.getByText('No hay suscripciones activas')).toBeInTheDocument();
  });

  it('si falla la carga muestra el error y «Reintentar» vuelve a cargar', async () => {
    const user = userEvent.setup();
    // La carga falla hasta que se pulsa «Reintentar» (el contador del menú también la llama).
    h.repo.adminSubscriptionsOverview.mockRejectedValue(appError('Sin conexión'));
    renderPage();

    expect(await screen.findByText('Sin conexión')).toBeInTheDocument();
    h.repo.adminSubscriptionsOverview.mockResolvedValue({ pending: [PENDIENTE], active: [ACTIVA] });
    await user.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('Ana Pérez')).toBeInTheDocument();
  });

  it('si aprobar falla, muestra el error y no cierra como éxito', async () => {
    const user = userEvent.setup();
    h.repo.markInvoicePaid.mockRejectedValueOnce(appError('Factura ya pagada'));
    renderPage();
    await screen.findByText('Ana Pérez');

    await user.click(screen.getByRole('button', { name: 'Aprobar' }));
    await user.click(screen.getByRole('button', { name: 'Sí, aprobar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Factura ya pagada');
  });
});

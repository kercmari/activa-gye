import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import AdminPagosPage from './AdminPagosPage';

const h = vi.hoisted(() => ({
  repo: {
    adminListInvoices: vi.fn(),
    markInvoicePaid: vi.fn(),
    cancelInvoice: vi.fn(),
    adminListSubscriptions: vi.fn(),
    listPlans: vi.fn(),
    adminSavePlan: vi.fn(),
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
  useSettings: () => ({
    settings: { phase1: true, phase2: true, phase3: false, patient_limit: 5, patients_count: 2 },
    loading: false,
    reload: async () => {},
  }),
  usePhase: () => true,
}));

const FACTURA = {
  id: 'f1',
  payer_id: 'u1',
  payee_id: null,
  kind: 'suscripcion',
  subscription_id: 's1',
  concept: 'Suscripción Plan Básico',
  amount: 25,
  status: 'pendiente',
  payment_reference: null,
  reported_at: null,
  paid_at: null,
  created_at: '2026-11-01T10:00:00Z',
  payer_name: 'Ana Nutri',
  payee_name: null,
};

const PLAN = {
  id: 'p1',
  name: 'Plan Básico',
  monthly_price: 25,
  patient_quota: 10,
  active: true,
  sort: 1,
};

beforeEach(() => {
  vi.clearAllMocks();
  h.repo.adminListInvoices.mockResolvedValue([FACTURA]);
  h.repo.markInvoicePaid.mockResolvedValue(undefined);
  h.repo.cancelInvoice.mockResolvedValue(undefined);
  h.repo.adminListSubscriptions.mockResolvedValue([]);
  h.repo.listPlans.mockResolvedValue([PLAN]);
  h.repo.adminSavePlan.mockImplementation(async (input: object) => ({ ...PLAN, ...input }));
});

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminPagosPage />
    </MemoryRouter>,
  );
}

describe('AdminPagosPage', () => {
  it('marcar pagada llama markInvoicePaid', async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Suscripción Plan Básico');
    await user.click(screen.getByRole('button', { name: 'Marcar pagada' }));

    await waitFor(() => expect(h.repo.markInvoicePaid).toHaveBeenCalledWith('f1'));
  });

  it('anular pide confirmación y llama cancelInvoice', async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Suscripción Plan Básico');
    await user.click(screen.getByRole('button', { name: 'Anular' }));

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(/Suscripción Plan Básico/)).toBeInTheDocument();
    expect(h.repo.cancelInvoice).not.toHaveBeenCalled();

    await user.click(within(dialog).getByRole('button', { name: 'Anular factura' }));

    await waitFor(() => expect(h.repo.cancelInvoice).toHaveBeenCalledWith('f1'));
  });

  it('editar plan llama adminSavePlan', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('tab', { name: 'Planes' }));
    await user.click(await screen.findByRole('button', { name: 'Editar' }));

    const nombre = screen.getByLabelText('Nombre');
    await user.clear(nombre);
    await user.type(nombre, 'Plan Pro');
    await user.click(screen.getByRole('button', { name: 'Guardar plan' }));

    await waitFor(() =>
      expect(h.repo.adminSavePlan).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'p1', name: 'Plan Pro', monthly_price: 25, patient_quota: 10, active: true, sort: 1 }),
      ),
    );
  });
});

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { repo } from '../../data';
import type { Invoice, Session } from '../../data/types';
import { useAuth } from '../../auth/AuthContext';
import PagosTab from './PagosTab';

vi.mock('../../auth/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../../data', () => ({
  repo: {
    listMyInvoices: vi.fn(),
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

function invoice(id: string, amount: number, status: Invoice['status'], overrides: Partial<Invoice> = {}): Invoice {
  return {
    id, payer_id: 'u1', payee_id: 'n1', kind: 'consulta', subscription_id: null,
    concept: `Consulta ${id}`, amount, status, payment_reference: null, reported_at: null, paid_at: null,
    created_at: '2026-11-10T15:00:00Z', payee_name: 'Lic. Rosa Mena', ...overrides,
  };
}

function renderTab() {
  return render(
    <MemoryRouter>
      <PagosTab />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.mocked(useAuth).mockReturnValue({ session: SESSION, loading: false, refresh: vi.fn(async () => {}) });
  vi.mocked(repo.reportInvoicePaid).mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('PagosTab', () => {
  it('suma lo pendiente', async () => {
    vi.mocked(repo.listMyInvoices).mockResolvedValue([
      invoice('i1', 12.5, 'pendiente'),
      invoice('i2', 7.25, 'pendiente'),
      invoice('i3', 30, 'reportada', { payment_reference: 'REF-1' }),
      invoice('i4', 100, 'pagada'),
      invoice('i5', 999, 'pendiente', { payer_id: 'otro' }),
    ]);
    renderTab();

    expect(await screen.findByText('Pendiente por pagar: $19,75')).toBeInTheDocument();
    expect(screen.getByText('En revisión')).toBeInTheDocument();
    expect(screen.getByText('Pagada')).toBeInTheDocument();
    expect(screen.getAllByText('Pendiente')).toHaveLength(2);
  });

  it('informar pago valida y llama reportInvoicePaid', async () => {
    const user = userEvent.setup();
    vi.mocked(repo.listMyInvoices).mockResolvedValue([invoice('i1', 12.5, 'pendiente')]);
    vi.mocked(repo.reportInvoicePaid).mockResolvedValue(undefined);
    renderTab();

    const input = await screen.findByLabelText('Número de comprobante');
    await user.type(input, 'abc');
    await user.click(screen.getByRole('button', { name: 'Informar pago' }));
    expect(await screen.findByText('El número de comprobante debe tener entre 4 y 100 caracteres.')).toBeInTheDocument();
    expect(repo.reportInvoicePaid).not.toHaveBeenCalled();

    await user.clear(input);
    await user.type(input, '  REF-12345  ');
    await user.click(screen.getByRole('button', { name: 'Informar pago' }));

    await waitFor(() => expect(repo.reportInvoicePaid).toHaveBeenCalledWith('i1', 'REF-12345'));
    expect(await screen.findByText('En revisión')).toBeInTheDocument();
    expect(screen.getByText('REF-12345')).toBeInTheDocument();
  });

  it('vacío muestra No tienes cobros', async () => {
    vi.mocked(repo.listMyInvoices).mockResolvedValue([]);
    renderTab();

    expect(await screen.findByText('No tienes cobros.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver mi nutricionista' })).toBeInTheDocument();
  });
});

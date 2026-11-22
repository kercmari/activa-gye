import { useState, type FormEvent } from 'react';
import { repo } from '../../data';
import type { Invoice, InvoiceStatus } from '../../data/types';
import { useAuth } from '../../auth/AuthContext';
import { formatDateLong } from '../profile/labels';
import { useAsync } from '../profile/useAsync';
import Badge, { type BadgeTone } from '../ui/Badge';
import { Button } from '../ui/Button';
import { TextField } from '../ui/Field';
import { EmptyState, ErrorState, Loading, errorMessage } from '../ui/States';

const STATUS: Record<InvoiceStatus, { label: string; tone: BadgeTone }> = {
  pendiente: { label: 'Pendiente', tone: 'orange' },
  reportada: { label: 'En revisión', tone: 'blue' },
  pagada: { label: 'Pagada', tone: 'green' },
  anulada: { label: 'Anulada', tone: 'slate' },
};

const REF_MIN = 4;
const REF_MAX = 100;

/** Monto en dólares con coma decimal y punto de miles: 12.5 → "$12,50", 1234 → "$1.234,00". */
function formatMoney(amount: number): string {
  const [entero, decimales] = amount.toFixed(2).split('.');
  return `$${entero.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${decimales}`;
}

/** Pestaña "Pagos": cobros del paciente y envío del número de comprobante. */
export default function PagosTab() {
  const { session } = useAuth();
  if (!session) return null;
  return <PagosContent userId={session.user.id} />;
}

function PagosContent({ userId }: { userId: string }) {
  const state = useAsync(() => repo.listMyInvoices(), [userId]);
  // Facturas informadas en esta sesión; así la lista se actualiza sin recargar.
  const [overrides, setOverrides] = useState<Record<string, Invoice>>({});

  if (state.status === 'loading') return <Loading />;
  if (state.status === 'error') return <ErrorState message={state.message} onRetry={state.reload} />;

  const invoices = state.data
    .filter((inv) => inv.payer_id === userId)
    .map((inv) => overrides[inv.id] ?? inv);

  if (invoices.length === 0) {
    return (
      <EmptyState
        title="Pagos"
        text="No tienes cobros."
        action={{ to: '/mi-panel?tab=nutricionista', label: 'Ver mi nutricionista' }}
      />
    );
  }

  const pendiente = invoices
    .filter((inv) => inv.status === 'pendiente')
    .reduce((total, inv) => total + inv.amount, 0);

  const onReported = (inv: Invoice) => setOverrides((prev) => ({ ...prev, [inv.id]: inv }));

  return (
    <section className="space-y-6">
      <div className="rounded-[1.75rem] bg-white p-6 shadow-xl shadow-navy-900/5">
        <p className="text-lg font-extrabold text-navy-900">{`Pendiente por pagar: ${formatMoney(pendiente)}`}</p>
        <p className="mt-2 text-sm text-slate-600">
          Paga por transferencia a tu nutricionista y escribe aquí el número de comprobante. Él confirmará el pago.
        </p>
      </div>

      <ul className="space-y-4">
        {invoices.map((inv) => (
          <InvoiceRow key={inv.id} invoice={inv} onReported={onReported} />
        ))}
      </ul>
    </section>
  );
}

function InvoiceRow({ invoice, onReported }: { invoice: Invoice; onReported: (inv: Invoice) => void }) {
  const badge = STATUS[invoice.status];
  const payee = invoice.payee_name ?? (invoice.payee_id ? 'Tu nutricionista' : 'Activa GYE');

  return (
    <li className="rounded-[1.75rem] bg-white p-6 shadow-xl shadow-navy-900/5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="font-extrabold text-navy-900">{invoice.concept}</p>
          <p className="mt-1 text-sm text-slate-600">{payee}</p>
          <p className="text-sm text-slate-500">{formatDateLong(invoice.created_at.slice(0, 10))}</p>
        </div>
        <div className="flex flex-col items-start gap-2 md:items-end">
          <p className="display text-xl text-navy-900">{formatMoney(invoice.amount)}</p>
          <Badge tone={badge.tone}>{badge.label}</Badge>
        </div>
      </div>

      {invoice.status === 'reportada' && invoice.payment_reference ? (
        <p className="mt-4 text-sm text-slate-600">
          Comprobante informado: <span className="font-bold">{invoice.payment_reference}</span>
        </p>
      ) : null}

      {invoice.status === 'pendiente' ? <ReportForm invoice={invoice} onReported={onReported} /> : null}
    </li>
  );
}

function ReportForm({ invoice, onReported }: { invoice: Invoice; onReported: (inv: Invoice) => void }) {
  const [reference, setReference] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = reference.trim();
    if (value.length < REF_MIN || value.length > REF_MAX) {
      setError(`El número de comprobante debe tener entre ${REF_MIN} y ${REF_MAX} caracteres.`);
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await repo.reportInvoicePaid(invoice.id, value);
      onReported({ ...invoice, status: 'reportada', payment_reference: value, reported_at: new Date().toISOString() });
    } catch (e) {
      setError(errorMessage(e));
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="mt-5 flex flex-col gap-3 border-t border-slate-200 pt-5 md:flex-row md:items-end">
      <div className="flex-1">
        <TextField
          label="Número de comprobante"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          error={error ?? undefined}
          disabled={saving}
          autoComplete="off"
        />
      </div>
      <Button type="submit" variant="blue" disabled={saving}>
        {saving ? 'Informando…' : 'Informar pago'}
      </Button>
    </form>
  );
}

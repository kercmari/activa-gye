import { useState, type FormEvent } from 'react';
import {
  repo,
  type Invoice,
  type InvoiceStatus,
  type Subscription,
  type SubscriptionPlan,
  type SubscriptionPlanInput,
  type SubscriptionStatus,
} from '../../data';
import AdminShell from '../../components/admin/AdminShell';
import PhaseGate from '../../components/PhaseGate';
import ConfirmDialog from '../../components/profile/ConfirmDialog';
import { useAsync } from '../../components/profile/useAsync';
import Badge, { type BadgeTone } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { SelectField, TextField } from '../../components/ui/Field';
import { EmptyState, ErrorState, Loading, errorMessage } from '../../components/ui/States';

const INVOICE_STATUS: Record<InvoiceStatus, { label: string; tone: BadgeTone }> = {
  pendiente: { label: 'Pendiente', tone: 'slate' },
  reportada: { label: 'Por confirmar', tone: 'orange' },
  pagada: { label: 'Pagada', tone: 'green' },
  anulada: { label: 'Anulada', tone: 'slate' },
};

const SUBSCRIPTION_STATUS: Record<SubscriptionStatus, { label: string; tone: BadgeTone }> = {
  pendiente: { label: 'Pendiente', tone: 'slate' },
  activa: { label: 'Activa', tone: 'green' },
  vencida: { label: 'Vencida', tone: 'orange' },
  cancelada: { label: 'Cancelada', tone: 'slate' },
};

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatMoney(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

/** Etiquetas de tipo de factura (los demás tipos se muestran sin etiqueta). */
const INVOICE_KIND_LABELS: Partial<Record<Invoice['kind'], string>> = {
  suscripcion_paciente: 'Suscripción del paciente',
};

const thClass = 'px-4 py-3 font-extrabold';
const tdClass = 'px-4 py-3 text-navy-900';

type Tab = 'facturas' | 'suscripciones' | 'planes';
const TABS: { key: Tab; label: string }[] = [
  { key: 'facturas', label: 'Facturas' },
  { key: 'suscripciones', label: 'Suscripciones' },
  { key: 'planes', label: 'Planes' },
];

/* ------------------------------------------------------------------ Facturas */

type InvoiceFilter = 'todas' | InvoiceStatus;
const INVOICE_FILTERS: { value: InvoiceFilter; label: string }[] = [
  { value: 'todas', label: 'Todas' },
  { value: 'reportada', label: 'Por confirmar' },
  { value: 'pendiente', label: 'Pendientes' },
  { value: 'pagada', label: 'Pagadas' },
  { value: 'anulada', label: 'Anuladas' },
];

function InvoicesTab() {
  const load = useAsync(() => repo.adminListInvoices(), []);
  const [filter, setFilter] = useState<InvoiceFilter>('todas');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [toCancel, setToCancel] = useState<Invoice | null>(null);

  const markPaid = async (invoice: Invoice) => {
    setActionError(null);
    setBusyId(invoice.id);
    try {
      await repo.markInvoicePaid(invoice.id);
      load.reload();
    } catch (error) {
      setActionError(errorMessage(error));
    } finally {
      setBusyId(null);
    }
  };

  const confirmCancel = async () => {
    if (!toCancel) return;
    const invoice = toCancel;
    setActionError(null);
    setBusyId(invoice.id);
    try {
      await repo.cancelInvoice(invoice.id);
      setToCancel(null);
      load.reload();
    } catch (error) {
      setToCancel(null);
      setActionError(errorMessage(error));
    } finally {
      setBusyId(null);
    }
  };

  if (load.status === 'loading') return <Loading text="Cargando facturas…" />;
  if (load.status === 'error') return <ErrorState message={load.message} onRetry={load.reload} />;

  const all = load.data;
  if (all.length === 0) {
    return (
      <EmptyState
        title="No hay facturas"
        text="Cuando se generen facturas de suscripciones o consultas, aparecerán aquí."
        action={{ label: 'Actualizar', onClick: load.reload }}
      />
    );
  }

  const rows = filter === 'todas' ? all : all.filter((invoice) => invoice.status === filter);
  const toConfirm = all.filter((invoice) => invoice.status === 'reportada').length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="w-full sm:max-w-xs">
          <SelectField label="Estado" value={filter} onChange={(e) => setFilter(e.target.value as InvoiceFilter)}>
            {INVOICE_FILTERS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </SelectField>
        </div>
        {toConfirm > 0 ? (
          <p role="status" className="rounded-xl bg-orange-50 px-4 py-3 text-sm font-semibold text-brand-orange-dark">
            {toConfirm} {toConfirm === 1 ? 'factura reportada espera' : 'facturas reportadas esperan'} confirmación.
          </p>
        ) : null}
      </div>

      {actionError ? (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{actionError}</p>
      ) : null}

      {rows.length === 0 ? (
        <EmptyState
          title="Sin facturas en este estado"
          text="Cambia el filtro para ver las demás facturas."
          action={{ label: 'Ver todas', onClick: () => setFilter('todas') }}
        />
      ) : (
        <div className="overflow-x-auto rounded-[1.75rem] bg-white shadow-xl shadow-navy-900/5">
          <table className="min-w-full text-left text-sm">
            <caption className="sr-only">Facturas</caption>
            <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th scope="col" className={thClass}>Fecha</th>
                <th scope="col" className={thClass}>Quién paga</th>
                <th scope="col" className={thClass}>Quién cobra</th>
                <th scope="col" className={thClass}>Concepto</th>
                <th scope="col" className={thClass}>Monto</th>
                <th scope="col" className={thClass}>Estado</th>
                <th scope="col" className={thClass}>Referencia</th>
                <th scope="col" className={thClass}><span className="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((invoice) => {
                const status = INVOICE_STATUS[invoice.status];
                const open = invoice.status === 'pendiente' || invoice.status === 'reportada';
                const busy = busyId === invoice.id;
                return (
                  <tr
                    key={invoice.id}
                    className={`border-t border-slate-100 align-top ${invoice.status === 'reportada' ? 'bg-orange-50/60' : ''}`}
                  >
                    <td className={tdClass}>{formatDate(invoice.created_at)}</td>
                    <td className={tdClass}>{invoice.payer_name || '—'}</td>
                    <td className={tdClass}>{invoice.payee_id === null ? 'Plataforma' : invoice.payee_name || '—'}</td>
                    <td className={tdClass}>
                      {invoice.concept}
                      {INVOICE_KIND_LABELS[invoice.kind] ? (
                        <span className="mt-1 block text-xs font-bold text-brand-orange-dark">{INVOICE_KIND_LABELS[invoice.kind]}</span>
                      ) : null}
                    </td>
                    <td className={`${tdClass} font-extrabold`}>{formatMoney(invoice.amount)}</td>
                    <td className={tdClass}><Badge tone={status.tone}>{status.label}</Badge></td>
                    <td className={tdClass}>{invoice.payment_reference || '—'}</td>
                    <td className={tdClass}>
                      {open ? (
                        <div className="flex flex-wrap gap-2">
                          <Button variant="blue" size="md" disabled={busy} onClick={() => void markPaid(invoice)}>
                            Marcar pagada
                          </Button>
                          <Button variant="secondary" size="md" disabled={busy} onClick={() => setToCancel(invoice)}>
                            Anular
                          </Button>
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {toCancel ? (
        <ConfirmDialog
          title="Anular factura"
          text={`Se anulará «${toCancel.concept}» por ${formatMoney(toCancel.amount)}. Después no se podrá marcar como pagada.`}
          confirmLabel="Anular factura"
          busy={busyId === toCancel.id}
          onConfirm={() => void confirmCancel()}
          onCancel={() => setToCancel(null)}
        />
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ Suscripciones */

function SubscriptionsTab() {
  const load = useAsync(() => repo.adminListSubscriptions(), []);

  if (load.status === 'loading') return <Loading text="Cargando suscripciones…" />;
  if (load.status === 'error') return <ErrorState message={load.message} onRetry={load.reload} />;

  const subs: Subscription[] = load.data;
  if (subs.length === 0) {
    return (
      <EmptyState
        title="No hay suscripciones"
        text="Aparecerán aquí cuando un nutricionista elija un plan."
        action={{ label: 'Actualizar', onClick: load.reload }}
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-[1.75rem] bg-white shadow-xl shadow-navy-900/5">
      <table className="min-w-full text-left text-sm">
        <caption className="sr-only">Suscripciones</caption>
        <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
          <tr>
            <th scope="col" className={thClass}>Nutricionista</th>
            <th scope="col" className={thClass}>Plan</th>
            <th scope="col" className={thClass}>Estado</th>
            <th scope="col" className={thClass}>Vence</th>
          </tr>
        </thead>
        <tbody>
          {subs.map((sub) => {
            const status = SUBSCRIPTION_STATUS[sub.status];
            return (
              <tr key={sub.id} className="border-t border-slate-100">
                <td className={tdClass}>{sub.nutritionist_name || '—'}</td>
                <td className={tdClass}>{sub.plan?.name || '—'}</td>
                <td className={tdClass}><Badge tone={status.tone}>{status.label}</Badge></td>
                <td className={tdClass}>{formatDate(sub.current_period_end)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------ Planes */

type PlanEditing = SubscriptionPlan | 'nuevo' | null;

interface PlanFormErrors {
  name?: string;
  price?: string;
  quota?: string;
  sort?: string;
}

function PlanForm({
  initial,
  onSaved,
  onCancel,
}: {
  initial: SubscriptionPlan | null;
  onSaved: (plan: SubscriptionPlan) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [price, setPrice] = useState(initial ? String(initial.monthly_price) : '');
  const [quota, setQuota] = useState(initial ? String(initial.patient_quota) : '');
  const [sort, setSort] = useState(initial ? String(initial.sort) : '0');
  const [active, setActive] = useState(initial?.active ?? true);
  const [errors, setErrors] = useState<PlanFormErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const found: PlanFormErrors = {};
    const trimmed = name.trim();
    const priceN = Number(price);
    const quotaN = Number(quota);
    const sortN = Number(sort);
    if (!trimmed) found.name = 'Escribe el nombre del plan.';
    if (price.trim() === '' || !Number.isFinite(priceN) || priceN < 0) found.price = 'Escribe un precio mayor o igual a 0.';
    if (quota.trim() === '' || !Number.isInteger(quotaN) || quotaN < 0) found.quota = 'Escribe un número entero de pacientes (0 o más).';
    if (sort.trim() === '' || !Number.isInteger(sortN)) found.sort = 'Escribe un número entero para el orden.';
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    const input: SubscriptionPlanInput = {
      ...(initial ? { id: initial.id } : {}),
      name: trimmed,
      monthly_price: priceN,
      patient_quota: quotaN,
      active,
      sort: sortN,
    };
    setServerError(null);
    setBusy(true);
    try {
      onSaved(await repo.adminSavePlan(input));
    } catch (error) {
      setServerError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      noValidate
      aria-label={initial ? 'Editar plan' : 'Nuevo plan'}
      className="flex flex-col gap-5 rounded-[1.75rem] bg-white p-6 shadow-xl shadow-navy-900/5"
    >
      <h2 className="display text-2xl text-navy-900">{initial ? 'Editar plan' : 'Nuevo plan'}</h2>
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField label="Nombre" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} />
        <TextField
          label="Precio mensual (USD)"
          type="number"
          inputMode="decimal"
          min={0}
          step="0.01"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          error={errors.price}
        />
        <TextField
          label="Cupo de pacientes"
          type="number"
          inputMode="numeric"
          min={0}
          step={1}
          value={quota}
          onChange={(e) => setQuota(e.target.value)}
          error={errors.quota}
        />
        <TextField
          label="Orden"
          type="number"
          inputMode="numeric"
          step={1}
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          error={errors.sort}
        />
      </div>
      <label className="flex items-center gap-3 font-bold text-navy-900">
        <input
          type="checkbox"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
          className="h-5 w-5 accent-brand-blue"
        />
        Plan activo (visible para los nutricionistas)
      </label>

      {serverError ? (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{serverError}</p>
      ) : null}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onCancel} disabled={busy}>Cancelar</Button>
        <Button type="submit" variant="primary" disabled={busy}>
          {busy ? 'Guardando…' : 'Guardar plan'}
        </Button>
      </div>
    </form>
  );
}

function PlansTab() {
  const load = useAsync(() => repo.listPlans(), []);
  const [editing, setEditing] = useState<PlanEditing>(null);
  const [saved, setSaved] = useState<string | null>(null);

  if (load.status === 'loading') return <Loading text="Cargando planes…" />;
  if (load.status === 'error') return <ErrorState message={load.message} onRetry={load.reload} />;

  const plans = load.data;

  const onSaved = (plan: SubscriptionPlan) => {
    setEditing(null);
    setSaved(`Plan «${plan.name}» guardado.`);
    load.reload();
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="font-semibold text-slate-600">{plans.length} {plans.length === 1 ? 'plan' : 'planes'}</p>
        <Button variant="blue" onClick={() => { setSaved(null); setEditing('nuevo'); }}>Nuevo plan</Button>
      </div>

      {saved ? (
        <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{saved}</p>
      ) : null}

      {plans.length === 0 && editing === null ? (
        <EmptyState
          title="Aún no hay planes"
          text="Crea el primer plan para que los nutricionistas puedan suscribirse."
          action={{ label: 'Nuevo plan', onClick: () => setEditing('nuevo') }}
        />
      ) : null}

      {plans.length > 0 ? (
        <div className="overflow-x-auto rounded-[1.75rem] bg-white shadow-xl shadow-navy-900/5">
          <table className="min-w-full text-left text-sm">
            <caption className="sr-only">Planes de suscripción</caption>
            <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th scope="col" className={thClass}>Orden</th>
                <th scope="col" className={thClass}>Nombre</th>
                <th scope="col" className={thClass}>Precio mensual</th>
                <th scope="col" className={thClass}>Cupo</th>
                <th scope="col" className={thClass}>Activo</th>
                <th scope="col" className={thClass}><span className="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              {plans.map((plan) => (
                <tr key={plan.id} className="border-t border-slate-100">
                  <td className={tdClass}>{plan.sort}</td>
                  <td className={`${tdClass} font-extrabold`}>{plan.name}</td>
                  <td className={tdClass}>{formatMoney(plan.monthly_price)}</td>
                  <td className={tdClass}>{plan.patient_quota} pacientes</td>
                  <td className={tdClass}>
                    <Badge tone={plan.active ? 'green' : 'slate'}>{plan.active ? 'Sí' : 'No'}</Badge>
                  </td>
                  <td className={tdClass}>
                    <Button
                      variant="secondary"
                      size="md"
                      onClick={() => { setSaved(null); setEditing(plan); }}
                    >
                      Editar
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {editing !== null ? (
        <PlanForm
          key={editing === 'nuevo' ? 'nuevo' : editing.id}
          initial={editing === 'nuevo' ? null : editing}
          onSaved={onSaved}
          onCancel={() => setEditing(null)}
        />
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ Página */

/** Admin → Pagos: facturas (marcar pagada / anular), suscripciones y planes. */
export default function AdminPagosPage() {
  const [tab, setTab] = useState<Tab>('facturas');

  return (
    <AdminShell title="Pagos">
      <PhaseGate phase={2} title="Pagos">
        <div role="tablist" aria-label="Secciones de pagos" className="mb-6 flex gap-2 overflow-x-auto pb-1">
          {TABS.map((item) => (
            <button
              key={item.key}
              id={`tab-${item.key}`}
              type="button"
              role="tab"
              aria-selected={tab === item.key}
              aria-controls="pagos-panel"
              onClick={() => setTab(item.key)}
              className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-extrabold transition-colors ${
                tab === item.key ? 'bg-navy-900 text-white' : 'bg-white text-navy-900 hover:bg-slate-100'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div id="pagos-panel" role="tabpanel" aria-labelledby={`tab-${tab}`}>
          {tab === 'facturas' ? <InvoicesTab /> : null}
          {tab === 'suscripciones' ? <SubscriptionsTab /> : null}
          {tab === 'planes' ? <PlansTab /> : null}
        </div>
      </PhaseGate>
    </AdminShell>
  );
}

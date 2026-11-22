import { useState, type FormEvent } from 'react';
import { useAuth } from '../../auth/AuthContext';
import {
  repo,
  type Invoice,
  type InvoiceStatus,
  type Subscription,
  type SubscriptionPlan,
} from '../../data';
import PhaseGate from '../../components/PhaseGate';
import NutriShell from '../../components/nutri/NutriShell';
import { formatDateLong } from '../../components/profile/labels';
import { useAsync } from '../../components/profile/useAsync';
import Badge, { type BadgeTone } from '../../components/ui/Badge';
import { Button, LinkButton } from '../../components/ui/Button';
import { TextField } from '../../components/ui/Field';
import { EmptyState, ErrorState, Loading, errorMessage } from '../../components/ui/States';

interface Data {
  subscription: Subscription | null;
  plans: SubscriptionPlan[];
  invoices: Invoice[];
}

const STATUS_BADGE: Record<string, { label: string; tone: BadgeTone }> = {
  pendiente: { label: 'Pendiente de pago', tone: 'orange' },
  activa: { label: 'Activa', tone: 'green' },
  vencida: { label: 'Vencida', tone: 'orange' },
  cancelada: { label: 'Cancelada', tone: 'slate' },
};

const INVOICE_BADGE: Record<InvoiceStatus, { label: string; tone: BadgeTone }> = {
  pendiente: { label: 'Pendiente de pago', tone: 'orange' },
  reportada: { label: 'Comprobante reportado', tone: 'blue' },
  pagada: { label: 'Pagada', tone: 'green' },
  anulada: { label: 'Anulada', tone: 'slate' },
};

function money(amount: number): string {
  return `$${Number.isInteger(amount) ? amount : amount.toFixed(2).replace('.', ',')}`;
}

function StatusCard({ subscription }: { subscription: Subscription | null }) {
  if (!subscription) {
    return (
      <div className="rounded-[1.75rem] bg-white p-6 shadow-xl shadow-navy-900/5">
        <p className="eyebrow">Estado actual</p>
        <p className="display mt-3 text-2xl text-navy-900">Sin suscripción</p>
        <p className="mt-2 text-sm text-slate-500">Elige un plan para poder aceptar pacientes.</p>
      </div>
    );
  }

  const badge = STATUS_BADGE[subscription.status] ?? { label: subscription.status, tone: 'slate' as const };
  let detail = '';
  if (subscription.status === 'activa') {
    detail = subscription.current_period_end
      ? `Activa hasta ${formatDateLong(subscription.current_period_end.slice(0, 10))}`
      : 'Activa';
  } else if (subscription.status === 'pendiente') {
    detail = 'Paga la factura de tu plan y informa el comprobante.';
  } else if (subscription.status === 'vencida') {
    detail = 'Renueva tu plan para seguir aceptando pacientes.';
  }

  return (
    <div className="rounded-[1.75rem] bg-white p-6 shadow-xl shadow-navy-900/5">
      <p className="eyebrow">Estado actual</p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Badge tone={badge.tone}>{badge.label}</Badge>
        {subscription.plan ? <span className="font-extrabold text-navy-900">Plan {subscription.plan.name}</span> : null}
      </div>
      {detail ? <p className="mt-3 text-slate-600">{detail}</p> : null}
    </div>
  );
}

function PlanCard({
  plan,
  hasActive,
  busy,
  anyBusy,
  onChoose,
}: {
  plan: SubscriptionPlan;
  hasActive: boolean;
  busy: boolean;
  anyBusy: boolean;
  onChoose: (plan: SubscriptionPlan) => void;
}) {
  let label = 'Elegir este plan';
  if (hasActive) label = 'Ya tienes una suscripción activa';
  else if (busy) label = 'Creando factura…';

  return (
    <article className="flex flex-col rounded-[1.75rem] bg-white p-6 shadow-xl shadow-navy-900/5">
      <h3 className="display text-2xl text-navy-900">{plan.name}</h3>
      <p className="mt-3 text-3xl font-extrabold text-navy-900">
        {money(plan.monthly_price)} <span className="text-base font-bold text-slate-500">al mes</span>
      </p>
      <p className="mt-2 text-sm text-slate-500">Hasta {plan.patient_quota} pacientes</p>
      <div className="mt-6">
        <Button
          variant="primary"
          size="md"
          className="w-full"
          disabled={hasActive || anyBusy}
          aria-busy={busy || undefined}
          onClick={() => onChoose(plan)}
        >
          {label}
        </Button>
      </div>
    </article>
  );
}

function InvoicePayForm({ invoice, onPaid }: { invoice: Invoice; onPaid: () => void }) {
  const [reference, setReference] = useState('');
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const ref = reference.trim();
    if (ref.length < 4 || ref.length > 100) {
      setFieldError('El número de comprobante debe tener entre 4 y 100 caracteres.');
      return;
    }
    setFieldError(undefined);
    setSubmitError(null);
    setBusy(true);
    try {
      await repo.reportInvoicePaid(invoice.id, ref);
      onPaid();
    } catch (err) {
      setSubmitError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="mt-4 space-y-4 rounded-2xl bg-slate-50 p-4">
      <TextField
        label="Número de comprobante"
        value={reference}
        onChange={(e) => setReference(e.target.value)}
        error={fieldError}
        maxLength={100}
        autoComplete="off"
      />
      {submitError ? <p role="alert" className="text-sm font-semibold text-red-700">{submitError}</p> : null}
      <Button type="submit" variant="primary" size="md" disabled={busy}>
        {busy ? 'Enviando…' : 'Informar pago'}
      </Button>
    </form>
  );
}

function SuscripcionData() {
  const state = useAsync<Data>(async () => {
    const [subscription, plans, invoices] = await Promise.all([
      repo.getMySubscription(),
      repo.listPlans(),
      repo.listMyInvoices(),
    ]);
    return { subscription, plans, invoices: invoices.filter((i) => i.kind === 'suscripcion') };
  }, []);

  const [busyPlanId, setBusyPlanId] = useState<string | null>(null);
  const [createdInvoice, setCreatedInvoice] = useState<Invoice | null>(null);
  const [planError, setPlanError] = useState<string | null>(null);

  if (state.status === 'loading') return <Loading />;
  if (state.status === 'error') return <ErrorState message={state.message} onRetry={state.reload} />;

  const { subscription, plans, invoices } = state.data;
  const hasActive = subscription?.status === 'activa';

  async function choose(plan: SubscriptionPlan) {
    setBusyPlanId(plan.id);
    setPlanError(null);
    setCreatedInvoice(null);
    try {
      const invoice = await repo.choosePlan(plan.id);
      setCreatedInvoice(invoice);
      state.reload();
    } catch (err) {
      setPlanError(errorMessage(err));
    } finally {
      setBusyPlanId(null);
    }
  }

  return (
    <div className="space-y-8">
      <StatusCard subscription={subscription} />

      {createdInvoice ? (
        <div role="status" className="rounded-2xl bg-emerald-50 px-5 py-4 text-sm font-semibold text-emerald-700">
          Factura creada: {createdInvoice.concept} por {money(createdInvoice.amount)}. Haz la transferencia y luego informa el comprobante abajo.
        </div>
      ) : null}
      {planError ? (
        <p role="alert" className="rounded-2xl bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">{planError}</p>
      ) : null}

      <section aria-labelledby="planes" className="space-y-4">
        <h2 id="planes" className="display text-2xl text-navy-900">Planes</h2>
        {plans.length === 0 ? (
          <EmptyState
            title="Planes"
            text="No hay planes disponibles por ahora."
            action={{ label: 'Volver al tablero', to: '/nutri' }}
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {plans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                hasActive={hasActive}
                busy={busyPlanId === plan.id}
                anyBusy={busyPlanId !== null}
                onChoose={choose}
              />
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="como-pagar" className="rounded-[1.75rem] bg-white p-6 shadow-xl shadow-navy-900/5 md:p-8">
        <h2 id="como-pagar" className="display text-2xl text-navy-900">Cómo pagar</h2>
        <p className="mt-3 text-slate-600">
          Haz una transferencia por el monto de la factura y escribe aquí el número de comprobante. El administrador confirmará el pago.
        </p>
        <p className="mt-2 text-sm text-slate-500">Los datos bancarios te los da el administrador por correo.</p>
      </section>

      <section aria-labelledby="facturas" className="space-y-4">
        <h2 id="facturas" className="display text-2xl text-navy-900">Mis facturas de suscripción</h2>
        {invoices.length === 0 ? (
          <EmptyState title="Facturas" text="Aún no tienes facturas de suscripción." />
        ) : (
          <ul className="space-y-4">
            {invoices.map((invoice) => {
              const badge = INVOICE_BADGE[invoice.status];
              return (
                <li key={invoice.id} className="rounded-[1.75rem] bg-white p-6 shadow-xl shadow-navy-900/5">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0">
                      <p className="font-extrabold text-navy-900">{invoice.concept}</p>
                      <p className="text-sm text-slate-500">{money(invoice.amount)}</p>
                    </div>
                    <Badge tone={badge.tone}>{badge.label}</Badge>
                  </div>
                  {invoice.status === 'pendiente' ? (
                    <InvoicePayForm invoice={invoice} onPaid={state.reload} />
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function SuscripcionContent() {
  const { session } = useAuth();
  if (session?.profile.role === 'admin') {
    return (
      <div className="rounded-[1.75rem] bg-white p-6 shadow-xl shadow-navy-900/5">
        <p className="font-bold text-navy-900">Como administrador no necesitas suscripción.</p>
        <div className="mt-6">
          <LinkButton to="/admin/pagos" variant="secondary" size="md">Ir a pagos</LinkButton>
        </div>
      </div>
    );
  }
  return <SuscripcionData />;
}

export default function Page() {
  return (
    <PhaseGate phase={2} title="Mi suscripción" back={{ to: '/', label: 'Ir al inicio' }}>
      <NutriShell title="Mi suscripción">
        <SuscripcionContent />
      </NutriShell>
    </PhaseGate>
  );
}

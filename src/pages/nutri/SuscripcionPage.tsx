import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { useSettings } from '../../auth/SettingsContext';
import { repo, type Subscription, type SubscriptionPlan } from '../../data';
import PhaseGate from '../../components/PhaseGate';
import NutriShell from '../../components/nutri/NutriShell';
import { formatDateLong } from '../../components/profile/labels';
import { useAsync } from '../../components/profile/useAsync';
import Badge, { type BadgeTone } from '../../components/ui/Badge';
import { Button, LinkButton } from '../../components/ui/Button';
import { EmptyState, ErrorState, Loading, errorMessage } from '../../components/ui/States';
import { subscriptionMailto } from '../../lib/mailto';

interface Data {
  subscription: Subscription | null;
  plans: SubscriptionPlan[];
}

const STATUS_BADGE: Record<string, { label: string; tone: BadgeTone }> = {
  pendiente: { label: 'Solicitud pendiente', tone: 'orange' },
  activa: { label: 'Activa', tone: 'green' },
  vencida: { label: 'Vencida', tone: 'orange' },
  cancelada: { label: 'Cancelada', tone: 'slate' },
};

function money(amount: number): string {
  return `$${Number.isInteger(amount) ? amount : amount.toFixed(2).replace('.', ',')}`;
}

function StatusCard({ subscription }: { subscription: Subscription | null }) {
  if (!subscription) {
    return (
      <div className="rounded-[1.75rem] bg-white p-6 shadow-xl shadow-navy-900/5">
        <p className="eyebrow">Estado actual</p>
        <p className="display mt-3 text-2xl text-navy-900">Plan gratis</p>
        <p className="mt-2 text-sm text-slate-500">Usas el plan gratis hasta que elijas uno de pago.</p>
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
    detail = 'Tu solicitud está esperando la aprobación de la administradora.';
  } else if (subscription.status === 'vencida') {
    detail = 'Pide de nuevo tu plan para seguir con todos los cupos.';
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

function FreeCard({ patients, records, current }: { patients: number; records: number; current: boolean }) {
  return (
    <article className="flex flex-col rounded-[1.75rem] bg-white p-6 shadow-xl shadow-navy-900/5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="display text-2xl text-navy-900">Gratis</h3>
        {current ? <Badge tone="green">Tu plan actual</Badge> : null}
      </div>
      <p className="mt-3 text-3xl font-extrabold text-navy-900">$0</p>
      <ul className="mt-4 space-y-2 text-sm text-slate-600">
        <li>Hasta {patients} pacientes</li>
        <li>{records} registros por día</li>
      </ul>
    </article>
  );
}

function PlanCard({
  plan,
  current,
  hasActive,
  busy,
  anyBusy,
  onRequest,
}: {
  plan: SubscriptionPlan;
  current: boolean;
  hasActive: boolean;
  busy: boolean;
  anyBusy: boolean;
  onRequest: (plan: SubscriptionPlan) => void;
}) {
  let label = 'Solicitar este plan';
  if (busy) label = 'Registrando solicitud…';
  else if (current) label = 'Renovar este plan';
  else if (hasActive) label = 'Mejorar a este plan';

  return (
    <article className="flex flex-col rounded-[1.75rem] bg-white p-6 shadow-xl shadow-navy-900/5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="display text-2xl text-navy-900">{plan.name}</h3>
        {current ? <Badge tone="green">Tu plan actual</Badge> : null}
      </div>
      <p className="mt-3 text-3xl font-extrabold text-navy-900">
        {money(plan.monthly_price)} <span className="text-base font-bold text-slate-500">al mes</span>
      </p>
      <ul className="mt-4 space-y-2 text-sm text-slate-600">
        <li>Hasta {plan.patient_quota} pacientes</li>
        <li>
          {plan.daily_record_limit === null ? 'Sin límite de registros por día' : `${plan.daily_record_limit} registros por día`}
        </li>
        {plan.features.map((f) => (
          <li key={f} className="flex gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <div className="mt-6">
        <Button
          variant="primary"
          size="md"
          className="w-full"
          disabled={anyBusy}
          aria-busy={busy || undefined}
          onClick={() => onRequest(plan)}
        >
          {label}
        </Button>
      </div>
    </article>
  );
}

function SuscripcionData() {
  const { session } = useAuth();
  const { settings } = useSettings();
  const state = useAsync<Data>(async () => {
    const [subscription, plans] = await Promise.all([repo.getMySubscription(), repo.listPlans()]);
    return { subscription, plans };
  }, []);

  const [busyPlanId, setBusyPlanId] = useState<string | null>(null);
  const [registrada, setRegistrada] = useState(false);
  const [rpcError, setRpcError] = useState<string | null>(null);

  if (state.status === 'loading') return <Loading />;
  if (state.status === 'error') return <ErrorState message={state.message} onRetry={state.reload} />;

  const { subscription, plans } = state.data;
  const hasActive = subscription?.status === 'activa';

  async function pedir(plan: SubscriptionPlan) {
    setBusyPlanId(plan.id);
    setRegistrada(false);
    setRpcError(null);
    try {
      await repo.choosePlan(plan.id);
      setRegistrada(true);
    } catch (err) {
      setRpcError(errorMessage(err));
    } finally {
      setBusyPlanId(null);
    }
    // Se abre el correo igual, con el pedido listo, aunque el registro haya fallado.
    window.location.href = subscriptionMailto(settings.admin_email, {
      plan: plan.name,
      price: plan.monthly_price,
      fullName: session?.profile.full_name ?? '',
      email: session?.user.email ?? '',
    });
    state.reload();
  }

  return (
    <div className="space-y-8">
      <StatusCard subscription={subscription} />

      {registrada ? (
        <div role="status" className="rounded-2xl bg-emerald-50 px-5 py-4 text-sm font-semibold text-emerald-700">
          Tu solicitud quedó registrada. Envía el correo y la administradora la aprobará al confirmar tu transferencia.
        </div>
      ) : null}
      {rpcError ? (
        <p role="alert" className="rounded-2xl bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">
          No pudimos registrar tu solicitud: {rpcError} Igual se abrió tu correo para enviar el pedido.
        </p>
      ) : null}

      <section aria-labelledby="planes" className="space-y-4">
        <h2 id="planes" className="display text-2xl text-navy-900">Planes</h2>
        <p className="text-sm text-slate-500">
          Cada plan se diferencia por sus cupos de pacientes y registros por día. Para pedir un plan de pago se abre tu correo con el pedido listo.
        </p>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <FreeCard
            patients={settings.free_patient_limit}
            records={settings.free_daily_record_limit}
            current={!hasActive}
          />
          {plans.length === 0 ? (
            <div className="md:col-span-1">
              <EmptyState
                title="Planes de pago"
                text="No hay planes de pago disponibles por ahora."
                action={{ label: 'Volver al tablero', to: '/nutri' }}
              />
            </div>
          ) : (
            plans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                current={hasActive && subscription?.plan_id === plan.id}
                hasActive={hasActive}
                busy={busyPlanId === plan.id}
                anyBusy={busyPlanId !== null}
                onRequest={pedir}
              />
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function SuscripcionContent() {
  const { session } = useAuth();
  if (session?.profile.role === 'admin') {
    return (
      <div className="rounded-[1.75rem] bg-white p-6 shadow-xl shadow-navy-900/5">
        <p className="font-bold text-navy-900">Como administradora no necesitas un plan.</p>
        <div className="mt-6">
          <LinkButton to="/admin/suscripciones" variant="secondary" size="md">Ir a suscripciones</LinkButton>
        </div>
      </div>
    );
  }
  return <SuscripcionData />;
}

export default function Page() {
  return (
    <PhaseGate phase={2} title="Mi plan" back={{ to: '/', label: 'Ir al inicio' }}>
      <NutriShell title="Mi plan">
        <SuscripcionContent />
      </NutriShell>
    </PhaseGate>
  );
}

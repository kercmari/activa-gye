import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { repo, type PatientSubscription, type RecipeBalance, type SubscriptionPlan } from '../../data';
import { useAuth } from '../../auth/AuthContext';
import { useSettings } from '../../auth/SettingsContext';
import PhaseGate from '../../components/PhaseGate';
import { formatDateTimeLong } from '../../components/profile/labels';
import { useAsync } from '../../components/profile/useAsync';
import PageHeader from '../../components/ui/PageHeader';
import { Button, LinkButton } from '../../components/ui/Button';
import { EmptyState, ErrorState, Loading, errorMessage } from '../../components/ui/States';
import { subscriptionMailto } from '../../lib/mailto';

/** Precio para mostrar: "$40", "$9,50". */
function formatPrecio(amount: number): string {
  return Number.isInteger(amount) ? `$${amount}` : `$${amount.toFixed(2).replace('.', ',')}`;
}

/** Suscripción del paciente: plan de recetas, pedido por correo y saldo de recetas. */
export default function SuscribirmePage() {
  return (
    <>
      <PageHeader eyebrow="Mi plan" title="Suscripción" subtitle="Tu nutricionista te entrega recetas que llenan tu calendario." back={false} />
      <section className="mx-auto max-w-6xl space-y-6 px-4 py-10">
        <PhaseGate phase={2} title="Suscripción" back={{ to: '/mi-plan', label: 'Volver a mi plan' }}>
          <SuscripcionData />
        </PhaseGate>
        <div>
          <LinkButton to="/mi-plan/agenda" variant="secondary">Volver a la agenda</LinkButton>
        </div>
      </section>
    </>
  );
}

interface Datos {
  sub: PatientSubscription | null;
  planes: SubscriptionPlan[];
  saldo: RecipeBalance | null;
}

function SuscripcionData() {
  const { session } = useAuth();
  const userId = session?.user.id ?? '';
  const state = useAsync<Datos>(async () => {
    const sub = await repo.getMyPatientSubscription();
    const [planes, saldo] = await Promise.all([
      repo.listPatientPlans(),
      sub?.status === 'activa' ? repo.getRecipeBalance() : Promise.resolve(null),
    ]);
    return { sub, planes, saldo };
  }, [userId]);

  if (state.status === 'loading') return <Loading text="Cargando tu suscripción…" />;
  if (state.status === 'error') return <ErrorState message={state.message} onRetry={state.reload} />;
  return <Suscripcion datos={state.data} onRetry={state.reload} />;
}

function Suscripcion({ datos, onRetry }: { datos: Datos; onRetry: () => void }) {
  const { sub, planes, saldo } = datos;
  // Momento de la carga: fija la comparación de vigencia sin llamar a Date.now() en cada render.
  const [ahora] = useState(() => Date.now());
  const finMs = sub?.current_period_end ? Date.parse(sub.current_period_end) : Number.NaN;
  const activa = sub?.status === 'activa' && Number.isFinite(finMs) && finMs > ahora;

  if (activa && sub) {
    return (
      <div className="space-y-6">
        <div className="rounded-[1.75rem] bg-white p-6 shadow-xl shadow-navy-900/5">
          <p className="eyebrow text-brand-orange">Suscripción activa</p>
          <h2 className="display mt-2 text-2xl text-navy-900">{sub.plan_name}</h2>
          {saldo ? (
            <p className="mt-3 font-extrabold text-navy-900">
              {`Te quedan ${saldo.left} de ${saldo.quota} recetas`}
              {saldo.period_end ? ` · vence el ${formatDateTimeLong(saldo.period_end)}` : ''}
            </p>
          ) : (
            <p className="mt-3 text-slate-600">{`Tu suscripción está activa hasta el ${formatDateTimeLong(sub.current_period_end ?? '')}.`}</p>
          )}
          <div className="mt-6">
            <LinkButton to="/mi-plan/agenda" variant="secondary">Ver mi agenda y mis recetas</LinkButton>
          </div>
        </div>
        <p className="text-sm text-slate-600">Para renovar o cambiar de plan, usa el mismo botón de abajo.</p>
        <PlanesPaciente planes={planes} onRetry={onRetry} />
      </div>
    );
  }

  if (sub?.status === 'pendiente') {
    return (
      <div className="space-y-6">
        <div role="status" className="rounded-[1.75rem] bg-white p-6 shadow-xl shadow-navy-900/5">
          <p className="eyebrow text-brand-orange">Solicitud pendiente</p>
          <p className="mt-2 font-extrabold text-navy-900">Tu solicitud de suscripción está registrada.</p>
          <p className="mt-2 text-sm text-slate-600">Si aún no enviaste el correo, pulsa el botón de tu plan. La administradora la aprobará al confirmar tu transferencia.</p>
        </div>
        <PlanesPaciente planes={planes} onRetry={onRetry} />
      </div>
    );
  }

  if (sub?.status === 'vencida' || (sub?.status === 'activa' && !activa)) {
    return (
      <div className="space-y-6">
        <div role="status" className="rounded-[1.75rem] bg-white p-6 shadow-xl shadow-navy-900/5">
          <p className="eyebrow text-brand-orange">Suscripción vencida</p>
          <p className="mt-2 font-extrabold text-navy-900">
            {sub.current_period_end
              ? `Tu suscripción venció el ${formatDateTimeLong(sub.current_period_end)}.`
              : 'Tu suscripción ya no está vigente.'}
          </p>
          <p className="mt-2 text-sm text-slate-600">Elige un plan para volver a recibir recetas de tu nutricionista.</p>
        </div>
        <PlanesPaciente planes={planes} onRetry={onRetry} />
      </div>
    );
  }

  return <PlanesPaciente planes={planes} onRetry={onRetry} />;
}

function PlanesPaciente({ planes, onRetry }: { planes: SubscriptionPlan[]; onRetry: () => void }) {
  const { session } = useAuth();
  const { settings } = useSettings();
  if (planes.length === 0) {
    return (
      <EmptyState
        title="Suscripción"
        text="Por ahora no hay planes disponibles. Vuelve a intentarlo más tarde."
        action={{ label: 'Reintentar', onClick: onRetry }}
      />
    );
  }
  return (
    <section className="space-y-4" aria-label="Planes para pacientes">
      <h2 className="display text-2xl text-navy-900">Elige tu plan</h2>
      <ul className="grid gap-6 md:grid-cols-2">
        {planes.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            adminEmail={settings.admin_email}
            fullName={session?.profile.full_name ?? ''}
            email={session?.user.email ?? ''}
          />
        ))}
      </ul>
    </section>
  );
}

interface PlanCardProps {
  plan: SubscriptionPlan;
  adminEmail: string;
  fullName: string;
  email: string;
}

/** Tarjeta de un plan de paciente. El único pago es el correo: se registra la solicitud y luego se abre el mailto. */
function PlanCard({ plan, adminEmail, fullName, email }: PlanCardProps) {
  const [enviando, setEnviando] = useState(false);
  const [registrada, setRegistrada] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pedir = async () => {
    setEnviando(true);
    setError(null);
    try {
      await repo.choosePatientPlan(plan.id);
      setRegistrada(true);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setEnviando(false);
    }
    // El correo se abre aunque la solicitud no se haya registrado: la administradora lo ve igual.
    window.location.href = subscriptionMailto(adminEmail, { plan: plan.name, price: plan.monthly_price, fullName, email });
  };

  const recetas = plan.recipe_quota ?? 0;
  return (
    <li className="flex flex-col rounded-[1.75rem] bg-white p-6 shadow-xl shadow-navy-900/5">
      <p className="font-extrabold text-navy-900">{plan.name}</p>
      <p className="display mt-2 text-3xl text-navy-900">
        {`${formatPrecio(plan.monthly_price)} al mes`}
      </p>
      <p className="mt-2 font-semibold text-slate-700">{`${recetas} recetas de tu nutricionista`}</p>
      {plan.features.length > 0 ? (
        <ul className="mt-5 space-y-2 text-sm text-slate-600">
          {plan.features.map((texto) => (
            <li key={texto} className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-blue" aria-hidden="true" />
              {texto}
            </li>
          ))}
        </ul>
      ) : null}
      {error ? (
        <p role="alert" className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          {`No pudimos registrar tu solicitud: ${error} Se abrió el correo para enviarla igual.`}
        </p>
      ) : null}
      {registrada ? (
        <p role="status" className="mt-4 rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
          Tu solicitud quedó registrada. Envía el correo y la administradora la aprobará al confirmar tu transferencia.
        </p>
      ) : null}
      <div className="mt-6">
        <Button variant="primary" onClick={() => void pedir()} disabled={enviando} className="w-full md:w-auto">
          {enviando ? 'Registrando…' : 'Contactar por correo para solicitar una suscripción'}
        </Button>
      </div>
    </li>
  );
}

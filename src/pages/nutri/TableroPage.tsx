import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { useAuth } from '../../auth/AuthContext';
import { repo, type NutriDashboard } from '../../data';
import PhaseGate from '../../components/PhaseGate';
import NutriShell from '../../components/nutri/NutriShell';
import { formatDateLong } from '../../components/profile/labels';
import { useAsync } from '../../components/profile/useAsync';
import { LinkButton } from '../../components/ui/Button';
import { ErrorState, Loading } from '../../components/ui/States';

function StatCard({ label, value, hint, to }: { label: string; value: ReactNode; hint?: string; to?: string }) {
  const body = (
    <>
      <p className="eyebrow">{label}</p>
      <p className="display mt-3 text-4xl text-navy-900">{value}</p>
      {hint ? <p className="mt-2 text-sm text-slate-500">{hint}</p> : null}
    </>
  );
  const cls = 'block rounded-[1.75rem] bg-white p-6 shadow-xl shadow-navy-900/5';
  return to ? (
    <Link to={to} className={`${cls} transition-colors hover:bg-slate-50`}>{body}</Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

function PlanCard({ dashboard }: { dashboard: NutriDashboard }) {
  const { limits, subscription } = dashboard;
  const active = subscription?.status === 'activa';
  const planName = active && limits.plan_name ? `Plan ${limits.plan_name}` : 'Plan gratis';
  return (
    <section aria-labelledby="plan-actual" className="flex flex-col gap-4 rounded-[1.75rem] bg-white p-6 shadow-xl shadow-navy-900/5 md:flex-row md:items-center md:justify-between">
      <div>
        <p className="eyebrow">Plan actual</p>
        <h2 id="plan-actual" className="display mt-2 text-2xl text-navy-900">{planName}</h2>
        <p className="mt-1 text-sm text-slate-500">
          {active && subscription?.current_period_end
            ? `Activo hasta ${formatDateLong(subscription.current_period_end.slice(0, 10))}`
            : 'Mejora tu plan para agregar más pacientes y registros.'}
        </p>
      </div>
      <LinkButton to="/nutri/suscripcion" variant="primary" size="md">Mejorar plan</LinkButton>
    </section>
  );
}

function TableroContent({ isAdmin }: { isAdmin: boolean }) {
  const state = useAsync<NutriDashboard>(() => repo.getNutriDashboard(), []);

  if (state.status === 'loading') return <Loading />;
  if (state.status === 'error') return <ErrorState message={state.message} onRetry={state.reload} />;

  const d = state.data;
  const { limits } = d;

  return (
    <div className="space-y-8">
      {isAdmin ? (
        <p className="rounded-2xl bg-sky-50 px-5 py-4 text-sm font-semibold text-sky-tag">
          Como administradora no tienes límites de pacientes ni de registros.
        </p>
      ) : (
        <PlanCard dashboard={d} />
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Pacientes"
          value={isAdmin ? d.my_patients : `${d.my_patients} de ${limits.patient_quota}`}
          hint={isAdmin ? undefined : 'Pacientes activos según tu plan'}
          to="/nutri/pacientes"
        />
        <StatCard
          label="Registros de hoy"
          value={
            isAdmin
              ? 'Sin límite'
              : limits.daily_record_limit === null
                ? `${limits.records_today} · sin límite`
                : `${limits.records_today} de ${limits.daily_record_limit}`
          }
          hint={isAdmin ? undefined : 'Se cuentan los días y recetas que creas hoy'}
        />
        <StatCard label="Recetas entregadas esta semana" value={d.recipes_week} />
        <StatCard
          label="Solicitudes abiertas"
          value={d.open_requests}
          hint="Ver la bolsa de solicitudes"
          to="/nutri/solicitudes"
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <LinkButton to="/nutri/pacientes" variant="secondary" size="md">Ver mis pacientes</LinkButton>
      </div>
    </div>
  );
}

export default function Page() {
  const { session } = useAuth();
  const isAdmin = session?.profile.role === 'admin';
  return (
    <PhaseGate phase={2} title="Panel del nutricionista" back={{ to: '/', label: 'Ir al inicio' }}>
      <NutriShell title="Tablero">
        <TableroContent isAdmin={isAdmin} />
      </NutriShell>
    </PhaseGate>
  );
}

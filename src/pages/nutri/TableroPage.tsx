import { AlertTriangle } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { useAuth } from '../../auth/AuthContext';
import { repo, type NutriDashboard, type PatientSummary } from '../../data';
import PhaseGate from '../../components/PhaseGate';
import NutriShell from '../../components/nutri/NutriShell';
import { percent } from '../../components/nutri/format';
import { useAsync } from '../../components/profile/useAsync';
import { formatDateLong } from '../../components/profile/labels';
import { Button, LinkButton } from '../../components/ui/Button';
import { EmptyState, ErrorState, Loading } from '../../components/ui/States';

interface Data {
  dashboard: NutriDashboard;
  patients: PatientSummary[];
}

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

function SubscriptionNotice({ role, dashboard }: { role: string | undefined; dashboard: NutriDashboard }) {
  if (role === 'admin') {
    return (
      <p className="rounded-2xl bg-sky-50 px-5 py-4 text-sm font-semibold text-sky-tag">
        Como administrador, no necesitas suscripción.
      </p>
    );
  }
  const active = dashboard.subscription?.status === 'activa';
  if (active) return null;
  return (
    <div role="alert" className="flex flex-col gap-4 rounded-2xl border border-orange-200 bg-orange-50 px-5 py-4 md:flex-row md:items-center md:justify-between">
      <p className="flex items-start gap-3 font-bold text-brand-orange-dark">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        Necesitas una suscripción activa para aceptar pacientes.
      </p>
      <LinkButton to="/nutri/suscripcion" variant="primary" size="md">Elegir plan</LinkButton>
    </div>
  );
}

function PatientRow({ p }: { p: PatientSummary }) {
  return (
    <li className="flex flex-col gap-3 py-4 md:flex-row md:items-center md:justify-between">
      <div className="min-w-0">
        <p className="font-extrabold text-navy-900">{p.full_name}</p>
        <p className="text-sm text-slate-500">
          {p.age !== null ? `${p.age} años` : 'Edad sin dato'} · {p.days_done} de {p.days_total} días cumplidos
        </p>
        <p className="text-sm text-slate-500">
          {p.last_followup_date ? `Último seguimiento: ${formatDateLong(p.last_followup_date)}` : 'Sin seguimiento'}
        </p>
      </div>
      <LinkButton to={`/nutri/pacientes/${p.patient_id}`} variant="secondary" size="md">Ver paciente</LinkButton>
    </li>
  );
}

function TableroContent() {
  const { session } = useAuth();
  const role = session?.profile.role;
  const state = useAsync<Data>(async () => {
    const [dashboard, patients] = await Promise.all([repo.getNutriDashboard(), repo.listMyPatients()]);
    return { dashboard, patients };
  }, []);

  if (state.status === 'loading') return <Loading />;
  if (state.status === 'error') return <ErrorState message={state.message} onRetry={state.reload} />;

  const { dashboard, patients } = state.data;
  const pct = percent(dashboard.week_days_done, dashboard.week_days_total);

  return (
    <div className="space-y-8">
      <SubscriptionNotice role={role} dashboard={dashboard} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Solicitudes abiertas" value={dashboard.open_requests} hint="Ver la bolsa de solicitudes" to="/nutri/solicitudes" />
        <StatCard label="Mis pacientes" value={dashboard.my_patients} />
        <StatCard
          label="Días cumplidos esta semana"
          value={`${dashboard.week_days_done}/${dashboard.week_days_total}`}
          hint={`${pct}% de los días programados`}
        />
        <StatCard label="Facturas por cobrar" value={dashboard.pending_invoices} />
      </div>

      <section aria-labelledby="mis-pacientes" className="rounded-[1.75rem] bg-white p-6 shadow-xl shadow-navy-900/5 md:p-8">
        <h2 id="mis-pacientes" className="display text-2xl text-navy-900">Mis pacientes</h2>
        {patients.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              title="Mis pacientes"
              text="Aún no tienes pacientes. Revisa las solicitudes abiertas."
              action={{ label: 'Ver solicitudes', to: '/nutri/solicitudes' }}
            />
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100">
            {patients.map((p) => <PatientRow key={p.patient_id} p={p} />)}
          </ul>
        )}
      </section>

      <div className="flex justify-start">
        <Button variant="ghost" onClick={state.reload}>Actualizar</Button>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <PhaseGate phase={2} title="Panel del nutricionista" back={{ to: '/', label: 'Ir al inicio' }}>
      <NutriShell title="Tablero">
        <TableroContent />
      </NutriShell>
    </PhaseGate>
  );
}

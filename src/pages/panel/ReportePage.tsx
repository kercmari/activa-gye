/**
 * Reporte de progreso para imprimir o guardar como PDF (fase 3).
 * «Descargar PDF» abre el diálogo de impresión; el usuario elige «Guardar como PDF».
 */
import '../../print.css';
import { useAuth } from '../../auth/AuthContext';
import PhaseGate from '../../components/PhaseGate';
import { SEX_LABELS, addDaysISO, ageFrom, formatDateLong, todayISO } from '../../components/profile/labels';
import { useAsync } from '../../components/profile/useAsync';
import { repo, type Followup, type NutritionistPublic, type PatientIntake, type PlanDay, type ProgressEntry } from '../../data';
import { LinkButton, Button } from '../../components/ui/Button';
import { ErrorState, Loading } from '../../components/ui/States';

interface ReportData {
  intake: PatientIntake | null;
  progress: ProgressEntry[];
  followups: Followup[];
  days: PlanDay[];
  nutritionist: NutritionistPublic | null;
}

/** Carga todo lo del reporte. Calendario: últimos 30 días, hoy incluido. */
async function loadReport(userId: string): Promise<ReportData> {
  const today = todayISO();
  const [intake, progress, followups, days, nutritionist] = await Promise.all([
    repo.getMyIntake(),
    repo.listProgress(),
    repo.listFollowups(userId),
    repo.listPlanDays(userId, addDaysISO(today, -29), today),
    repo.getMyNutritionist(),
  ]);
  return { intake, progress, followups, days, nutritionist };
}

const fmtNum = (n: number, digits = 1) =>
  n.toLocaleString('es-EC', { minimumFractionDigits: digits, maximumFractionDigits: digits });

function bmiOf(intake: PatientIntake): number {
  const m = intake.height_cm / 100;
  return intake.weight_kg / (m * m);
}

function Reporte() {
  const { session } = useAuth();
  const userId = session?.user.id ?? '';
  const data = useAsync(() => loadReport(userId), [userId]);

  if (!session) {
    return <p className="py-16 text-center text-slate-600">Inicia sesión para ver tu reporte.</p>;
  }

  const profile = session.profile;
  const actions = (
    <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3">
      <LinkButton to="/mi-panel" variant="secondary">Volver a mi panel</LinkButton>
      {data.status === 'ok' ? (
        <Button variant="primary" onClick={() => window.print()}>Descargar PDF</Button>
      ) : null}
    </div>
  );

  if (data.status === 'loading') return <><div className="no-print">{actions}</div><Loading text="Preparando tu reporte…" /></>;
  if (data.status === 'error') {
    return (
      <>
        {actions}
        <ErrorState message={data.message} onRetry={data.reload} />
      </>
    );
  }

  const { intake, progress, followups, days, nutritionist } = data.data;
  const done = days.filter((d) => d.done_at).length;
  const total = days.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const weights = progress.filter((p) => p.weight_kg != null);

  return (
    <>
      {actions}
      <article className="print-card mx-auto max-w-3xl rounded-[1.75rem] bg-white p-6 shadow-xl shadow-navy-900/5 md:p-10">
        <header className="flex items-center gap-4 border-b border-slate-200 pb-6">
          <img src="/img/logo-512.png" alt="Activa GYE" className="h-14 w-14 object-contain" />
          <div>
            <h1 className="display text-2xl text-navy-900 md:text-3xl">Reporte de progreso — Activa GYE</h1>
            <p className="mt-1 text-sm text-slate-600">Fecha: {formatDateLong(todayISO())}</p>
          </div>
        </header>

        <section className="mt-6" aria-labelledby="rep-datos">
          <h2 id="rep-datos" className="eyebrow text-brand-orange">Datos del paciente</h2>
          <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
            <div><dt className="font-bold text-slate-500">Nombre</dt><dd className="text-navy-900">{profile.full_name}</dd></div>
            <div>
              <dt className="font-bold text-slate-500">Edad</dt>
              <dd className="text-navy-900">{profile.birth_date ? `${ageFrom(profile.birth_date)} años` : '—'}</dd>
            </div>
            <div><dt className="font-bold text-slate-500">Sexo</dt><dd className="text-navy-900">{profile.sex ? SEX_LABELS[profile.sex] : '—'}</dd></div>
          </dl>
        </section>

        <section className="mt-6" aria-labelledby="rep-ficha">
          <h2 id="rep-ficha" className="eyebrow text-brand-orange">Ficha inicial</h2>
          {intake ? (
            <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
              <div><dt className="font-bold text-slate-500">Peso</dt><dd className="text-navy-900">{fmtNum(intake.weight_kg)} kg</dd></div>
              <div><dt className="font-bold text-slate-500">Estatura</dt><dd className="text-navy-900">{intake.height_cm} cm</dd></div>
              <div><dt className="font-bold text-slate-500">IMC</dt><dd className="text-navy-900">{fmtNum(bmiOf(intake))}</dd></div>
            </dl>
          ) : (
            <p className="mt-3 text-sm text-slate-600">Aún no tienes ficha inicial.</p>
          )}
        </section>

        <section className="mt-6" aria-labelledby="rep-nutri">
          <h2 id="rep-nutri" className="eyebrow text-brand-orange">Nutricionista</h2>
          <p className="mt-3 text-sm text-navy-900">
            {nutritionist ? nutritionist.full_name : 'Sin nutricionista asignado.'}
          </p>
        </section>

        <section className="mt-6" aria-labelledby="rep-cal">
          <h2 id="rep-cal" className="eyebrow text-brand-orange">Calendario (últimos 30 días)</h2>
          <p className="mt-3 text-sm text-navy-900">
            {total > 0
              ? `Cumplidos ${done} de ${total} días (${pct} %).`
              : 'No hay días en el calendario durante los últimos 30 días.'}
          </p>
        </section>

        <section className="mt-6" aria-labelledby="rep-seg">
          <h2 id="rep-seg" className="eyebrow text-brand-orange">Seguimientos</h2>
          {followups.length === 0 ? (
            <p className="mt-3 text-sm text-slate-600">Sin seguimientos registrados.</p>
          ) : (
            <ul className="mt-3 space-y-3 text-sm">
              {followups.map((f) => (
                <li key={f.id} className="rounded-xl border border-slate-200 p-4">
                  <p className="font-bold text-navy-900">
                    {formatDateLong(f.followup_date)}
                    {f.weight_kg != null ? ` · ${fmtNum(f.weight_kg)} kg` : ''}
                  </p>
                  {f.recommendations ? <p className="mt-2 whitespace-pre-line text-slate-700">{f.recommendations}</p> : null}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-6" aria-labelledby="rep-peso">
          <h2 id="rep-peso" className="eyebrow text-brand-orange">Registro de peso</h2>
          {weights.length === 0 ? (
            <p className="mt-3 text-sm text-slate-600">Sin registros de peso.</p>
          ) : (
            <table className="mt-3 w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th scope="col" className="py-2 font-bold">Fecha</th>
                  <th scope="col" className="py-2 font-bold">Peso (kg)</th>
                </tr>
              </thead>
              <tbody>
                {weights.map((p) => (
                  <tr key={p.id} className="border-b border-slate-100">
                    <td className="py-2 text-navy-900">{formatDateLong(p.entry_date)}</td>
                    <td className="py-2 text-navy-900">{fmtNum(p.weight_kg ?? 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </article>
    </>
  );
}

export default function ReportePage() {
  return (
    <section className="bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-8 md:py-12">
        <PhaseGate phase={3} title="Reporte de progreso" back={{ to: '/mi-panel', label: 'Volver a mi panel' }}>
          <Reporte />
        </PhaseGate>
      </div>
    </section>
  );
}

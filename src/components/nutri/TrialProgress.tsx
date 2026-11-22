import { Check, Lock } from 'lucide-react';
import { repo, type DailyCheckin, type HealthCondition, type PatientIntake, type Trial, type TrialDay } from '../../data';
import { formatDateLong } from '../profile/labels';
import { useAsync } from '../profile/useAsync';
import Badge from '../ui/Badge';
import { EmptyState, ErrorState, Loading } from '../ui/States';

const CONDITION_LABELS: Record<HealthCondition, string> = {
  diabetes: 'Diabetes',
  hipertension: 'Hipertensión',
  embarazo: 'Embarazo',
  renal: 'Enfermedad renal',
  otra: 'Otra condición',
};

const MOOD_LABELS = ['', 'Muy mal', 'Mal', 'Regular', 'Bien', 'Muy bien'];

interface TrialData {
  trial: Trial | null;
  checkins: DailyCheckin[];
  intake: PatientIntake | null;
}

/** Carga la semana, los chequeos y la ficha. Es async para que un fallo síncrono también caiga en el estado de error. */
async function loadTrial(patientId: string): Promise<TrialData> {
  const [trial, checkins, detail] = await Promise.all([
    repo.getPatientTrial(patientId),
    repo.listCheckins(patientId, 30),
    repo.getPatientDetail(patientId),
  ]);
  return { trial, checkins, intake: detail?.intake ?? null };
}

/** Bloque de la ficha del paciente: su semana gratis (7 días), chequeos recientes y alergias. */
export default function TrialProgress({ patientId }: { patientId: string }) {
  const state = useAsync(() => loadTrial(patientId), [patientId]);

  if (state.status === 'loading') return <Loading text="Cargando semana gratis…" />;
  if (state.status === 'error') return <ErrorState message={state.message} onRetry={state.reload} />;

  const { trial, checkins, intake } = state.data;
  if (!trial) {
    return (
      <EmptyState
        title="Semana gratis y chequeos"
        text="Este paciente no tiene semana gratis."
      />
    );
  }

  const recientes = [...checkins].reverse().slice(0, 7);
  const conditions = intake?.conditions ?? [];
  const allergies = intake?.allergies?.trim() ?? '';

  return (
    <section aria-labelledby="semana-gratis-titulo" className="space-y-6 rounded-[1.75rem] bg-white p-6 shadow-xl shadow-navy-900/5 md:p-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 id="semana-gratis-titulo" className="display text-2xl text-navy-900">Semana gratis y chequeos</h2>
          <p className="mt-1 font-bold text-navy-900">{trial.template_name}</p>
          <p className="text-sm text-slate-600">Plantilla de {trial.author_name} · Inicio {formatDateLong(trial.started_on)}</p>
          <p className="text-sm text-slate-600">Objetivo: {trial.kcal_target} kcal/día</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {trial.template_status === 'borrador' ? <Badge tone="orange">Borrador</Badge> : null}
          {trial.finished ? <Badge tone="green">Semana completada</Badge> : null}
        </div>
      </div>

      {trial.template_status === 'borrador' ? (
        <p className="rounded-2xl bg-orange-50 p-4 text-sm font-semibold text-brand-orange-dark">
          Plan de muestra pendiente de revisión por una nutricionista.
        </p>
      ) : null}

      <div>
        <h3 className="font-extrabold text-navy-900">Días</h3>
        <ol className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-7" aria-label="Días de la semana gratis">
          {trial.days.map((day) => (
            <li key={day.day_number}>
              <DayCell day={day} />
            </li>
          ))}
        </ol>
      </div>

      <div>
        <h3 className="font-extrabold text-navy-900">Alergias y condiciones</h3>
        {allergies || conditions.length > 0 ? (
          <ul className="mt-2 space-y-2 text-sm text-slate-700">
            {allergies ? <li><span className="font-bold">Alergias o comidas que no come:</span> {allergies}</li> : null}
            {conditions.length > 0 ? (
              <li><span className="font-bold">Condiciones:</span> {conditions.map((c) => CONDITION_LABELS[c]).join(', ')}</li>
            ) : null}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-slate-600">Sin alergias ni condiciones registradas.</p>
        )}
      </div>

      <div>
        <h3 className="font-extrabold text-navy-900">Últimos chequeos</h3>
        {recientes.length === 0 ? (
          <p className="mt-2 text-sm text-slate-600">Todavía no hay chequeos.</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100">
            {recientes.map((c) => (
              <li key={c.id} className="flex flex-col gap-1 py-3 text-sm text-slate-700 md:flex-row md:items-start md:justify-between">
                <span className="font-bold text-navy-900">{formatDateLong(c.checkin_date)}</span>
                <span>Ánimo: {MOOD_LABELS[c.mood] ?? c.mood}/5</span>
                <span>Peso: {c.weight_kg != null ? `${c.weight_kg} kg` : '—'}</span>
                <span>Agua: {c.water_glasses != null ? `${c.water_glasses} vasos` : '—'}</span>
                {c.note ? <span className="text-slate-600 md:basis-full">Nota: {c.note}</span> : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function DayCell({ day }: { day: TrialDay }) {
  if (day.completed_at) {
    return (
      <div className="flex h-full flex-col items-center gap-1 rounded-2xl bg-emerald-50 p-3 text-emerald-700" aria-label={`Día ${day.day_number}: completado`}>
        <Check className="size-5" aria-hidden="true" />
        <span className="text-xs font-bold">Día {day.day_number}</span>
        <span className="text-[11px]">{day.items_done}/{day.items_total}</span>
      </div>
    );
  }
  if (day.unlocked) {
    return (
      <div className="flex h-full flex-col items-center gap-1 rounded-2xl bg-orange-50 p-3 text-brand-orange-dark" aria-label={`Día ${day.day_number}: abierto`}>
        <span className="text-xs font-bold">Día {day.day_number}</span>
        <span className="text-[11px]">Abierto</span>
        <span className="text-[11px]">{day.items_done}/{day.items_total}</span>
      </div>
    );
  }
  return (
    <div className="flex h-full flex-col items-center gap-1 rounded-2xl bg-slate-100 p-3 text-slate-500" aria-label={`Día ${day.day_number}: cerrado`}>
      <Lock className="size-5" aria-hidden="true" />
      <span className="text-xs font-bold">Día {day.day_number}</span>
      <span className="text-[11px]">{day.items_done}/{day.items_total}</span>
    </div>
  );
}

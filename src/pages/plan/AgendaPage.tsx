/** Agenda estilo Base Vital: mes a la izquierda, actividades del día a la derecha. Días 8+ requieren suscripción. */
import { useState } from 'react';
import { Lock } from 'lucide-react';
import { repo, type PlanDay, type Trial, type TrialDay, type TrialItem } from '../../data';
import { useAuth } from '../../auth/AuthContext';
import { usePhase } from '../../auth/SettingsContext';
import { useTrial } from '../../components/plan/useTrial';
import MonthCalendar from '../../components/plan/MonthCalendar';
import DayActivities from '../../components/plan/DayActivities';
import Paywall from '../../components/plan/Paywall';
import PageHeader from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { EmptyState, ErrorState, Loading, errorMessage } from '../../components/ui/States';
import { useAsync } from '../../components/profile/useAsync';

const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DAY_MS = 86_400_000;

function fromIso(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function toIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(s: string, n: number): string {
  return toIso(new Date(fromIso(s).getTime() + n * DAY_MS));
}

function longDate(s: string): string {
  const d = fromIso(s);
  return `${DIAS_SEMANA[(d.getUTCDay() + 6) % 7]}, ${d.getUTCDate()} de ${MESES[d.getUTCMonth()]} de ${d.getUTCFullYear()}`;
}

/** Hoy en Guayaquil, como 'AAAA-MM-DD'. Solo se usa si todavía no hay semana cargada. */
function todayGuayaquil(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Guayaquil', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

/** Último día del mes `key` ('AAAA-MM'). */
function lastDayOf(key: string): string {
  const [y, m] = key.split('-').map(Number);
  return toIso(new Date(Date.UTC(y, m, 0)));
}

interface Entry { day: TrialDay; date: string }

/** Fecha de cada día de la semana: `unlocked_on` si existe; si no, el día anterior + 1 (proyección). */
function trialEntries(trial: Trial): Entry[] {
  const entries: Entry[] = [];
  for (const d of trial.days) {
    const prev = entries[entries.length - 1]?.date;
    entries.push({ day: d, date: d.unlocked_on ?? (prev ? addDays(prev, 1) : trial.today) });
  }
  return entries;
}

export default function AgendaPage() {
  const { session } = useAuth();
  const phase2 = usePhase(2);
  const tr = useTrial();
  const serverTrial = !tr.loading && !tr.error ? tr.trial : null;

  // Copia local tras marcar un ítem; se descarta sola cuando llega una semana nueva del servidor.
  const [edited, setEdited] = useState<{ base: Trial | null; trial: Trial } | null>(null);
  const trial = edited && edited.base === serverTrial ? edited.trial : serverTrial;

  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [viewKey, setViewKey] = useState<string | null>(null);

  const today = trial?.today ?? todayGuayaquil();
  const selected = picked ?? today;
  const monthKey = viewKey ?? today.slice(0, 7);
  const [year, month] = monthKey.split('-').map(Number);

  const sub = useAsync(() => (phase2 ? repo.getMyPatientSubscription() : Promise.resolve(null)), [phase2]);
  const subActive = sub.status === 'ok' && sub.data?.status === 'activa';
  const myId = session?.user.id ?? null;
  const planDays = useAsync<PlanDay[]>(
    () => (phase2 && subActive && myId ? repo.listPlanDays(myId, `${monthKey}-01`, lastDayOf(monthKey)) : Promise.resolve([])),
    [phase2, subActive, myId, monthKey],
  );

  const entries = trial ? trialEntries(trial) : [];
  const lastTrialDate = entries[entries.length - 1]?.date;
  const planByDate = new Map<string, PlanDay>();
  if (planDays.status === 'ok') for (const p of planDays.data) planByDate.set(p.day, p);

  const dotDates = new Set<string>();
  const lockedDates = new Set<string>();
  for (const e of entries) {
    if (!e.day.unlocked) lockedDates.add(e.date);
    if (e.day.items_total > 0) dotDates.add(e.date);
  }
  for (const date of planByDate.keys()) dotDates.add(date);

  const entry = entries.find((e) => e.date === selected);
  const plan = planByDate.get(selected);
  const openItems: TrialItem[] = entry && entry.day.unlocked
    ? [...entry.day.items].sort((a, b) => a.at_time.localeCompare(b.at_time))
    : [];
  const count = openItems.length > 0 ? openItems.length : plan ? 1 : 0;

  async function toggle(item: TrialItem) {
    if (!serverTrial) return;
    setBusyId(item.id);
    setActionError(null);
    try {
      const next = await repo.setTrialItemDone(item.id, !item.done);
      setEdited({ base: serverTrial, trial: next });
    } catch (e) {
      setActionError(errorMessage(e));
    } finally {
      setBusyId(null);
    }
  }

  function goToday() {
    setPicked(null);
    setViewKey(null);
  }

  function shiftMonth(delta: number) {
    const d = fromIso(`${monthKey}-01`);
    d.setUTCMonth(d.getUTCMonth() + delta);
    setViewKey(toIso(d).slice(0, 7));
  }

  function renderDay() {
    if (!trial) {
      if (plan) return <PlanDayCard plan={plan} />;
      return (
        <EmptyState
          title="Aún no tienes tu semana gratis"
          text="Completa tu ficha y genera tu semana gratis desde Hoy."
          action={{ label: 'Ir a Hoy', to: '/mi-plan/hoy' }}
        />
      );
    }
    if (entry) {
      if (!entry.day.unlocked) {
        return (
          <div className="flex items-start gap-3 rounded-2xl bg-slate-100 p-5 text-slate-700">
            <Lock className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <p className="font-semibold">Este día se abre cuando completes el anterior</p>
          </div>
        );
      }
      return <DayActivities items={openItems} busyId={busyId} onToggle={(item) => void toggle(item)} />;
    }
    if (plan) return <PlanDayCard plan={plan} />;
    if (lastTrialDate && selected > lastTrialDate) {
      if (phase2 && sub.status === 'loading') return <Loading text="Revisando tu suscripción…" />;
      if (phase2 && sub.status === 'error') return <ErrorState message={sub.message} onRetry={sub.reload} />;
      if (subActive) {
        if (planDays.status === 'loading') return <Loading text="Cargando tu plan…" />;
        if (planDays.status === 'error') return <ErrorState message={planDays.message} onRetry={planDays.reload} />;
        return <p className="text-slate-500">Tu nutricionista aún no ha cargado el plan de este día.</p>;
      }
      // Con la fase 2 apagada no se muestra ni botón ni anuncio de la suscripción.
      if (!phase2) return <p className="rounded-2xl bg-slate-100 p-5 text-slate-700">Tu semana gratis terminó en el día 7.</p>;
      return <Paywall phase2On={phase2} />;
    }
    return <DayActivities items={[]} busyId={null} onToggle={() => undefined} />;
  }

  return (
    <>
      <PageHeader eyebrow="Mi plan" title="Agenda" back={false}>
        <div className="mt-6">
          <Button variant="secondary" onDark onClick={goToday}>Volver a hoy</Button>
        </div>
      </PageHeader>

      <section className="mx-auto max-w-6xl px-4 py-8">
        {tr.loading ? (
          <Loading text="Cargando tu agenda…" />
        ) : tr.error ? (
          <ErrorState message={tr.error} onRetry={() => void tr.reload()} />
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-[1.75rem] bg-white p-6 shadow-xl shadow-navy-900/5">
              <h2 className="display text-2xl text-navy-900">Planificación diaria</h2>
              <div className="mt-5">
                <MonthCalendar
                  year={year}
                  month={month}
                  selected={selected}
                  today={today}
                  dotDates={dotDates}
                  lockedDates={lockedDates}
                  onSelect={setPicked}
                  onPrev={() => shiftMonth(-1)}
                  onNext={() => shiftMonth(1)}
                />
              </div>
            </div>

            <div className="rounded-[1.75rem] bg-white p-6 shadow-xl shadow-navy-900/5">
              <p className="eyebrow text-brand-orange">Actividades del día</p>
              <h2 className="display mt-2 text-2xl text-navy-900">{longDate(selected)}</h2>
              <p className="mt-1 text-sm text-slate-500">{count} {count === 1 ? 'actividad' : 'actividades'}</p>
              {actionError ? <p role="alert" className="mt-4 text-sm font-semibold text-red-700">{actionError}</p> : null}
              <div className="mt-6">{renderDay()}</div>
            </div>
          </div>
        )}
      </section>
    </>
  );
}

function PlanDayCard({ plan }: { plan: PlanDay }) {
  return (
    <article className="space-y-4">
      <h3 className="text-lg font-bold text-navy-900">{plan.title}</h3>
      {plan.meals ? (
        <div>
          <p className="eyebrow text-brand-orange">Comidas</p>
          <p className="mt-1 whitespace-pre-line text-slate-700">{plan.meals}</p>
        </div>
      ) : null}
      {plan.exercise ? (
        <div>
          <p className="eyebrow text-brand-orange">Ejercicio</p>
          <p className="mt-1 whitespace-pre-line text-slate-700">{plan.exercise}</p>
        </div>
      ) : null}
    </article>
  );
}

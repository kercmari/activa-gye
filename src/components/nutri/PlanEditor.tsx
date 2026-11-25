import { useState } from 'react';
import { Copy } from 'lucide-react';
import { repo, type PlanDay, type Prescription } from '../../data';
import { addDays, formatDayLabel, isToday, mondayOf, weekDays } from '../../lib/dates';
import { useAsync } from '../profile/useAsync';
import Badge from '../ui/Badge';
import { Button } from '../ui/Button';
import { SelectField } from '../ui/Field';
import { ErrorState, Loading, errorMessage } from '../ui/States';

interface Notice {
  kind: 'ok' | 'error';
  text: string;
}

interface Props {
  patientId: string;
  /** Lleva a la pestaña Recetas: los días se crean dentro de una receta borrador. */
  onGoToRecipes?: () => void;
}

/**
 * Calendario del plan de un paciente (lunes a domingo). Muestra todos los días con la receta
 * a la que pertenecen. Crear días se hace dentro de una receta (pestaña Recetas).
 */
export default function PlanEditor({ patientId, onGoToRecipes }: Props) {
  const [monday, setMonday] = useState(() => mondayOf(new Date()));
  const [notice, setNotice] = useState<Notice | null>(null);
  const [copying, setCopying] = useState(false);
  const [copyTarget, setCopyTarget] = useState('');
  const prescriptions = useAsync<Prescription[]>(() => repo.listPrescriptions(patientId), [patientId]);

  const sunday = addDays(monday, 6);

  function goTo(next: string) {
    setNotice(null);
    setMonday(next);
  }

  const drafts = prescriptions.status === 'ok' ? prescriptions.data.filter((p) => p.status === 'borrador') : [];
  const target = drafts.some((p) => p.id === copyTarget) ? copyTarget : (drafts[0]?.id ?? '');

  async function copyToNextWeek() {
    if (!target) return;
    const next = addDays(monday, 7);
    setCopying(true);
    setNotice(null);
    try {
      const copied = await repo.copyPlanWeek(patientId, monday, next, target);
      setMonday(next);
      setNotice({ kind: 'ok', text: `Se copiaron ${copied} días.` });
    } catch (e) {
      setNotice({ kind: 'error', text: errorMessage(e) });
    } finally {
      setCopying(false);
    }
  }

  let copyBar;
  if (prescriptions.status === 'loading') {
    copyBar = <Loading text="Cargando recetas…" />;
  } else if (prescriptions.status === 'error') {
    copyBar = <ErrorState message={prescriptions.message} onRetry={prescriptions.reload} />;
  } else if (drafts.length === 0) {
    copyBar = (
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <p className="text-sm text-slate-600">Para copiar una semana, primero crea una receta borrador.</p>
        {onGoToRecipes ? <Button variant="secondary" size="md" onClick={onGoToRecipes}>Ir a Recetas</Button> : null}
      </div>
    );
  } else {
    copyBar = (
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1 sm:max-w-sm">
          <SelectField label="Receta borrador destino" value={target} onChange={(e) => setCopyTarget(e.target.value)}>
            {drafts.map((p) => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </SelectField>
        </div>
        <Button variant="blue" size="md" onClick={copyToNextWeek} disabled={copying || !target} iconRight={Copy}>
          {copying ? 'Copiando…' : 'Copiar esta semana a la siguiente'}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-[1.75rem] bg-white p-5 shadow-xl shadow-navy-900/5 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="eyebrow text-brand-orange">Semana</p>
          <p className="mt-1 font-extrabold text-navy-900">
            {formatDayLabel(monday)} – {formatDayLabel(sunday)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="md" onClick={() => goTo(addDays(monday, -7))}>‹ Semana anterior</Button>
          <Button variant="secondary" size="md" onClick={() => goTo(mondayOf(new Date()))}>Esta semana</Button>
          <Button variant="secondary" size="md" onClick={() => goTo(addDays(monday, 7))}>Semana siguiente ›</Button>
        </div>
      </div>

      <div className="space-y-3">
        {copyBar}
        {notice ? (
          <p
            role={notice.kind === 'error' ? 'alert' : 'status'}
            className={`text-sm font-bold ${notice.kind === 'error' ? 'text-red-600' : 'text-emerald-700'}`}
          >
            {notice.text}
          </p>
        ) : null}
      </div>

      <WeekPlan
        key={monday}
        patientId={patientId}
        monday={monday}
        titles={prescriptions.status === 'ok' ? new Map(prescriptions.data.map((p) => [p.id, p.title])) : new Map()}
        onGoToRecipes={onGoToRecipes}
      />
    </div>
  );
}

interface WeekPlanProps {
  patientId: string;
  monday: string;
  titles: Map<string, string>;
  onGoToRecipes?: () => void;
}

/** Los 7 días de una semana. Se monta de nuevo (key) al cambiar de semana. */
function WeekPlan({ patientId, monday, titles, onGoToRecipes }: WeekPlanProps) {
  const sunday = addDays(monday, 6);
  const plans = useAsync(() => repo.listPlanDays(patientId, monday, sunday), [patientId, monday]);

  if (plans.status === 'loading') return <Loading text="Cargando el plan de la semana…" />;
  if (plans.status === 'error') return <ErrorState message={plans.message} onRetry={plans.reload} />;

  const byDay = new Map<string, PlanDay>(plans.data.map((p) => [p.day, p]));
  const doneCount = weekDays(monday).filter((d) => byDay.get(d)?.done_at).length;

  return (
    <section aria-label="Días de la semana" className="space-y-6">
      <p className="text-lg font-extrabold text-navy-900">
        {doneCount} de 7 días cumplidos esta semana
      </p>

      <ol className="grid gap-4">
        {weekDays(monday).map((day) => {
          const plan = byDay.get(day);
          return (
            <li key={day} className="rounded-[1.75rem] bg-white p-6 shadow-xl shadow-navy-900/5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="display text-xl text-navy-900">{formatDayLabel(day)}</h3>
                {isToday(day) ? <Badge tone="orange">Hoy</Badge> : null}
              </div>

              {plan ? (
                <div className="mt-4 space-y-3">
                  <p className="font-extrabold text-navy-900">{plan.title}</p>
                  <p className="text-sm text-slate-500">
                    {plan.prescription_id
                      ? `Receta: ${titles.get(plan.prescription_id) ?? 'sin título'}`
                      : 'Día anterior a las recetas'}
                  </p>
                  {plan.meals ? <p className="whitespace-pre-line text-sm text-slate-600"><span className="font-bold">Comidas:</span> {plan.meals}</p> : null}
                  {plan.exercise ? <p className="whitespace-pre-line text-sm text-slate-600"><span className="font-bold">Ejercicio:</span> {plan.exercise}</p> : null}
                  {plan.notes ? <p className="whitespace-pre-line text-sm text-slate-600"><span className="font-bold">Notas:</span> {plan.notes}</p> : null}
                  <div>
                    {plan.done_at ? (
                      <>
                        <Badge tone="green">✓ Cumplido</Badge>
                        {plan.patient_note ? (
                          <p className="mt-2 text-sm text-slate-600">Nota del paciente: {plan.patient_note}</p>
                        ) : null}
                      </>
                    ) : (
                      <Badge tone="slate">Pendiente</Badge>
                    )}
                  </div>
                </div>
              ) : (
                <div className="mt-4 space-y-4">
                  <p className="text-sm text-slate-500">Sin plan para este día.</p>
                  {onGoToRecipes ? (
                    <Button variant="secondary" size="md" onClick={onGoToRecipes}>Agregar en una receta</Button>
                  ) : null}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

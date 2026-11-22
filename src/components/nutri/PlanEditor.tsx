import { useState, type FormEvent } from 'react';
import { Copy, Pencil, Plus, Trash2 } from 'lucide-react';
import { repo, type PlanDay } from '../../data';
import { addDays, formatDayLabel, isToday, mondayOf, weekDays } from '../../lib/dates';
import ConfirmDialog from '../profile/ConfirmDialog';
import { useAsync } from '../profile/useAsync';
import Badge from '../ui/Badge';
import { Button } from '../ui/Button';
import { TextArea, TextField } from '../ui/Field';
import { ErrorState, Loading, errorMessage } from '../ui/States';

interface Draft {
  day: string;
  id?: string;
  title: string;
  meals: string;
  exercise: string;
  notes: string;
}

interface Notice {
  kind: 'ok' | 'error';
  text: string;
}

const TITLE_MIN = 2;
const TITLE_MAX = 120;

/** Vacío → null (la base guarda null, no cadenas vacías). */
function orNull(text: string): string | null {
  const t = text.trim();
  return t.length > 0 ? t : null;
}

/** Editor semanal del calendario del plan de un paciente (lunes a domingo). */
export default function PlanEditor({ patientId }: { patientId: string }) {
  const [monday, setMonday] = useState(() => mondayOf(new Date()));
  const [notice, setNotice] = useState<Notice | null>(null);
  const [copying, setCopying] = useState(false);

  const sunday = addDays(monday, 6);

  function goTo(next: string) {
    setNotice(null);
    setMonday(next);
  }

  async function copyToNextWeek() {
    const next = addDays(monday, 7);
    setCopying(true);
    setNotice(null);
    try {
      const copied = await repo.copyPlanWeek(patientId, monday, next);
      setMonday(next);
      setNotice({ kind: 'ok', text: `Se copiaron ${copied} días.` });
    } catch (e) {
      setNotice({ kind: 'error', text: errorMessage(e) });
    } finally {
      setCopying(false);
    }
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

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button variant="blue" size="md" onClick={copyToNextWeek} disabled={copying} iconRight={Copy}>
          {copying ? 'Copiando…' : 'Copiar esta semana a la siguiente'}
        </Button>
        {notice ? (
          <p
            role={notice.kind === 'error' ? 'alert' : 'status'}
            className={`text-sm font-bold ${notice.kind === 'error' ? 'text-red-600' : 'text-emerald-700'}`}
          >
            {notice.text}
          </p>
        ) : null}
      </div>

      <WeekPlan key={monday} patientId={patientId} monday={monday} />
    </div>
  );
}

interface WeekPlanProps {
  patientId: string;
  monday: string;
}

/** Los 7 días de una semana. Se monta de nuevo (key) al cambiar de semana. */
function WeekPlan({ patientId, monday }: WeekPlanProps) {
  const sunday = addDays(monday, 6);
  const plans = useAsync(() => repo.listPlanDays(patientId, monday, sunday), [patientId, monday]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<PlanDay | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  if (plans.status === 'loading') return <Loading text="Cargando el plan de la semana…" />;
  if (plans.status === 'error') return <ErrorState message={plans.message} onRetry={plans.reload} />;

  const byDay = new Map(plans.data.map((p) => [p.day, p]));
  const doneCount = weekDays(monday).filter((d) => byDay.get(d)?.done_at).length;

  function openDraft(day: string, plan: PlanDay | undefined) {
    setDeleteError(null);
    setDraftError(null);
    setDraft({
      day,
      id: plan?.id,
      title: plan?.title ?? '',
      meals: plan?.meals ?? '',
      exercise: plan?.exercise ?? '',
      notes: plan?.notes ?? '',
    });
  }

  function patchDraft(patch: Partial<Draft>) {
    setDraft((d) => (d ? { ...d, ...patch } : d));
  }

  async function saveDraft(e: FormEvent) {
    e.preventDefault();
    if (!draft) return;
    const title = draft.title.trim();
    if (title.length < TITLE_MIN || title.length > TITLE_MAX) {
      setDraftError(`El título debe tener entre ${TITLE_MIN} y ${TITLE_MAX} caracteres.`);
      return;
    }
    setSaving(true);
    setDraftError(null);
    try {
      await repo.savePlanDay(patientId, {
        ...(draft.id ? { id: draft.id } : {}),
        day: draft.day,
        title,
        meals: orNull(draft.meals),
        exercise: orNull(draft.exercise),
        notes: orNull(draft.notes),
      });
      setDraft(null);
      plans.reload();
    } catch (err) {
      setDraftError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await repo.deletePlanDay(toDelete.id);
      setToDelete(null);
      plans.reload();
    } catch (err) {
      setDeleteError(errorMessage(err));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <section aria-label="Días de la semana" className="space-y-6">
      <p className="text-lg font-extrabold text-navy-900">
        {doneCount} de 7 días cumplidos esta semana
      </p>

      {draft ? (
        <form
          onSubmit={saveDraft}
          aria-labelledby="plan-form-title"
          className="space-y-5 rounded-[1.75rem] bg-white p-6 shadow-xl shadow-navy-900/5 md:p-8"
        >
          <h2 id="plan-form-title" className="display text-2xl text-navy-900">
            Plan de {formatDayLabel(draft.day)}
          </h2>
          <TextField
            label="Título"
            value={draft.title}
            maxLength={TITLE_MAX}
            onChange={(e) => patchDraft({ title: e.target.value })}
            error={draftError ?? undefined}
          />
          <TextArea label="Comidas" rows={3} value={draft.meals} onChange={(e) => patchDraft({ meals: e.target.value })} />
          <TextArea label="Ejercicio" rows={3} value={draft.exercise} onChange={(e) => patchDraft({ exercise: e.target.value })} />
          <TextArea label="Notas" rows={3} value={draft.notes} onChange={(e) => patchDraft({ notes: e.target.value })} />
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={() => setDraft(null)} disabled={saving}>Cancelar</Button>
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar'}
            </Button>
          </div>
        </form>
      ) : null}

      {deleteError ? (
        <p role="alert" className="font-bold text-red-600">{deleteError}</p>
      ) : null}

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
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button variant="secondary" size="md" iconRight={Pencil} onClick={() => openDraft(day, plan)}>Editar</Button>
                    <Button variant="ghost" size="md" iconRight={Trash2} onClick={() => { setDeleteError(null); setToDelete(plan); }}>Borrar</Button>
                  </div>
                </div>
              ) : (
                <div className="mt-4 space-y-4">
                  <p className="text-sm text-slate-500">Sin plan para este día.</p>
                  <Button variant="primary" size="md" iconRight={Plus} onClick={() => openDraft(day, undefined)}>Agregar plan</Button>
                </div>
              )}
            </li>
          );
        })}
      </ol>

      {toDelete ? (
        <ConfirmDialog
          title="¿Borrar este día del plan?"
          text={`Se borrará el plan de ${formatDayLabel(toDelete.day)}: «${toDelete.title}».`}
          confirmLabel="Borrar"
          busy={deleting}
          onConfirm={confirmDelete}
          onCancel={() => setToDelete(null)}
        />
      ) : null}
    </section>
  );
}

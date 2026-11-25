import { useState, type FormEvent } from 'react';
import { repo, type CareOrigin, type PlanDay, type Prescription, type PrescriptionKind } from '../../data';
import { addDays, formatDayLabel, toISODate } from '../../lib/dates';
import ConfirmDialog from '../profile/ConfirmDialog';
import { useAsync } from '../profile/useAsync';
import Badge from '../ui/Badge';
import { Button } from '../ui/Button';
import { SelectField, TextArea, TextField } from '../ui/Field';
import { ErrorState, Loading, errorMessage } from '../ui/States';

const KIND_LABELS: Record<PrescriptionKind, string> = {
  dieta: 'Dieta',
  rutina: 'Rutina',
  recomendacion: 'Recomendación',
};

const TITLE_MIN = 2;
const TITLE_MAX = 120;
const BODY_MAX = 4000;
/** Ventana de días que se revisan para no elegir un día ocupado. */
const DAYS_BEFORE = 30;
const DAYS_AFTER = 365;

const SIN_RECETAS_TEXT =
  'Este paciente ya usó sus 10 recetas del mes. Podrá recibir más cuando renueve su suscripción.';

interface Notice {
  kind: 'ok' | 'error';
  text: string;
}

interface DayDraft {
  day: string;
  title: string;
  meals: string;
  exercise: string;
  notes: string;
}

const EMPTY_DAY: DayDraft = { day: '', title: '', meals: '', exercise: '', notes: '' };

/** Vacío → null (la base guarda null, no cadenas vacías). */
function orNull(text: string): string | null {
  const t = text.trim();
  return t.length > 0 ? t : null;
}

function validateTitle(title: string): string | null {
  const t = title.trim();
  if (t.length < TITLE_MIN || t.length > TITLE_MAX) {
    return `El título debe tener entre ${TITLE_MIN} y ${TITLE_MAX} caracteres.`;
  }
  return null;
}

interface Props {
  patientId: string;
  origin: CareOrigin;
  /** null = receta nueva. */
  prescription: Prescription | null;
  onBack: () => void;
  /** Se llama cuando cambia algo que muestra la lista (guardar, borrar, entregar, días). */
  onChanged: () => void;
}

/** Editor de una receta: encabezado (tipo, título, texto) y sus días. Entregada = solo lectura. */
export default function RecetaEditor({ patientId, origin, prescription, onBack, onChanged }: Props) {
  const [saved, setSaved] = useState<Prescription | null>(prescription);
  const [kind, setKind] = useState<PrescriptionKind>(prescription?.kind ?? 'dieta');
  const [title, setTitle] = useState(prescription?.title ?? '');
  const [body, setBody] = useState(prescription?.body ?? '');
  const [titleError, setTitleError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  const [today] = useState(() => toISODate(new Date()));
  const days = useAsync<PlanDay[]>(
    () => repo.listPlanDays(patientId, addDays(today, -DAYS_BEFORE), addDays(today, DAYS_AFTER)),
    [patientId, today],
  );

  const [dayDraft, setDayDraft] = useState<DayDraft>(EMPTY_DAY);
  const [dayError, setDayError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const [confirmingDeliver, setConfirmingDeliver] = useState(false);
  const [deliverText, setDeliverText] = useState('');
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const locked = saved?.status === 'entregada';
  const myDays = days.status === 'ok' && saved ? days.data.filter((d) => d.prescription_id === saved.id) : [];

  /** Guarda el encabezado (crea o edita borrador). Devuelve la receta o null si no pasa la validación. */
  async function saveHeader(): Promise<Prescription | null> {
    const err = validateTitle(title);
    if (err) {
      setTitleError(err);
      return null;
    }
    if (body.length > BODY_MAX) {
      setNotice({ kind: 'error', text: `El texto de la receta no puede pasar de ${BODY_MAX} caracteres.` });
      return null;
    }
    setTitleError(null);
    const row = await repo.savePrescription({
      ...(saved ? { id: saved.id } : {}),
      patient_id: patientId,
      kind,
      title: title.trim(),
      body: body.trim(),
    });
    setSaved(row);
    return row;
  }

  async function onSubmitHeader(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setNotice(null);
    try {
      const row = await saveHeader();
      if (row) {
        setNotice({ kind: 'ok', text: 'Borrador guardado.' });
        onChanged();
      }
    } catch (err) {
      setNotice({ kind: 'error', text: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  }

  async function addDay(e: FormEvent) {
    e.preventDefault();
    setDayError(null);
    setNotice(null);
    if (!dayDraft.day) {
      setDayError('Elige la fecha del día.');
      return;
    }
    const titleErr = validateTitle(dayDraft.title);
    if (titleErr) {
      setDayError(titleErr.replace('El título', 'El título del día'));
      return;
    }
    if (days.status !== 'ok') return;
    if (days.data.some((d) => d.day === dayDraft.day)) {
      setDayError('Ese día ya tiene una receta. Elige un día libre.');
      return;
    }
    setBusy(true);
    try {
      // Un día siempre va dentro de una receta: si aún no existe, se guarda el borrador primero.
      const row = saved ?? (await saveHeader());
      if (!row) return;
      setSaved(row);
      await repo.savePlanDay(patientId, {
        day: dayDraft.day,
        title: dayDraft.title.trim(),
        meals: orNull(dayDraft.meals),
        exercise: orNull(dayDraft.exercise),
        notes: orNull(dayDraft.notes),
        prescription_id: row.id,
      });
      setDayDraft(EMPTY_DAY);
      setNotice({ kind: 'ok', text: 'Día agregado a la receta.' });
      days.reload();
      onChanged();
    } catch (err) {
      setDayError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function removeDay(plan: PlanDay) {
    setRemovingId(plan.id);
    setNotice(null);
    try {
      await repo.deletePlanDay(plan.id);
      days.reload();
      onChanged();
    } catch (err) {
      setNotice({ kind: 'error', text: errorMessage(err) });
    } finally {
      setRemovingId(null);
    }
  }

  /** Antes de entregar: guarda el borrador y pide el saldo para mostrarlo en la confirmación. */
  async function openDeliver() {
    setBusy(true);
    setNotice(null);
    try {
      const row = saved ?? (await saveHeader());
      if (!row) return;
      setSaved(row);
      if (origin === 'propio') {
        setDeliverText('Paciente propio: no descuenta recetas. Al entregarla, la receta ya no se podrá editar.');
      } else {
        const balance = await repo.getRecipeBalance(patientId);
        if (balance.left <= 0) {
          setNotice({ kind: 'error', text: SIN_RECETAS_TEXT });
          return;
        }
        setDeliverText(
          `Usará 1 de tus recetas: le quedarán ${balance.left - 1}. Al entregarla, la receta ya no se podrá editar.`,
        );
      }
      setConfirmingDeliver(true);
    } catch (err) {
      setNotice({ kind: 'error', text: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  }

  async function deliver() {
    if (!saved) return;
    setBusy(true);
    try {
      const row = await repo.deliverPrescription(saved.id);
      setSaved(row);
      setConfirmingDeliver(false);
      setNotice({ kind: 'ok', text: 'Receta entregada. Sus días ya aparecen en el calendario del paciente.' });
      onChanged();
    } catch (err) {
      setConfirmingDeliver(false);
      setNotice({ kind: 'error', text: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  }

  async function deleteDraft() {
    if (!saved) return;
    setBusy(true);
    try {
      await repo.deletePrescription(saved.id);
      setConfirmingDelete(false);
      onChanged();
      onBack();
    } catch (err) {
      setConfirmingDelete(false);
      setNotice({ kind: 'error', text: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  }

  let dayList;
  if (days.status === 'loading') {
    dayList = <Loading text="Cargando días…" />;
  } else if (days.status === 'error') {
    dayList = <ErrorState message={days.message} onRetry={days.reload} />;
  } else if (!saved) {
    dayList = <p className="text-sm text-slate-500">Guarda la receta para agregarle días.</p>;
  } else if (myDays.length === 0) {
    dayList = <p className="text-sm text-slate-500">Esta receta aún no tiene días.</p>;
  } else {
    dayList = (
      <ol className="grid gap-3">
        {[...myDays]
          .sort((a, b) => a.day.localeCompare(b.day))
          .map((plan) => (
            <li key={plan.id} className="rounded-2xl bg-surface p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="font-extrabold text-navy-900">
                  {formatDayLabel(plan.day)} · {plan.title}
                </p>
                {!locked ? (
                  <Button variant="ghost" size="md" disabled={removingId === plan.id} onClick={() => removeDay(plan)}>
                    {removingId === plan.id ? 'Quitando…' : 'Quitar día'}
                  </Button>
                ) : null}
              </div>
              {plan.meals ? <p className="mt-2 whitespace-pre-line text-sm text-slate-600"><span className="font-bold">Comidas:</span> {plan.meals}</p> : null}
              {plan.exercise ? <p className="mt-1 whitespace-pre-line text-sm text-slate-600"><span className="font-bold">Ejercicio:</span> {plan.exercise}</p> : null}
              {plan.notes ? <p className="mt-1 whitespace-pre-line text-sm text-slate-600"><span className="font-bold">Notas:</span> {plan.notes}</p> : null}
            </li>
          ))}
      </ol>
    );
  }

  return (
    <section aria-labelledby="receta-titulo" className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="secondary" size="md" onClick={onBack}>‹ Volver a recetas</Button>
        {saved ? (
          <Badge tone={locked ? 'green' : 'orange'}>{locked ? 'Entregada' : 'Borrador'}</Badge>
        ) : null}
      </div>

      <h2 id="receta-titulo" className="display text-2xl text-navy-900">
        {!saved ? 'Nueva receta' : locked ? 'Receta entregada' : 'Editar receta borrador'}
      </h2>

      {notice ? (
        <p role={notice.kind === 'error' ? 'alert' : 'status'} className={`font-bold ${notice.kind === 'error' ? 'text-red-600' : 'text-emerald-700'}`}>
          {notice.text}
        </p>
      ) : null}

      <form onSubmit={onSubmitHeader} aria-label="Datos de la receta" className="space-y-5 rounded-[1.75rem] bg-white p-6 shadow-xl shadow-navy-900/5 md:p-8">
        <SelectField label="Tipo" value={kind} disabled={locked} onChange={(e) => setKind(e.target.value as PrescriptionKind)}>
          {(Object.keys(KIND_LABELS) as PrescriptionKind[]).map((k) => (
            <option key={k} value={k}>{KIND_LABELS[k]}</option>
          ))}
        </SelectField>
        <TextField
          label="Título"
          value={title}
          maxLength={TITLE_MAX}
          disabled={locked}
          onChange={(e) => setTitle(e.target.value)}
          error={titleError ?? undefined}
        />
        <TextArea
          label="Texto de la receta"
          rows={6}
          value={body}
          maxLength={BODY_MAX}
          disabled={locked}
          hint="Opcional. Indicaciones generales de la dieta, rutina o recomendación."
          onChange={(e) => setBody(e.target.value)}
        />
        {!locked ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-end">
            {saved ? (
              <Button variant="ghost" size="md" disabled={busy} onClick={() => setConfirmingDelete(true)}>Borrar borrador</Button>
            ) : null}
            <Button variant="secondary" size="md" type="submit" disabled={busy}>
              {busy ? 'Guardando…' : 'Guardar borrador'}
            </Button>
            <Button variant="blue" size="md" disabled={busy} onClick={openDeliver}>Entregar</Button>
          </div>
        ) : (
          <p className="text-sm text-slate-600">
            Entregada el {saved?.delivered_at ? new Date(saved.delivered_at).toLocaleDateString('es-EC') : 'sin fecha'}.
            {saved?.counts_against_patient ? ' Descontó 1 receta del paciente.' : ' Paciente propio: no descontó recetas.'}
          </p>
        )}
      </form>

      <section aria-labelledby="receta-dias-titulo" className="space-y-4 rounded-[1.75rem] bg-white p-6 shadow-xl shadow-navy-900/5 md:p-8">
        <h3 id="receta-dias-titulo" className="font-extrabold text-navy-900">Días de esta receta</h3>
        {dayList}

        {!locked ? (
          <form onSubmit={addDay} aria-label="Agregar día a la receta" className="space-y-4 border-t border-slate-100 pt-6">
            <h4 className="font-extrabold text-navy-900">Agregar día</h4>
            <TextField
              label="Fecha"
              type="date"
              value={dayDraft.day}
              onChange={(e) => setDayDraft((d) => ({ ...d, day: e.target.value }))}
            />
            <TextField
              label="Título del día"
              value={dayDraft.title}
              maxLength={TITLE_MAX}
              onChange={(e) => setDayDraft((d) => ({ ...d, title: e.target.value }))}
            />
            <TextArea label="Comidas" rows={3} value={dayDraft.meals} onChange={(e) => setDayDraft((d) => ({ ...d, meals: e.target.value }))} />
            <TextArea label="Ejercicio" rows={3} value={dayDraft.exercise} onChange={(e) => setDayDraft((d) => ({ ...d, exercise: e.target.value }))} />
            <TextArea label="Notas" rows={2} value={dayDraft.notes} onChange={(e) => setDayDraft((d) => ({ ...d, notes: e.target.value }))} />
            {dayError ? <p role="alert" className="font-semibold text-red-600">{dayError}</p> : null}
            <div className="flex justify-end">
              <Button type="submit" variant="primary" disabled={busy || days.status !== 'ok'}>
                {busy ? 'Agregando…' : 'Agregar día'}
              </Button>
            </div>
          </form>
        ) : null}
      </section>

      {confirmingDeliver ? (
        <ConfirmDialog
          title="¿Entregar esta receta?"
          text={deliverText}
          confirmLabel="Entregar receta"
          busy={busy}
          onConfirm={deliver}
          onCancel={() => setConfirmingDeliver(false)}
        />
      ) : null}

      {confirmingDelete ? (
        <ConfirmDialog
          title="¿Borrar este borrador?"
          text={`Se borrará «${saved?.title ?? ''}» y sus días del calendario.`}
          confirmLabel="Borrar borrador"
          busy={busy}
          onConfirm={deleteDraft}
          onCancel={() => setConfirmingDelete(false)}
        />
      ) : null}
    </section>
  );
}

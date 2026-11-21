import { Trash2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { repo } from '../../data';
import type { ProgressEntry } from '../../data/types';
import { buttonClasses } from '../ui/Button';
import { TextArea, TextField } from '../ui/Field';
import { ErrorState, Loading, errorMessage } from '../ui/States';
import ConfirmDialog from './ConfirmDialog';
import { addDaysISO, formatDateLong, todayISO } from './labels';
import { useAsync } from './useAsync';
import WeightChart from './WeightChart';

interface FormValues {
  entry_date: string;
  weight: string;
  minutes: string;
  activity: string;
  note: string;
}

type FormErrors = Partial<Record<keyof FormValues, string>>;

function emptyForm(): FormValues {
  return { entry_date: todayISO(), weight: '', minutes: '', activity: '', note: '' };
}

/** Valida el formulario de progreso. Peso y minutos son opcionales; la fecha no puede ser futura. */
function validateProgress(v: FormValues, today: string = todayISO()): FormErrors {
  const errors: FormErrors = {};
  if (!v.entry_date) errors.entry_date = 'Elige la fecha del registro.';
  else if (v.entry_date > today) errors.entry_date = 'La fecha no puede ser futura.';
  if (v.weight.trim()) {
    const kg = Number(v.weight);
    if (!Number.isFinite(kg) || kg < 20 || kg > 400) errors.weight = 'Escribe un peso entre 20 y 400 kg.';
  }
  if (v.minutes.trim()) {
    const min = Number(v.minutes);
    if (!Number.isInteger(min) || min < 0 || min > 1440) errors.minutes = 'Escribe minutos enteros entre 0 y 1440.';
  }
  return errors;
}

/** Minutos activos de los últimos 7 días (hoy incluido). */
function minutesThisWeek(entries: ProgressEntry[], today: string): number {
  const from = addDaysISO(today, -6);
  return entries
    .filter((e) => e.entry_date >= from && e.entry_date <= today)
    .reduce((sum, e) => sum + (e.active_minutes ?? 0), 0);
}

/** Pestaña "Mi progreso": formulario, resumen, gráfico de peso y lista con borrado confirmado. */
export default function ProgressTab() {
  const list = useAsync(() => repo.listProgress(), []);
  const [form, setForm] = useState<FormValues>(emptyForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [toDelete, setToDelete] = useState<ProgressEntry | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const setField = (key: keyof FormValues) => (value: string) => setForm((f) => ({ ...f, [key]: value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const found = validateProgress(form);
    setErrors(found);
    setSaveError(null);
    setSaved(false);
    if (Object.keys(found).length > 0) return;
    setSaving(true);
    try {
      await repo.addProgress({
        entry_date: form.entry_date,
        weight_kg: form.weight.trim() ? Number(form.weight) : null,
        active_minutes: form.minutes.trim() ? Number(form.minutes) : null,
        activity: form.activity.trim() || null,
        note: form.note.trim() || null,
      });
      setForm((f) => ({ ...f, weight: '', minutes: '', activity: '', note: '' }));
      setSaved(true);
      list.reload();
    } catch (error) {
      setSaveError(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await repo.deleteProgress(toDelete.id);
      setToDelete(null);
      list.reload();
    } catch (error) {
      setDeleteError(errorMessage(error));
    } finally {
      setDeleting(false);
    }
  };

  const today = todayISO();

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-[1.75rem] bg-white p-6 shadow-xl shadow-navy-900/5 md:p-8">
        <h2 className="display text-2xl text-navy-900">Agregar registro</h2>
        <form onSubmit={submit} noValidate className="mt-6 grid gap-5 md:grid-cols-2">
          <TextField
            label="Fecha"
            type="date"
            max={today}
            value={form.entry_date}
            onChange={(e) => setField('entry_date')(e.target.value)}
            error={errors.entry_date}
          />
          <TextField
            label="Peso (kg)"
            type="number"
            inputMode="decimal"
            step="0.1"
            min={20}
            max={400}
            value={form.weight}
            onChange={(e) => setField('weight')(e.target.value)}
            error={errors.weight}
            hint="Opcional"
          />
          <TextField
            label="Minutos activos"
            type="number"
            inputMode="numeric"
            step="1"
            min={0}
            max={1440}
            value={form.minutes}
            onChange={(e) => setField('minutes')(e.target.value)}
            error={errors.minutes}
            hint="Opcional"
          />
          <TextField
            label="Actividad"
            placeholder="Ej.: caminata, gimnasio"
            value={form.activity}
            onChange={(e) => setField('activity')(e.target.value)}
          />
          <div className="md:col-span-2">
            <TextArea
              label="Nota"
              rows={3}
              value={form.note}
              onChange={(e) => setField('note')(e.target.value)}
              hint="Opcional"
            />
          </div>
          {saveError ? (
            <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 md:col-span-2">{saveError}</p>
          ) : null}
          <div className="flex flex-wrap items-center gap-4 md:col-span-2">
            <button type="submit" disabled={saving} className={buttonClasses({ variant: 'primary' })}>
              {saving ? 'Guardando…' : 'Guardar registro'}
            </button>
            {saved ? <p role="status" className="font-semibold text-emerald-700">Registro guardado.</p> : null}
          </div>
        </form>
      </section>

      {list.status === 'loading' ? <Loading text="Cargando tu progreso…" /> : null}
      {list.status === 'error' ? <ErrorState message={list.message} onRetry={list.reload} /> : null}
      {list.status === 'ok' ? (
        <>
          <section className="rounded-[1.75rem] bg-white p-6 shadow-xl shadow-navy-900/5 md:p-8">
            <p className="text-lg font-extrabold text-navy-900">
              Minutos activos esta semana: {minutesThisWeek(list.data, today)}
            </p>
            <h2 className="display mt-6 text-xl text-navy-900">Peso en el tiempo</h2>
            <div className="mt-4">
              <WeightChart
                points={list.data
                  .filter((e): e is ProgressEntry & { weight_kg: number } => e.weight_kg !== null)
                  .map((e) => ({ date: e.entry_date, kg: e.weight_kg }))}
              />
            </div>
          </section>

          <section className="rounded-[1.75rem] bg-white p-6 shadow-xl shadow-navy-900/5 md:p-8">
            <h2 className="display text-xl text-navy-900">Mis registros</h2>
            {list.data.length === 0 ? (
              <p className="mt-4 text-slate-600">Aún no tienes registros. Agrega el primero con el formulario de arriba.</p>
            ) : (
              <ul className="mt-4 divide-y divide-slate-100">
                {[...list.data].reverse().map((entry) => {
                  const fecha = formatDateLong(entry.entry_date);
                  return (
                    <li key={entry.id} className="flex items-start justify-between gap-4 py-4">
                      <div className="min-w-0">
                        <p className="font-extrabold text-navy-900">{fecha}</p>
                        <p className="mt-1 text-sm text-slate-600">
                          {[
                            entry.weight_kg !== null ? `${entry.weight_kg.toFixed(1).replace('.', ',')} kg` : null,
                            entry.active_minutes !== null ? `${entry.active_minutes} min activos` : null,
                            entry.activity,
                          ].filter(Boolean).join(' · ') || 'Sin datos de peso ni minutos'}
                        </p>
                        {entry.note ? <p className="mt-1 text-sm text-slate-500">{entry.note}</p> : null}
                      </div>
                      <button
                        type="button"
                        aria-label={`Borrar registro del ${fecha}`}
                        onClick={() => { setDeleteError(null); setToDelete(entry); }}
                        className="shrink-0 rounded-xl p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-5 w-5" aria-hidden="true" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            {deleteError ? <p role="alert" className="mt-4 font-semibold text-red-600">{deleteError}</p> : null}
          </section>
        </>
      ) : null}

      {toDelete ? (
        <ConfirmDialog
          key={toDelete.id}
          title="¿Borrar este registro?"
          text={`Se borrará el registro del ${formatDateLong(toDelete.entry_date)}. No se puede deshacer.`}
          confirmLabel="Borrar"
          busy={deleting}
          onConfirm={confirmDelete}
          onCancel={() => setToDelete(null)}
        />
      ) : null}
    </div>
  );
}

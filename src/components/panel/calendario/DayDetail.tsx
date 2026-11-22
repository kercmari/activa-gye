import { useState, type FormEvent } from 'react';
import { repo } from '../../../data';
import type { PlanDay } from '../../../data/types';
import { buttonClasses } from '../../ui/Button';
import { TextArea } from '../../ui/Field';
import { errorMessage } from '../../ui/States';
import { formatDateLong } from '../../profile/labels';
import { canMarkDone } from './calendarUtils';

const NOTE_MAX = 500;

interface Props {
  plan: PlanDay;
  today: string;
  onClose: () => void;
  onSaved: (plan: PlanDay) => void;
}

/** Detalle de un día con plan: contenido del nutricionista, casilla de cumplido y nota del paciente. */
export default function DayDetail({ plan, today, onClose, onSaved }: Props) {
  const markable = canMarkDone(plan.day, today);
  const [done, setDone] = useState(plan.done_at !== null);
  const [note, setNote] = useState(plan.patient_note ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaved(false);
    setError(null);
    if (note.length > NOTE_MAX) {
      setError(`La nota no puede tener más de ${NOTE_MAX} caracteres.`);
      return;
    }
    setSaving(true);
    try {
      const updated = await repo.setPlanDayDone(plan.id, done, note.trim() ? note.trim() : null);
      onSaved(updated);
      setSaved(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const sections: Array<{ label: string; text: string | null }> = [
    { label: 'Comidas', text: plan.meals },
    { label: 'Ejercicio', text: plan.exercise },
    { label: 'Notas del nutricionista', text: plan.notes },
  ];

  return (
    <section aria-labelledby="detalle-dia" className="rounded-[1.75rem] bg-white p-6 shadow-xl shadow-navy-900/5 md:p-8">
      <p className="eyebrow">{formatDateLong(plan.day)}</p>
      <h2 id="detalle-dia" className="display mt-2 text-2xl text-navy-900">{plan.title}</h2>

      <dl className="mt-6 grid gap-4">
        {sections.map((s) => (
          <div key={s.label}>
            <dt className="text-xs font-extrabold uppercase tracking-wide text-slate-500">{s.label}</dt>
            <dd className="mt-1 whitespace-pre-line text-slate-700">{s.text?.trim() ? s.text : 'Sin contenido.'}</dd>
          </div>
        ))}
      </dl>

      <form onSubmit={submit} noValidate className="mt-8 grid gap-5 border-t border-slate-100 pt-6">
        <div>
          <label className="flex items-center gap-3 font-extrabold text-navy-900">
            <input
              type="checkbox"
              checked={done}
              disabled={!markable}
              onChange={(e) => { setDone(e.target.checked); setSaved(false); }}
              className="h-5 w-5 rounded border-slate-300 accent-emerald-600"
            />
            Cumplí este día
          </label>
          {!markable ? <p className="mt-2 text-sm text-slate-500">Podrás marcarlo ese día.</p> : null}
        </div>

        <TextArea
          label="Nota para mi nutricionista"
          rows={3}
          maxLength={NOTE_MAX}
          value={note}
          onChange={(e) => { setNote(e.target.value); setSaved(false); }}
          hint={`${note.length}/${NOTE_MAX}`}
        />

        {error ? <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p> : null}

        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={saving} className={buttonClasses({ variant: 'primary' })}>
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
          <button type="button" onClick={onClose} className={buttonClasses({ variant: 'ghost' })}>
            Cerrar
          </button>
          {saved ? <p role="status" className="font-semibold text-emerald-700">Guardado.</p> : null}
        </div>
      </form>
    </section>
  );
}

import { useState, type FormEvent } from 'react';
import { Minus, Plus } from 'lucide-react';
import { repo, type CheckinInput, type DailyCheckin } from '../../data';
import { Button } from '../ui/Button';
import { TextArea, TextField } from '../ui/Field';
import { errorMessage } from '../ui/States';

const MOODS = [
  { value: 1, emoji: '😣', label: 'Muy mal' },
  { value: 2, emoji: '😕', label: 'Mal' },
  { value: 3, emoji: '😐', label: 'Regular' },
  { value: 4, emoji: '🙂', label: 'Bien' },
  { value: 5, emoji: '😄', label: 'Muy bien' },
] as const;

const MAX_WATER = 12;

export interface CheckinCardProps {
  /** Chequeo de hoy (null si aún no hay). */
  checkin: DailyCheckin | null;
  /** Se llama con el chequeo guardado. */
  onSaved: (checkin: DailyCheckin) => void;
}

/** «¿Cómo te sientes hoy?»: ánimo 1–5, peso opcional, vasos de agua y nota. */
export function CheckinCard({ checkin, onSaved }: CheckinCardProps) {
  const [editing, setEditing] = useState(checkin === null);
  const [mood, setMood] = useState<number | null>(checkin?.mood ?? null);
  const [weight, setWeight] = useState(checkin?.weight_kg != null ? String(checkin.weight_kg) : '');
  const [water, setWater] = useState(checkin?.water_glasses ?? 0);
  const [note, setNote] = useState(checkin?.note ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startEdit = () => {
    setMood(checkin?.mood ?? null);
    setWeight(checkin?.weight_kg != null ? String(checkin.weight_kg) : '');
    setWater(checkin?.water_glasses ?? 0);
    setNote(checkin?.note ?? '');
    setError(null);
    setEditing(true);
  };

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (mood === null) {
      setError('Elige cómo te sientes, del 1 al 5.');
      return;
    }
    const trimmed = weight.trim().replace(',', '.');
    const weightKg = trimmed === '' ? null : Number(trimmed);
    if (weightKg !== null && (!Number.isFinite(weightKg) || weightKg < 20 || weightKg > 300)) {
      setError('Revisa el peso: debe estar entre 20 y 300 kg.');
      return;
    }
    const input: CheckinInput = {
      mood,
      weight_kg: weightKg,
      water_glasses: water,
      note: note.trim() === '' ? null : note.trim(),
    };
    setSaving(true);
    setError(null);
    try {
      const saved = await repo.saveTodayCheckin(input);
      setEditing(false);
      onSaved(saved);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  if (!editing && checkin) {
    const moodInfo = MOODS.find((m) => m.value === checkin.mood);
    return (
      <section aria-labelledby="checkin-titulo" className="rounded-[1.75rem] bg-white p-6 shadow-xl shadow-navy-900/5">
        <h2 id="checkin-titulo" className="display text-2xl text-navy-900">Tu chequeo de hoy</h2>
        <dl className="mt-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <div>
            <dt className="font-bold text-slate-500">Ánimo</dt>
            <dd className="mt-1 text-base font-bold text-navy-900">
              {moodInfo ? `${moodInfo.emoji} ${moodInfo.label}` : `${checkin.mood} de 5`}
            </dd>
          </div>
          <div>
            <dt className="font-bold text-slate-500">Peso</dt>
            <dd className="mt-1 text-base font-bold text-navy-900">
              {checkin.weight_kg != null ? `${checkin.weight_kg} kg` : 'Sin registrar'}
            </dd>
          </div>
          <div>
            <dt className="font-bold text-slate-500">Vasos de agua</dt>
            <dd className="mt-1 text-base font-bold text-navy-900">{checkin.water_glasses ?? 0}</dd>
          </div>
          <div>
            <dt className="font-bold text-slate-500">Nota</dt>
            <dd className="mt-1 text-base text-navy-900">{checkin.note ?? '—'}</dd>
          </div>
        </dl>
        <div className="mt-5">
          <Button variant="secondary" onClick={startEdit}>Editar</Button>
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="checkin-titulo" className="rounded-[1.75rem] bg-white p-6 shadow-xl shadow-navy-900/5">
      <form onSubmit={(e) => void save(e)} noValidate className="space-y-6">
        <h2 id="checkin-titulo" className="display text-2xl text-navy-900">¿Cómo te sientes hoy?</h2>

        <fieldset>
          <legend className="text-sm font-bold text-navy-900">Ánimo (1 a 5)</legend>
          <div className="mt-3 grid grid-cols-5 gap-2">
            {MOODS.map((m) => {
              const selected = mood === m.value;
              return (
                <button
                  key={m.value}
                  type="button"
                  aria-pressed={selected}
                  aria-label={`${m.value} de 5, ${m.label}`}
                  onClick={() => setMood(m.value)}
                  className={`flex min-h-16 flex-col items-center justify-center rounded-2xl border-2 text-2xl transition-colors ${
                    selected ? 'border-brand-orange bg-brand-orange/10' : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <span aria-hidden="true">{m.emoji}</span>
                  <span className="mt-1 text-[0.65rem] font-bold text-slate-500">{m.label}</span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            label="Peso de hoy (kg, opcional)"
            inputMode="decimal"
            placeholder="Ej. 64,5"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
          />
          <div>
            <p className="text-sm font-bold text-navy-900" id="agua-titulo">Vasos de agua</p>
            <div className="mt-2 flex items-center gap-3" role="group" aria-labelledby="agua-titulo">
              <button
                type="button"
                aria-label="Quitar un vaso"
                onClick={() => setWater((w) => Math.max(0, w - 1))}
                disabled={water <= 0}
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-300 bg-white text-navy-900 disabled:opacity-40"
              >
                <Minus aria-hidden="true" className="h-4 w-4" />
              </button>
              <span className="min-w-10 text-center text-2xl font-extrabold text-navy-900" aria-live="polite">
                {water}
              </span>
              <button
                type="button"
                aria-label="Agregar un vaso"
                onClick={() => setWater((w) => Math.min(MAX_WATER, w + 1))}
                disabled={water >= MAX_WATER}
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-300 bg-white text-navy-900 disabled:opacity-40"
              >
                <Plus aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <TextArea
          label="Nota (opcional)"
          rows={3}
          placeholder="¿Algo que quieras recordar hoy?"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />

        {error ? (
          <p role="alert" className="text-sm font-semibold text-red-700">
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar chequeo'}
          </Button>
          {checkin ? (
            <Button variant="ghost" onClick={() => setEditing(false)} disabled={saving}>
              Cancelar
            </Button>
          ) : null}
        </div>
      </form>
    </section>
  );
}

export default CheckinCard;

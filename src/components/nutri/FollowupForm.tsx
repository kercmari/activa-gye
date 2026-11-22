import { useState, type FormEvent } from 'react';
import { repo } from '../../data';
import { todayISO } from '../profile/labels';
import { Button } from '../ui/Button';
import { TextArea, TextField } from '../ui/Field';
import { errorMessage } from '../ui/States';

interface Props {
  patientId: string;
  /** Se llama tras guardar, para que la lista se recargue. */
  onSaved: () => void;
}

type Fields = 'date' | 'weight' | 'waist' | 'observations' | 'recommendations';

/** Número opcional: '' → null; fuera de rango o no numérico → undefined (inválido). */
function optionalNumber(raw: string, min: number, max: number): number | null | undefined {
  const text = raw.trim().replace(',', '.');
  if (text === '') return null;
  const n = Number(text);
  if (!Number.isFinite(n) || n < min || n > max) return undefined;
  return Math.round(n * 10) / 10;
}

/** Formulario «Nuevo seguimiento» de una consulta. */
export default function FollowupForm({ patientId, onSaved }: Props) {
  const [date, setDate] = useState(todayISO);
  const [weight, setWeight] = useState('');
  const [waist, setWaist] = useState('');
  const [observations, setObservations] = useState('');
  const [recommendations, setRecommendations] = useState('');
  const [errors, setErrors] = useState<Partial<Record<Fields, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);

    const next: Partial<Record<Fields, string>> = {};
    if (!date) next.date = 'Elige la fecha del seguimiento.';
    const weightKg = optionalNumber(weight, 25, 350);
    if (weightKg === undefined) next.weight = 'El peso debe estar entre 25 y 350 kg, o déjalo vacío.';
    const waistCm = optionalNumber(waist, 40, 250);
    if (waistCm === undefined) next.waist = 'La cintura debe estar entre 40 y 250 cm, o déjala vacía.';
    if (observations.trim().length < 2) next.observations = 'Escribe al menos 2 caracteres.';
    if (recommendations.trim().length < 2) next.recommendations = 'Escribe al menos 2 caracteres.';
    setErrors(next);
    if (Object.keys(next).length > 0 || weightKg === undefined || waistCm === undefined) return;

    setSaving(true);
    try {
      await repo.addFollowup(patientId, {
        followup_date: date,
        weight_kg: weightKg,
        waist_cm: waistCm,
        observations: observations.trim(),
        recommendations: recommendations.trim(),
      });
      setWeight('');
      setWaist('');
      setObservations('');
      setRecommendations('');
      setDate(todayISO());
      onSaved();
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-5" aria-label="Nuevo seguimiento">
      <div className="grid gap-5 sm:grid-cols-3">
        <TextField
          label="Fecha"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          error={errors.date}
        />
        <TextField
          label="Peso (kg)"
          type="number"
          inputMode="decimal"
          step="0.1"
          min={25}
          max={350}
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          error={errors.weight}
          hint="Opcional"
        />
        <TextField
          label="Cintura (cm)"
          type="number"
          inputMode="decimal"
          step="0.1"
          min={40}
          max={250}
          value={waist}
          onChange={(e) => setWaist(e.target.value)}
          error={errors.waist}
          hint="Opcional"
        />
      </div>
      <TextArea
        label="Observaciones"
        value={observations}
        onChange={(e) => setObservations(e.target.value)}
        maxLength={2000}
        rows={3}
        error={errors.observations}
      />
      <TextArea
        label="Recomendaciones"
        value={recommendations}
        onChange={(e) => setRecommendations(e.target.value)}
        maxLength={2000}
        rows={3}
        error={errors.recommendations}
      />
      {formError ? (
        <p role="alert" className="font-semibold text-red-600">{formError}</p>
      ) : null}
      <Button type="submit" variant="primary" disabled={saving}>
        {saving ? 'Guardando…' : 'Guardar seguimiento'}
      </Button>
    </form>
  );
}

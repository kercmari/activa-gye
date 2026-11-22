import { useState, type FormEvent } from 'react';
import type { TemplateSex, TemplateStatus } from '../../data';
import { toInput, type TemplateFormValues } from './formValues';
import { Button } from '../ui/Button';
import { SelectField, TextArea, TextField } from '../ui/Field';
import { GOAL_LABELS } from '../profile/labels';
import type { Goal } from '../../data';
import { SEX_TEMPLATE_LABELS, STATUS_LABELS } from './labels';

interface Props {
  initial: TemplateFormValues;
  isNew: boolean;
  busy: boolean;
  serverError: string | null;
  status: TemplateStatus;
  /** Cambio de estado a borrador (la página guarda con el botón). */
  onStatusChange: (status: TemplateStatus) => void;
  /** Se pidió «Aprobada»: la página confirma antes de cambiar el estado. */
  onRequestApprove: (author: string) => void;
  onSubmit: (values: TemplateFormValues) => void;
}

/** Criterios y datos generales de la plantilla. */
export default function TemplateForm({ initial, isNew, busy, serverError, status, onStatusChange, onRequestApprove, onSubmit }: Props) {
  const [v, setV] = useState<TemplateFormValues>(initial);
  const [errors, setErrors] = useState<Partial<Record<keyof TemplateFormValues, string>>>({});

  const set = <K extends keyof TemplateFormValues>(key: K, value: TemplateFormValues[K]) =>
    setV((prev) => ({ ...prev, [key]: value }));

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const result = toInput(v);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    onSubmit(v);
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5 rounded-[1.75rem] bg-white p-6 shadow-xl shadow-navy-900/5 md:p-8">
      <h2 className="display text-2xl text-navy-900">{isNew ? 'Nueva plantilla' : 'Criterios y datos'}</h2>

      <TextField label="Nombre" value={v.name} onChange={(e) => set('name', e.target.value)} error={errors.name} required />
      <TextArea label="Descripción" value={v.description} onChange={(e) => set('description', e.target.value)} rows={3} />

      <div className="grid gap-5 md:grid-cols-2">
        <SelectField label="Género" value={v.sex} onChange={(e) => set('sex', e.target.value as TemplateSex)}>
          {(Object.keys(SEX_TEMPLATE_LABELS) as TemplateSex[]).map((s) => (
            <option key={s} value={s}>{SEX_TEMPLATE_LABELS[s]}</option>
          ))}
        </SelectField>
        <SelectField label="Objetivo" value={v.goal} onChange={(e) => set('goal', e.target.value)}>
          <option value="">Cualquiera</option>
          {(Object.keys(GOAL_LABELS) as Goal[]).map((g) => (
            <option key={g} value={g}>{GOAL_LABELS[g]}</option>
          ))}
        </SelectField>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <TextField label="Edad mínima" type="number" inputMode="numeric" value={v.age_min} onChange={(e) => set('age_min', e.target.value)} error={errors.age_min} />
        <TextField label="Edad máxima" type="number" inputMode="numeric" value={v.age_max} onChange={(e) => set('age_max', e.target.value)} />
        <TextField label="IMC mínimo" type="number" step="0.1" inputMode="decimal" value={v.bmi_min} onChange={(e) => set('bmi_min', e.target.value)} error={errors.bmi_min} />
        <TextField label="IMC máximo" type="number" step="0.1" inputMode="decimal" value={v.bmi_max} onChange={(e) => set('bmi_max', e.target.value)} />
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <TextField label="Kcal base" type="number" inputMode="numeric" value={v.kcal_base} onChange={(e) => set('kcal_base', e.target.value)} error={errors.kcal_base} hint="Las porciones se ajustan a la meta de cada persona." />
        <TextField label="Autora o autor del plan" value={v.author_name} onChange={(e) => set('author_name', e.target.value)} error={errors.author_name} />
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <SelectField
          label="Estado"
          value={status}
          hint={status === 'borrador' ? 'Plan de muestra pendiente de revisión por una nutricionista.' : 'Revisada por una nutricionista.'}
          onChange={(e) => {
            const next = e.target.value as TemplateStatus;
            if (next === 'aprobada' && status !== 'aprobada') onRequestApprove(v.author_name.trim());
            else onStatusChange(next);
          }}
        >
          {(Object.keys(STATUS_LABELS) as TemplateStatus[]).map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </SelectField>
        <label className="flex items-start gap-3 pt-7 text-sm font-semibold text-slate-700">
          <input
            type="checkbox"
            className="mt-0.5 h-5 w-5 rounded border-slate-300"
            checked={v.is_fallback}
            onChange={(e) => set('is_fallback', e.target.checked)}
          />
          <span>
            Usar como respaldo
            <span className="block font-normal text-slate-500">Se usa cuando ninguna otra plantilla encaja con la persona.</span>
          </span>
        </label>
      </div>

      {serverError ? <p role="alert" className="font-semibold text-red-600">{serverError}</p> : null}

      <div className="flex flex-wrap justify-end gap-3">
        <Button type="submit" variant="primary" disabled={busy}>
          {busy ? 'Guardando…' : isNew ? 'Crear plantilla' : 'Guardar criterios'}
        </Button>
      </div>
    </form>
  );
}

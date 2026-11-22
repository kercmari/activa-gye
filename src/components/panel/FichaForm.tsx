/** Formulario «Mi ficha»: datos básicos, medidas, objetivo, notas y foto opcional. */
import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { repo, type HealthCondition, type PatientIntake, type Profile } from '../../data';
import { ACTIVITY_OPTIONS, GOAL_OPTIONS, SEX_OPTIONS, ageFromBirth } from '../nutrition/labels';
import { todayISO } from '../profile/labels';
import { useAsync } from '../profile/useAsync';
import { TextArea, TextField, SelectField } from '../ui/Field';
import { Button } from '../ui/Button';
import { errorMessage } from '../ui/States';
import FichaFoto from './FichaFoto';
import {
  ALERGIAS_MAX, CONDICIONES, CONDICIONES_NOTA, buildIntakeInput, validateFicha, validateFoto,
  type FichaErrors, type FichaValues,
} from './ficha';

interface Props {
  intake: PatientIntake | null;
  profile: Profile;
  userId: string;
  refresh: () => Promise<void>;
  onSaved: (saved: PatientIntake) => void;
}

type Photo = { file: File; url: string };

export default function FichaForm({ intake, profile, userId, refresh, onSaved }: Props) {
  const [v, setV] = useState<FichaValues>(() => ({
    full_name: profile.full_name,
    birth_date: profile.birth_date ?? '',
    sex: profile.sex ?? '',
    weight: intake ? String(intake.weight_kg) : '',
    height: intake ? String(intake.height_cm) : '',
    waist: intake?.waist_cm != null ? String(intake.waist_cm) : '',
    goal: intake?.goal ?? profile.goal ?? '',
    activity: intake?.activity_level ?? profile.activity_level ?? '',
    health_notes: intake?.health_notes ?? '',
    allergies: intake?.allergies ?? '',
    conditions: intake?.conditions ?? [],
  }));
  const [errors, setErrors] = useState<FichaErrors>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [photo, setPhoto] = useState<Photo | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [removeSaved, setRemoveSaved] = useState(false);
  const [consent, setConsent] = useState(intake?.consent_photo ?? false);
  const [fileKey, setFileKey] = useState(0);

  // Libera la vista previa de la foto nueva al cambiarla o al salir.
  useEffect(() => () => { if (photo) URL.revokeObjectURL(photo.url); }, [photo]);

  const photoPath = intake?.photo_path ?? null;
  const savedPhoto = useAsync(
    () => (photoPath ? repo.getIntakePhotoUrl(userId) : Promise.resolve(null)),
    [photoPath, userId],
  );

  const age = ageFromBirth(v.birth_date);
  const adult = age !== null && age >= 18;
  const hasSavedPhoto = adult && !!photoPath && !removeSaved;
  const hasPhoto = adult && (!!photo || hasSavedPhoto);
  const savedUrl = savedPhoto.status === 'ok' ? savedPhoto.data : null;
  const preview = photo?.url ?? (hasSavedPhoto ? savedUrl : null);

  const setText = (key: 'full_name' | 'birth_date' | 'weight' | 'height' | 'waist' | 'health_notes' | 'allergies') =>
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = e.target.value;
      setV((p) => ({ ...p, [key]: value }));
      setErrors((p) => ({ ...p, [key]: undefined }));
      setSaved(false);
    };
  const toggleCondition = (cond: HealthCondition, checked: boolean) => {
    setV((p) => ({
      ...p,
      conditions: checked ? [...p.conditions.filter((c) => c !== cond), cond] : p.conditions.filter((c) => c !== cond),
    }));
    setSaved(false);
  };

  const setChoice = (key: 'sex' | 'goal' | 'activity') => (e: ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setV((p) => ({ ...p, [key]: value }));
    setErrors((p) => ({ ...p, [key]: undefined }));
    setSaved(false);
  };

  const onFile = (file: File) => {
    const err = validateFoto(file);
    setSaved(false);
    if (err) {
      setPhoto(null);
      setPhotoError(err);
      return;
    }
    setPhotoError(null);
    setRemoveSaved(false);
    setPhoto({ file, url: URL.createObjectURL(file) });
  };

  const onRemove = () => {
    setPhoto(null);
    setPhotoError(null);
    setFileKey((k) => k + 1);
    if (photoPath) setRemoveSaved(true);
    setConsent(false);
    setSaved(false);
  };

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (saving) return;
    setSaved(false);
    setSaveError(null);
    const found = validateFicha(v, { hasPhoto, consent, today: todayISO() });
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSaving(true);
    try {
      const next = await repo.saveMyIntake(buildIntakeInput(v, {
        file: adult ? photo?.file ?? null : null,
        remove: adult && removeSaved,
        consent: hasPhoto && consent,
      }));
      onSaved(next);
      setPhoto(null);
      setPhotoError(null);
      setRemoveSaved(false);
      setConsent(next.consent_photo);
      setFileKey((k) => k + 1);
      setSaved(true);
      await refresh();
    } catch (error) {
      setSaveError(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const ageHint = age !== null ? `Edad: ${age} años` : undefined;

  return (
    <form onSubmit={onSubmit} noValidate aria-label="Mi ficha" className="rounded-[1.75rem] bg-white p-6 shadow-xl shadow-navy-900/5 md:p-8">
      <h2 className="display text-2xl text-navy-900">Mi ficha inicial</h2>
      {!intake ? (
        <p className="mt-3 text-slate-600">Aún no tienes ficha. Completa tus datos para empezar; tu nutricionista la usará para acompañarte.</p>
      ) : null}

      <fieldset className="mt-8 grid gap-6 md:grid-cols-2">
        <legend className="eyebrow mb-4 text-brand-orange">Datos básicos</legend>
        <TextField
          label="Nombre completo"
          autoComplete="name"
          value={v.full_name}
          onChange={setText('full_name')}
          error={errors.full_name}
        />
        <TextField
          label="Fecha de nacimiento"
          type="date"
          value={v.birth_date}
          onChange={setText('birth_date')}
          error={errors.birth_date}
          hint={ageHint}
        />
        <SelectField label="Género" value={v.sex} onChange={setChoice('sex')} error={errors.sex}>
          <option value="">Elige una opción</option>
          {SEX_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </SelectField>
      </fieldset>

      <fieldset className="mt-8 grid gap-6 md:grid-cols-3">
        <legend className="eyebrow mb-4 text-brand-orange">Medidas</legend>
        <TextField
          label="Peso (kg)"
          inputMode="decimal"
          value={v.weight}
          onChange={setText('weight')}
          error={errors.weight}
          hint="Entre 25 y 350 kg."
        />
        <TextField
          label="Estatura (cm)"
          inputMode="decimal"
          value={v.height}
          onChange={setText('height')}
          error={errors.height}
          hint="Entre 100 y 250 cm."
        />
        <TextField
          label="Cintura (cm, opcional)"
          inputMode="decimal"
          value={v.waist}
          onChange={setText('waist')}
          error={errors.waist}
          hint="Mídela a la altura del ombligo."
        />
      </fieldset>

      <fieldset className="mt-8 grid gap-6 md:grid-cols-2">
        <legend className="eyebrow mb-4 text-brand-orange">Objetivo y salud</legend>
        <SelectField label="Objetivo (opcional)" value={v.goal} onChange={setChoice('goal')} error={errors.goal}>
          <option value="">Sin definir</option>
          {GOAL_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </SelectField>
        <SelectField label="Nivel de actividad (opcional)" value={v.activity} onChange={setChoice('activity')} error={errors.activity}>
          <option value="">Sin definir</option>
          {ACTIVITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </SelectField>
        <div className="md:col-span-2">
          <TextArea
            label="Notas de salud (opcional)"
            rows={4}
            value={v.health_notes}
            onChange={setText('health_notes')}
            error={errors.health_notes}
            hint="Alergias, lesiones, medicamentos o cualquier dato que tu nutricionista deba saber. Máximo 1000 caracteres."
          />
        </div>
        <div className="md:col-span-2">
          <TextArea
            label="Alergias o comidas que no comes (opcional)"
            rows={3}
            value={v.allergies}
            onChange={setText('allergies')}
            error={errors.allergies}
            hint={`Por ejemplo: maní, mariscos, lactosa, cilantro. Máximo ${ALERGIAS_MAX} caracteres.`}
          />
        </div>
        <fieldset className="md:col-span-2">
          <legend className="mb-2 block text-[11px] font-extrabold uppercase tracking-[0.2em] text-slate-500">
            Condiciones de salud (opcional)
          </legend>
          <p className="mb-3 text-sm text-slate-500">{CONDICIONES_NOTA}</p>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {CONDICIONES.map((c) => (
              <label key={c.value} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 font-semibold text-navy-900">
                <input
                  type="checkbox"
                  name="conditions"
                  value={c.value}
                  className="h-4 w-4 accent-brand-blue"
                  checked={v.conditions.includes(c.value)}
                  onChange={(e) => toggleCondition(c.value, e.target.checked)}
                />
                {c.label}
              </label>
            ))}
          </div>
        </fieldset>
      </fieldset>

      <div className="mt-8">
        {adult ? (
          <FichaFoto
            preview={preview}
            loadingSaved={hasSavedPhoto && savedPhoto.status === 'loading'}
            savedError={hasSavedPhoto && savedPhoto.status === 'error' ? savedPhoto.message : null}
            error={photoError}
            hasPhoto={hasPhoto}
            consent={consent}
            consentError={errors.consent}
            fileKey={fileKey}
            onFile={onFile}
            onRemove={onRemove}
            onConsent={(checked) => { setConsent(checked); setErrors((p) => ({ ...p, consent: undefined })); setSaved(false); }}
          />
        ) : (
          <p className="rounded-2xl bg-slate-100 px-5 py-4 text-sm font-semibold text-slate-600">
            La foto solo está disponible para mayores de 18 años.
          </p>
        )}
      </div>

      <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
        <Button type="submit" variant="primary" size="lg" disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar mi ficha'}
        </Button>
        {saved ? <p role="status" className="font-bold text-emerald-700">Ficha guardada</p> : null}
        {saveError ? <p role="alert" className="font-semibold text-red-600">{saveError}</p> : null}
      </div>
    </form>
  );
}

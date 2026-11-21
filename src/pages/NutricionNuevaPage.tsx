import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, ImagePlus, X } from 'lucide-react';
import { useNavigate } from 'react-router';
import { repo, AppError, type ActivityLevel, type Goal, type NewNutritionRequest, type Sex } from '../data';
import { useAuth } from '../auth/AuthContext';
import PageHeader from '../components/ui/PageHeader';
import { Button, LinkButton } from '../components/ui/Button';
import { SelectField, TextArea, TextField } from '../components/ui/Field';
import { Loading, errorMessage } from '../components/ui/States';
import {
  ACTIVITY_OPTIONS, GOAL_OPTIONS, SEX_OPTIONS, ageFromBirth, GOAL_LABELS, ACTIVITY_LABELS, SEX_LABELS,
} from '../components/nutrition/labels';

const STEP_NAMES = ['Medidas', 'Objetivo y hábitos', 'Foto', 'Confirmar'];
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const CONSENT_TEXT =
  'Acepto que mi foto se envíe de forma privada a un servicio de IA (Groq) solo para generar mi guía y que la vea un nutricionista.';

interface Form {
  sex: Sex | '';
  height: string;
  weight: string;
  waist: string;
  goal: Goal | '';
  activity: ActivityLevel | '';
  restrictions: string;
  health: string;
  consent: boolean;
}

const EMPTY: Form = {
  sex: '', height: '', weight: '', waist: '', goal: '', activity: '', restrictions: '', health: '', consent: false,
};

type Errors = Partial<Record<keyof Form | 'photo', string>>;

/** Número dentro de [min, max]; vacío es inválido. */
function inRange(raw: string, min: number, max: number): number | null {
  const n = Number(raw.replace(',', '.'));
  if (raw.trim() === '' || Number.isNaN(n) || n < min || n > max) return null;
  return n;
}

function validateStep1(f: Form): Errors {
  const e: Errors = {};
  if (!f.sex) e.sex = 'Elige una opción.';
  if (inRange(f.height, 100, 250) === null) e.height = 'La altura debe estar entre 100 y 250 cm.';
  if (inRange(f.weight, 25, 400) === null) e.weight = 'El peso debe estar entre 25 y 400 kg.';
  if (f.waist.trim() !== '' && inRange(f.waist, 40, 250) === null) e.waist = 'La cintura debe estar entre 40 y 250 cm.';
  return e;
}

function validateStep2(f: Form): Errors {
  const e: Errors = {};
  if (!f.goal) e.goal = 'Elige tu objetivo.';
  if (!f.activity) e.activity = 'Elige tu nivel de actividad.';
  if (f.restrictions.length > 500) e.restrictions = 'Máximo 500 caracteres.';
  if (f.health.length > 500) e.health = 'Máximo 500 caracteres.';
  return e;
}

export default function NutricionNuevaPage() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<Form>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [photo, setPhoto] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const birth = session?.profile.birth_date ?? null;
  const age = ageFromBirth(birth);
  const canUploadPhoto = age !== null && age >= 18;

  const previewUrl = useMemo(
    () => (photo && typeof URL.createObjectURL === 'function' ? URL.createObjectURL(photo) : null),
    [photo],
  );
  useEffect(() => () => {
    if (previewUrl && typeof URL.revokeObjectURL === 'function') URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  if (loading) return <Loading text="Preparando tu formulario…" />;

  const set = <K extends keyof Form>(key: K, value: Form[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const onPhotoChange = (file: File | null) => {
    if (!file) return;
    if (!PHOTO_TYPES.includes(file.type)) {
      setErrors((prev) => ({ ...prev, photo: 'Usa una foto JPG, PNG o WebP.' }));
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setErrors((prev) => ({ ...prev, photo: 'La foto no puede pesar más de 5 MB.' }));
      return;
    }
    setErrors((prev) => ({ ...prev, photo: undefined }));
    setPhoto(file);
  };

  const removePhoto = () => {
    setPhoto(null);
    set('consent', false);
  };

  const next = () => {
    let found: Errors = {};
    if (step === 0) {
      if (!birth) return;
      found = validateStep1(form);
    } else if (step === 1) {
      found = validateStep2(form);
    } else if (step === 2) {
      if (photo && !form.consent) found = { consent: 'Marca la casilla para aceptar el uso de tu foto.' };
    }
    setErrors(found);
    if (Object.keys(found).length === 0) setStep((s) => Math.min(s + 1, STEP_NAMES.length - 1));
  };

  const back = () => {
    setErrors({});
    setStep((s) => Math.max(s - 1, 0));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitError(null);
    setSubmitting(true);
    const input: NewNutritionRequest = {
      sex: form.sex as Sex,
      height_cm: Number(form.height.replace(',', '.')),
      weight_kg: Number(form.weight.replace(',', '.')),
      waist_cm: form.waist.trim() === '' ? null : Number(form.waist.replace(',', '.')),
      activity_level: form.activity as ActivityLevel,
      goal: form.goal as Goal,
      restrictions: form.restrictions.trim() === '' ? null : form.restrictions.trim(),
      health_conditions: form.health.trim() === '' ? null : form.health.trim(),
      photo: canUploadPhoto ? photo : null,
      consent_photo: canUploadPhoto && !!photo && form.consent,
    };
    try {
      const req = await repo.createNutritionRequest(input);
      navigate(`/nutricion/${req.id}`);
    } catch (err: unknown) {
      setSubmitError(err instanceof AppError ? err.message : errorMessage(err));
      setSubmitting(false);
    }
  };

  const sexLabel = form.sex ? SEX_LABELS[form.sex] : '';
  const isLastStep = step === STEP_NAMES.length - 1;

  return (
    <>
      <PageHeader eyebrow="NUTRICIÓN" title="Pide tu guía" back="/nutricion" />

      <div className="mx-auto max-w-3xl px-4 py-10">
        <ol className="mb-8 grid grid-cols-4 gap-2 text-center text-xs font-extrabold" aria-label="Pasos del formulario">
          {STEP_NAMES.map((name, i) => (
            <li
              key={name}
              aria-current={i === step ? 'step' : undefined}
              className={`rounded-full px-2 py-2 ${i === step ? 'bg-brand-orange text-white' : i < step ? 'bg-sky-tag/15 text-sky-tag' : 'bg-white text-slate-500'}`}
            >
              {i + 1}. {name}
            </li>
          ))}
        </ol>

        <form onSubmit={submit} noValidate className="rounded-[1.75rem] bg-white p-6 shadow-xl shadow-navy-900/5 md:p-8">
          {step === 0 ? (
            <div className="space-y-5">
              <h2 className="display text-2xl text-navy-900">Tus medidas</h2>
              {!birth ? (
                <div role="alert" className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-900">
                  <p className="font-semibold">Necesitamos tu fecha de nacimiento para calcular tu guía.</p>
                  <div className="mt-3">
                    <LinkButton to="/perfil/editar" variant="secondary" size="md">Completar mi perfil</LinkButton>
                  </div>
                </div>
              ) : null}
              <SelectField label="Sexo" value={form.sex} error={errors.sex} onChange={(e) => set('sex', e.target.value as Sex)}>
                <option value="">Elige una opción</option>
                {SEX_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </SelectField>
              <div className="grid gap-5 sm:grid-cols-2">
                <TextField label="Altura (cm)" inputMode="decimal" value={form.height} error={errors.height} onChange={(e) => set('height', e.target.value)} />
                <TextField label="Peso (kg)" inputMode="decimal" value={form.weight} error={errors.weight} onChange={(e) => set('weight', e.target.value)} />
              </div>
              <TextField
                label="Cintura (cm), opcional"
                inputMode="decimal"
                value={form.waist}
                error={errors.waist}
                hint="Si no la sabes, déjala en blanco."
                onChange={(e) => set('waist', e.target.value)}
              />
            </div>
          ) : null}

          {step === 1 ? (
            <div className="space-y-5">
              <h2 className="display text-2xl text-navy-900">Objetivo y hábitos</h2>
              <SelectField label="Objetivo" value={form.goal} error={errors.goal} onChange={(e) => set('goal', e.target.value as Goal)}>
                <option value="">Elige un objetivo</option>
                {GOAL_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </SelectField>
              <SelectField label="Nivel de actividad" value={form.activity} error={errors.activity} onChange={(e) => set('activity', e.target.value as ActivityLevel)}>
                <option value="">Elige tu nivel</option>
                {ACTIVITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </SelectField>
              <TextArea
                label="Restricciones o alergias, opcional"
                value={form.restrictions}
                error={errors.restrictions}
                rows={3}
                maxLength={500}
                onChange={(e) => set('restrictions', e.target.value)}
              />
              <TextArea
                label="Condiciones de salud, opcional"
                value={form.health}
                error={errors.health}
                rows={3}
                maxLength={500}
                hint="Por ejemplo: diabetes, presión alta. Si tienes alguna, te recomendaremos ver a un profesional."
                onChange={(e) => set('health', e.target.value)}
              />
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-5">
              <h2 className="display text-2xl text-navy-900">Tu foto (opcional)</h2>
              {!canUploadPhoto ? (
                <p className="rounded-2xl bg-slate-100 p-4 font-semibold text-slate-700">
                  La foto solo se permite a mayores de 18 años. Puedes seguir sin foto.
                </p>
              ) : (
                <p className="text-slate-600">Sirve para una guía más ajustada. JPG, PNG o WebP, máximo 5 MB.</p>
              )}

              {photo ? (
                <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                  {previewUrl ? (
                    <img src={previewUrl} alt="Vista previa de tu foto" className="h-40 w-40 rounded-2xl object-cover" />
                  ) : (
                    <p className="font-semibold text-navy-900">Foto lista: {photo.name}</p>
                  )}
                  <Button variant="secondary" onClick={removePhoto} iconRight={X}>Quitar foto</Button>
                </div>
              ) : null}

              {canUploadPhoto && !photo ? (
                <label className="flex cursor-pointer flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-slate-300 p-8 text-center font-bold text-navy-900 hover:bg-slate-50">
                  <ImagePlus className="h-8 w-8 text-brand-blue" aria-hidden="true" />
                  <span>Elegir una foto</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    onChange={(e) => { onPhotoChange(e.target.files?.[0] ?? null); e.target.value = ''; }}
                  />
                </label>
              ) : null}

              {errors.photo ? <p role="alert" className="text-sm font-semibold text-red-600">{errors.photo}</p> : null}

              {photo ? (
                <div>
                  <label className="flex gap-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 shrink-0 accent-brand-blue"
                      checked={form.consent}
                      onChange={(e) => set('consent', e.target.checked)}
                      aria-invalid={errors.consent ? true : undefined}
                    />
                    <span>{CONSENT_TEXT}</span>
                  </label>
                  {errors.consent ? <p role="alert" className="mt-2 text-sm font-semibold text-red-600">{errors.consent}</p> : null}
                </div>
              ) : null}
            </div>
          ) : null}

          {step === 3 ? (
            <div className="space-y-5">
              <h2 className="display text-2xl text-navy-900">Revisa tus datos</h2>
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-4"><dt className="font-bold text-slate-500">Sexo</dt><dd className="font-semibold text-navy-900">{sexLabel}</dd></div>
                <div className="rounded-2xl bg-slate-50 p-4"><dt className="font-bold text-slate-500">Edad</dt><dd className="font-semibold text-navy-900">{age ?? '—'} años</dd></div>
                <div className="rounded-2xl bg-slate-50 p-4"><dt className="font-bold text-slate-500">Altura</dt><dd className="font-semibold text-navy-900">{form.height} cm</dd></div>
                <div className="rounded-2xl bg-slate-50 p-4"><dt className="font-bold text-slate-500">Peso</dt><dd className="font-semibold text-navy-900">{form.weight} kg</dd></div>
                <div className="rounded-2xl bg-slate-50 p-4"><dt className="font-bold text-slate-500">Cintura</dt><dd className="font-semibold text-navy-900">{form.waist.trim() ? `${form.waist} cm` : 'No indicada'}</dd></div>
                <div className="rounded-2xl bg-slate-50 p-4"><dt className="font-bold text-slate-500">Objetivo</dt><dd className="font-semibold text-navy-900">{form.goal ? GOAL_LABELS[form.goal] : ''}</dd></div>
                <div className="rounded-2xl bg-slate-50 p-4"><dt className="font-bold text-slate-500">Actividad</dt><dd className="font-semibold text-navy-900">{form.activity ? ACTIVITY_LABELS[form.activity] : ''}</dd></div>
                <div className="rounded-2xl bg-slate-50 p-4"><dt className="font-bold text-slate-500">Foto</dt><dd className="font-semibold text-navy-900">{canUploadPhoto && photo ? 'Sí, se envía de forma privada' : 'Sin foto'}</dd></div>
              </dl>
              {form.restrictions.trim() ? <p className="text-sm text-slate-700"><span className="font-bold">Restricciones:</span> {form.restrictions}</p> : null}
              {form.health.trim() ? <p className="text-sm text-slate-700"><span className="font-bold">Condiciones de salud:</span> {form.health}</p> : null}
              <p className="rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-900">
                Orientación general. No reemplaza a un profesional de la salud.
              </p>
              {submitError ? <p role="alert" className="rounded-2xl bg-red-50 p-4 font-semibold text-red-700">{submitError}</p> : null}
            </div>
          ) : null}

          <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
            {step > 0 ? (
              <Button variant="secondary" onClick={back} className="w-full sm:w-auto">
                <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Atrás
              </Button>
            ) : <span />}
            {isLastStep ? (
              <Button type="submit" variant="primary" disabled={submitting} className="w-full sm:w-auto">
                {submitting ? 'Generando tu guía…' : 'Enviar'}
              </Button>
            ) : (
              <Button variant="primary" onClick={next} disabled={step === 0 && !birth} iconRight={ArrowRight} className="w-full sm:w-auto">
                Siguiente
              </Button>
            )}
          </div>
        </form>
      </div>
    </>
  );
}

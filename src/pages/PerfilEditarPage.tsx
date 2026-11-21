import { useState, type FormEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { repo } from '../data';
import type { ActivityLevel, Goal, Profile, Sector, Sex } from '../data/types';
import { useAuth } from '../auth/AuthContext';
import ConfirmDialog from '../components/profile/ConfirmDialog';
import { ACTIVITY_LABELS, GOAL_LABELS, SEX_LABELS, ageFrom, todayISO } from '../components/profile/labels';
import { useAsync } from '../components/profile/useAsync';
import { Button, buttonClasses } from '../components/ui/Button';
import { SelectField, TextField } from '../components/ui/Field';
import PageHeader from '../components/ui/PageHeader';
import { ErrorState, Loading, errorMessage } from '../components/ui/States';

interface EditValues {
  full_name: string;
  birth_date: string;
  sex: string;
  phone: string;
  sector_id: string;
  goal: string;
  activity_level: string;
}
type EditErrors = Partial<Record<keyof EditValues, string>>;

const PHONE_RE = /^[0-9+\s-]{7,15}$/;

function validateEdit(v: EditValues): EditErrors {
  const errors: EditErrors = {};
  if (v.full_name.trim().length < 2) errors.full_name = 'Escribe tu nombre completo (mínimo 2 letras).';
  if (v.birth_date) {
    if (v.birth_date > todayISO()) errors.birth_date = 'La fecha de nacimiento no puede ser futura.';
    else if (ageFrom(v.birth_date) < 16) errors.birth_date = 'Debes tener al menos 16 años.';
  }
  if (v.phone.trim() && !PHONE_RE.test(v.phone.trim())) errors.phone = 'Escribe un teléfono válido, por ejemplo 0991234567.';
  return errors;
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <>
      <PageHeader eyebrow="Mi cuenta" title="Editar perfil" back="/perfil" />
      <section className="mx-auto max-w-3xl px-4 py-10">{children}</section>
    </>
  );
}

/** Editar perfil: datos de la cuenta y zona de peligro para borrarla. */
export default function PerfilEditarPage() {
  const { session } = useAuth();
  const sectors = useAsync(() => repo.listSectors(), []);

  if (!session) return null;
  if (sectors.status === 'loading') return <Shell><Loading text="Cargando formulario…" /></Shell>;
  if (sectors.status === 'error') {
    return <Shell><ErrorState message={sectors.message} onRetry={sectors.reload} /></Shell>;
  }
  return (
    <Shell>
      <EditForm profile={session.profile} sectors={sectors.data} />
    </Shell>
  );
}

function EditForm({ profile, sectors }: { profile: Profile; sectors: Sector[] }) {
  const { refresh } = useAuth();
  const navigate = useNavigate();
  const [values, setValues] = useState<EditValues>({
    full_name: profile.full_name,
    birth_date: profile.birth_date ?? '',
    sex: profile.sex ?? '',
    phone: profile.phone ?? '',
    sector_id: profile.sector_id ?? '',
    goal: profile.goal ?? '',
    activity_level: profile.activity_level ?? '',
  });
  const [errors, setErrors] = useState<EditErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const set = (key: keyof EditValues) => (value: string) => setValues((prev) => ({ ...prev, [key]: value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const found = validateEdit(values);
    setErrors(found);
    setServerError(null);
    if (Object.keys(found).length > 0) return;
    setSaving(true);
    try {
      await repo.updateProfile({
        full_name: values.full_name.trim(),
        birth_date: values.birth_date || null,
        sex: (values.sex || null) as Sex | null,
        phone: values.phone.trim() || null,
        sector_id: values.sector_id || null,
        goal: (values.goal || null) as Goal | null,
        activity_level: (values.activity_level || null) as ActivityLevel | null,
      });
      await refresh();
      navigate('/perfil', { state: { saved: true } });
    } catch (error) {
      setServerError(errorMessage(error));
      setSaving(false);
    }
  };

  const borrarCuenta = async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      await repo.deleteMyAccount();
      navigate('/', { replace: true });
      await refresh();
    } catch (error) {
      setDeleteError(errorMessage(error));
      setDeleting(false);
      setConfirming(false);
    }
  };

  const optional = [{ value: '', label: 'Sin especificar' }];

  return (
    <div className="flex flex-col gap-10">
      <form onSubmit={submit} noValidate className="flex flex-col gap-6 rounded-[1.75rem] bg-white p-6 shadow-xl shadow-navy-900/5 md:p-8">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="md:col-span-2">
            <TextField label="Nombre completo" autoComplete="name" value={values.full_name} onChange={(e) => set('full_name')(e.target.value)} error={errors.full_name} />
          </div>
          <TextField label="Fecha de nacimiento" type="date" max={todayISO()} value={values.birth_date} onChange={(e) => set('birth_date')(e.target.value)} error={errors.birth_date} />
          <SelectField label="Sexo" value={values.sex} onChange={(e) => set('sex')(e.target.value)}>
            {optional.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            {(Object.keys(SEX_LABELS) as Sex[]).map((s) => <option key={s} value={s}>{SEX_LABELS[s]}</option>)}
          </SelectField>
          <TextField label="Teléfono" type="tel" autoComplete="tel" value={values.phone} onChange={(e) => set('phone')(e.target.value)} error={errors.phone} />
          <SelectField label="Sector" value={values.sector_id} onChange={(e) => set('sector_id')(e.target.value)}>
            {optional.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            {sectors.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </SelectField>
          <SelectField label="Objetivo" value={values.goal} onChange={(e) => set('goal')(e.target.value)}>
            {optional.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            {(Object.keys(GOAL_LABELS) as Goal[]).map((g) => <option key={g} value={g}>{GOAL_LABELS[g]}</option>)}
          </SelectField>
          <SelectField label="Nivel de actividad" value={values.activity_level} onChange={(e) => set('activity_level')(e.target.value)}>
            {optional.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            {(Object.keys(ACTIVITY_LABELS) as ActivityLevel[]).map((a) => <option key={a} value={a}>{ACTIVITY_LABELS[a]}</option>)}
          </SelectField>
        </div>

        {serverError ? (
          <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{serverError}</p>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <button type="submit" disabled={saving} className={buttonClasses({ variant: 'primary' })}>
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </form>

      <section aria-labelledby="zona-peligro" className="rounded-[1.75rem] border border-red-200 bg-white p-6 md:p-8">
        <h2 id="zona-peligro" className="display text-xl text-red-700">Zona de peligro</h2>
        <p className="mt-3 text-slate-600">
          Si borras tu cuenta se eliminan tu perfil, tus favoritos, tu progreso y tus solicitudes de nutrición. No se puede deshacer.
        </p>
        {deleteError ? <p role="alert" className="mt-4 font-semibold text-red-600">{deleteError}</p> : null}
        <div className="mt-6">
          <Button variant="danger" onClick={() => setConfirming(true)}>Borrar mi cuenta</Button>
        </div>
      </section>

      {confirming ? (
        <ConfirmDialog
          title="¿Borrar tu cuenta?"
          text="Se borrarán tu perfil, favoritos, progreso y solicitudes de nutrición. Esta acción no se puede deshacer."
          confirmLabel="Sí, borrar mi cuenta"
          requireText="BORRAR"
          busy={deleting}
          onConfirm={borrarCuenta}
          onCancel={() => setConfirming(false)}
        />
      ) : null}
    </div>
  );
}

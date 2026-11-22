import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { repo } from '../data';
import { useAuth } from '../auth/AuthContext';
import { useSettings } from '../auth/SettingsContext';
import AuthShell from '../components/profile/AuthShell';
import PasswordField from '../components/profile/PasswordField';
import { ageFrom, todayISO } from '../components/profile/labels';
import { buttonClasses } from '../components/ui/Button';
import { TextField } from '../components/ui/Field';
import { errorMessage } from '../components/ui/States';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STRENGTH = ['Muy débil', 'Débil', 'Aceptable', 'Buena', 'Fuerte'];

interface Values {
  name: string;
  email: string;
  password: string;
  confirm: string;
  birth: string;
  terms: boolean;
}
type Errors = Partial<Record<keyof Values, string>>;

const EMPTY: Values = { name: '', email: '', password: '', confirm: '', birth: '', terms: false };

/** Indicador simple de fuerza: 0 a 4 según longitud, mayúsculas y minúsculas, números y símbolos. */
function passwordStrength(pw: string): number {
  const checks = [
    pw.length >= 8,
    /[a-z]/.test(pw) && /[A-Z]/.test(pw),
    /\d/.test(pw),
    /[^A-Za-z0-9]/.test(pw),
  ];
  return checks.filter(Boolean).length;
}

function validateRegistro(v: Values): Errors {
  const errors: Errors = {};
  if (v.name.trim().length < 2) errors.name = 'Escribe tu nombre completo (mínimo 2 letras).';
  if (!EMAIL_RE.test(v.email.trim())) errors.email = 'Escribe un correo válido, por ejemplo nombre@correo.com.';
  if (v.password.length < 8) errors.password = 'La contraseña debe tener al menos 8 caracteres.';
  if (v.confirm !== v.password) errors.confirm = 'Las contraseñas no coinciden.';
  if (!v.birth) {
    errors.birth = 'Escribe tu fecha de nacimiento.';
  } else if (v.birth > todayISO()) {
    errors.birth = 'La fecha de nacimiento no puede ser futura.';
  } else if (ageFrom(v.birth) < 16) {
    errors.birth = 'Debes tener al menos 16 años para registrarte.';
  }
  if (!v.terms) errors.terms = 'Debes aceptar los términos y la política de privacidad para continuar.';
  return errors;
}

export default function RegistroPage() {
  const { refresh } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const sinCupo = !settings.phase3 && settings.patients_count >= settings.patient_limit;
  const cuposLibres = Math.max(0, settings.patient_limit - settings.patients_count);
  const [values, setValues] = useState<Values>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = <K extends keyof Values>(key: K, value: Values[K]) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const found = validateRegistro(values);
    setErrors(found);
    setServerError(null);
    if (Object.keys(found).length > 0) return;
    setBusy(true);
    try {
      await repo.signUp({
        email: values.email.trim(),
        password: values.password,
        full_name: values.name.trim(),
        birth_date: values.birth,
      });
      await refresh();
      navigate('/mi-panel', { replace: true });
    } catch (error) {
      setServerError(errorMessage(error));
      setBusy(false);
    }
  };

  const strength = passwordStrength(values.password);

  return (
    <AuthShell title="Crear cuenta" subtitle="Guarda tus favoritos y tu ficha en un solo lugar.">
      <form onSubmit={submit} noValidate className="flex flex-col gap-5">
        {sinCupo ? (
          <p role="alert" className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
            Por ahora no hay cupos para nuevos pacientes.
          </p>
        ) : null}
        {!settings.phase3 && !sinCupo ? (
          <p className="text-sm font-semibold text-slate-600">Cupos disponibles: {cuposLibres}</p>
        ) : null}
        <TextField
          label="Nombre completo"
          autoComplete="name"
          value={values.name}
          onChange={(e) => set('name', e.target.value)}
          error={errors.name}
        />
        <TextField
          label="Correo electrónico"
          type="email"
          autoComplete="email"
          value={values.email}
          onChange={(e) => set('email', e.target.value)}
          error={errors.email}
        />
        <PasswordField
          id="registro-clave"
          label="Contraseña"
          autoComplete="new-password"
          value={values.password}
          onChange={(v) => set('password', v)}
          error={errors.password}
          hint={
            values.password ? (
              <span>
                <span className="inline-flex gap-1" aria-hidden="true">
                  {[0, 1, 2, 3].map((i) => (
                    <span key={i} className={`h-1.5 w-8 rounded-full ${i < strength ? 'bg-brand-blue' : 'bg-slate-200'}`} />
                  ))}
                </span>
                <span className="ml-2">Seguridad: {STRENGTH[strength]}</span>
              </span>
            ) : (
              'Mínimo 8 caracteres.'
            )
          }
        />
        <PasswordField
          id="registro-confirmar"
          label="Confirmar contraseña"
          autoComplete="new-password"
          value={values.confirm}
          onChange={(v) => set('confirm', v)}
          error={errors.confirm}
        />
        <TextField
          label="Fecha de nacimiento"
          type="date"
          autoComplete="bday"
          value={values.birth}
          onChange={(e) => set('birth', e.target.value)}
          error={errors.birth}
          hint="Debes tener al menos 16 años."
        />

        <div>
          <div className="flex items-start gap-3">
            <input
              id="registro-terminos"
              type="checkbox"
              checked={values.terms}
              onChange={(e) => set('terms', e.target.checked)}
              aria-invalid={errors.terms ? true : undefined}
              aria-describedby={errors.terms ? 'registro-terminos-error' : undefined}
              className="mt-1 h-5 w-5 shrink-0 accent-brand-blue"
            />
            <label htmlFor="registro-terminos" className="text-sm font-semibold text-navy-900">
              Acepto los términos y la política de privacidad
            </label>
          </div>
          <p className="mt-2 pl-8 text-sm">
            <Link to="/privacidad" target="_blank" rel="noreferrer" className="font-bold text-brand-blue hover:underline">
              Leer la política de privacidad (se abre en otra pestaña)
            </Link>
          </p>
          {errors.terms ? (
            <p id="registro-terminos-error" className="mt-1.5 pl-8 text-sm font-semibold text-red-600">{errors.terms}</p>
          ) : null}
        </div>

        {serverError ? (
          <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {serverError}
          </p>
        ) : null}

        <button type="submit" disabled={busy || sinCupo} className={buttonClasses({ variant: 'primary', size: 'lg' }, 'w-full')}>
          {busy ? 'Creando cuenta…' : 'Crear cuenta'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm font-semibold text-slate-600">
        ¿Ya tienes cuenta?{' '}
        <Link to="/ingresar" className="font-bold text-brand-blue hover:underline">Ingresar</Link>
      </p>
    </AuthShell>
  );
}

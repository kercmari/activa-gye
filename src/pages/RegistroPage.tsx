import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { repo } from '../data';
import { useAuth } from '../auth/AuthContext';
import { useSettings } from '../auth/SettingsContext';
import AuthShell from '../components/profile/AuthShell';
import AvatarField from '../components/profile/AvatarField';
import PasswordField from '../components/profile/PasswordField';
import { ageFrom, todayISO } from '../components/profile/labels';
import { buttonClasses } from '../components/ui/Button';
import { TextField } from '../components/ui/Field';
import { errorMessage } from '../components/ui/States';
import { AppError, type AccountType } from '../data/types';

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
type Errors = Partial<Record<keyof Values | 'photo', string>>;

const EMPTY: Values = { name: '', email: '', password: '', confirm: '', birth: '', terms: false };

const TIPOS: { value: AccountType; titulo: string; texto: string }[] = [
  { value: 'paciente', titulo: 'Soy paciente', texto: 'Quiero seguimiento nutricional y mi plan de comidas.' },
  { value: 'nutricionista', titulo: 'Soy nutricionista', texto: 'Quiero acompañar a pacientes. Revisamos tu cuenta antes de activarla.' },
];

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

function validateRegistro(v: Values, foto: File | null): Errors {
  const errors: Errors = {};
  if (!foto) errors.photo = 'Agrega una foto tuya.';
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
  const [params] = useSearchParams();
  const [tipo, setTipo] = useState<AccountType>(params.get('tipo') === 'nutricionista' ? 'nutricionista' : 'paciente');
  const esNutricionista = tipo === 'nutricionista';
  // El cupo de pacientes solo frena a pacientes: una solicitud de nutricionista siempre se puede enviar.
  const sinCupo = !esNutricionista && !settings.phase3 && settings.patients_count >= settings.patient_limit;
  const cuposLibres = Math.max(0, settings.patient_limit - settings.patients_count);
  const [values, setValues] = useState<Values>(EMPTY);
  const [foto, setFoto] = useState<File | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [confirmar, setConfirmar] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set =<K extends keyof Values>(key: K, value: Values[K]) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const found = validateRegistro(values, foto);
    setErrors(found);
    setServerError(null);
    if (Object.keys(found).length > 0 || !foto) return;
    setBusy(true);
    try {
      await repo.signUp({
        email: values.email.trim(),
        password: values.password,
        full_name: values.name.trim(),
        birth_date: values.birth,
        account_type: tipo,
        photo: foto,
      });
      await refresh();
      // Nutricionista: queda pendiente de aprobación, así que va a su perfil con el aviso de revisión.
      navigate(esNutricionista ? '/perfil' : '/mi-panel', { replace: true });
    } catch (error) {
      // La cuenta se creó pero falta confirmar el correo: es un aviso de éxito, no un error.
      if (error instanceof AppError && error.code === 'CORREO_SIN_CONFIRMAR') {
        setConfirmar(errorMessage(error));
      } else {
        setServerError(errorMessage(error));
      }
      setBusy(false);
    }
  };

  const strength = passwordStrength(values.password);

  if (confirmar) {
    return (
      <AuthShell title="Revisa tu correo" subtitle="Tu cuenta ya está creada.">
        <div role="status" className="rounded-xl bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-800">
          {confirmar}
        </div>
        <Link
          to="/ingresar"
          className={buttonClasses({ variant: 'primary', size: 'lg' }, 'mt-6 w-full')}
        >
          Ir a ingresar
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Crear cuenta" subtitle="Guarda tus favoritos y tu ficha en un solo lugar.">
      <form onSubmit={submit} noValidate className="flex flex-col gap-5">
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-1 text-[11px] font-extrabold uppercase tracking-[0.2em] text-slate-500">¿Cómo te registras?</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {TIPOS.map((t) => {
              const activo = tipo === t.value;
              return (
                <label
                  key={t.value}
                  className={[
                    'flex cursor-pointer items-start gap-3 rounded-2xl border-2 p-4 transition-colors',
                    activo ? 'border-brand-blue bg-sky-50' : 'border-slate-200 bg-white hover:border-slate-300',
                  ].join(' ')}
                >
                  <input
                    type="radio"
                    name="tipo-cuenta"
                    value={t.value}
                    checked={activo}
                    onChange={() => setTipo(t.value)}
                    className="mt-1 h-4 w-4 shrink-0 accent-brand-blue"
                  />
                  <span>
                    <span className="block font-extrabold text-navy-900">{t.titulo}</span>
                    <span className="mt-1 block text-sm text-slate-600">{t.texto}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        {esNutricionista ? (
          <p role="status" className="rounded-xl bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-800">
            Tu cuenta de nutricionista queda en revisión. El equipo la aprueba y te avisamos.
          </p>
        ) : null}
        {sinCupo ? (
          <p role="alert" className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
            Por ahora no hay cupos para nuevos pacientes.
          </p>
        ) : null}
        {!esNutricionista && !settings.phase3 && !sinCupo ? (
          <p className="text-sm font-semibold text-slate-600">Cupos disponibles: {cuposLibres}</p>
        ) : null}

        <div>
          <AvatarField
            savedUrl={null}
            value={foto}
            onChange={(f) => {
              setFoto(f);
              setErrors((prev) => ({ ...prev, photo: undefined }));
            }}
            error={errors.photo ?? null}
          />
        </div>
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

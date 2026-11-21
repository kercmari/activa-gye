import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { repo } from '../data';
import { useAuth } from '../auth/AuthContext';
import AuthShell from '../components/profile/AuthShell';
import PasswordField from '../components/profile/PasswordField';
import { safeInternalPath } from '../components/profile/paths';
import { buttonClasses } from '../components/ui/Button';
import { TextField } from '../components/ui/Field';
import { errorMessage } from '../components/ui/States';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Cuentas del simulador (solo para probar; ver docs/entrega/CUENTAS-DE-PRUEBA.md). */
const CUENTAS_PRUEBA = [
  { rol: 'Usuario', correo: 'usuario@activagye.test', clave: 'ActivaUser2026!' },
  { rol: 'Nutricionista', correo: 'nutri@activagye.test', clave: 'ActivaNutri2026!' },
  { rol: 'Admin', correo: 'admin@activagye.test', clave: 'ActivaAdmin2026!' },
];

interface Errors { email?: string; password?: string }

export default function IngresarPage() {
  const { refresh } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const volver = safeInternalPath(params.get('volver'));
  const destino = volver ?? '/perfil';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const found: Errors = {};
    if (!EMAIL_RE.test(email.trim())) found.email = 'Escribe un correo válido, por ejemplo nombre@correo.com.';
    if (!password) found.password = 'Escribe tu contraseña.';
    setErrors(found);
    setServerError(null);
    if (Object.keys(found).length > 0) return;
    setBusy(true);
    try {
      await repo.signIn(email.trim(), password);
      await refresh();
      navigate(destino, { replace: true });
    } catch (error) {
      setServerError(errorMessage(error));
      setBusy(false);
    }
  };

  const registroTo = volver ? `/registro?volver=${encodeURIComponent(volver)}` : '/registro';

  return (
    <AuthShell title="Ingresar" subtitle="Entra para ver tu perfil, tus favoritos, tu plan y tu progreso.">
      <form onSubmit={submit} noValidate className="flex flex-col gap-5">
        <TextField
          label="Correo electrónico"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
        />
        <PasswordField
          id="ingresar-clave"
          label="Contraseña"
          autoComplete="current-password"
          value={password}
          onChange={setPassword}
          error={errors.password}
        />
        {serverError ? (
          <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {serverError}
          </p>
        ) : null}
        <button type="submit" disabled={busy} className={buttonClasses({ variant: 'primary', size: 'lg' }, 'w-full')}>
          {busy ? 'Ingresando…' : 'Ingresar'}
        </button>
      </form>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm font-bold">
        <Link to="/recuperar" className="text-brand-blue hover:underline">¿Olvidaste tu contraseña?</Link>
        <Link to={registroTo} className="text-navy-900 hover:underline">Crear cuenta</Link>
      </div>

      <div className="mt-8 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
        <p className="font-extrabold text-navy-900">Cuentas de prueba</p>
        <ul className="mt-2 flex flex-col gap-2">
          {CUENTAS_PRUEBA.map((c) => (
            <li key={c.correo}>
              <span className="font-semibold">{c.rol}:</span> <code className="break-all">{c.correo}</code> · <code>{c.clave}</code>
            </li>
          ))}
        </ul>
      </div>
    </AuthShell>
  );
}

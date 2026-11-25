import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { repo, usingSupabase } from '../data';
import AuthShell from '../components/profile/AuthShell';
import CorreoEnviado from '../components/profile/CorreoEnviado';
import { buttonClasses } from '../components/ui/Button';
import { TextField } from '../components/ui/Field';
import { errorMessage } from '../components/ui/States';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RecuperarPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [serverError, setServerError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setServerError(null);
    if (!EMAIL_RE.test(email.trim())) {
      setError('Escribe un correo válido, por ejemplo nombre@correo.com.');
      return;
    }
    setError(undefined);
    setBusy(true);
    try {
      await repo.requestPasswordReset(email.trim());
      setEnviado(true);
    } catch (err) {
      setServerError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title="Recuperar contraseña" subtitle="Escribe el correo de tu cuenta.">
      {enviado ? (
        <div className="flex flex-col gap-6">
          <CorreoEnviado
            email={email.trim().toLowerCase()}
            que="un enlace para crear una nueva contraseña (si ese correo tiene cuenta)"
          />
          <Link to="/ingresar" className={buttonClasses({ variant: 'secondary' }, 'w-full')}>
            Volver a ingresar
          </Link>
        </div>
      ) : (
        <form onSubmit={submit} noValidate className="flex flex-col gap-5">
          <TextField
            label="Correo electrónico"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={error}
          />
          {serverError ? (
            <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{serverError}</p>
          ) : null}
          <button type="submit" disabled={busy} className={buttonClasses({ variant: 'primary', size: 'lg' }, 'w-full')}>
            {busy ? 'Enviando…' : 'Enviar enlace'}
          </button>
          <p className="text-center text-sm font-semibold text-slate-600">
            <Link to="/ingresar" className="text-brand-blue hover:underline">Volver a ingresar</Link>
          </p>
        </form>
      )}
      {usingSupabase ? null : <p className="mt-6 text-xs text-slate-500">En la versión de prueba no se envían correos.</p>}
    </AuthShell>
  );
}

import { useEffect, useState } from 'react';
import { repo } from '../../data';
import { errorMessage } from '../ui/States';
import { AppError } from '../../data/types';

interface Props {
  /** Correo al que se mandó el enlace. */
  email: string;
  /** Qué se envió, por ejemplo «un enlace para confirmar tu cuenta». */
  que: string;
  /** Muestra «Reenviar correo» (confirmación de registro). */
  reenviar?: boolean;
}

/** Aviso de correo enviado: dice a qué correo fue, dónde buscarlo y permite reenviarlo. */
export default function CorreoEnviado({ email, que, reenviar = false }: Props) {
  const [estado, setEstado] = useState<'listo' | 'enviando' | 'reenviado'>('listo');
  const [error, setError] = useState<string | null>(null);
  // Supabase permite un correo por minuto: el botón espera 60 s después de cada envío.
  const [espera, setEspera] = useState(0);
  useEffect(() => {
    if (espera <= 0) return;
    const t = setTimeout(() => setEspera((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [espera]);

  const otraVez = async () => {
    setError(null);
    setEstado('enviando');
    try {
      await repo.resendSignupConfirmation(email);
      setEstado('reenviado');
      setEspera(60);
    } catch (err) {
      setError(errorMessage(err));
      setEstado('listo');
      if (err instanceof AppError && err.code === 'ESPERA_CORREO') setEspera(60);
    }
  };

  return (
    <div role="status" className="flex flex-col gap-3 rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-900">
      <p className="font-semibold">
        Te enviamos {que} a <strong className="break-all">{email}</strong>.
      </p>
      <p>Si no llega en unos minutos, revisa las carpetas Spam, Promociones o Notificaciones, y que el correo esté bien escrito.</p>
      {reenviar ? (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={otraVez}
            disabled={estado === 'enviando' || espera > 0}
            className="min-h-11 self-start rounded-full border border-blue-300 bg-white px-4 font-bold text-blue-800 hover:bg-blue-100 disabled:opacity-60"
          >
            {estado === 'enviando' ? 'Reenviando…' : espera > 0 ? `Reenviar correo (${espera} s)` : 'Reenviar correo'}
          </button>
          {estado === 'reenviado' ? <p className="font-semibold">Listo: lo enviamos otra vez a {email}.</p> : null}
          {error ? <p role="alert" className="font-semibold text-red-700">{error}</p> : null}
        </div>
      ) : null}
    </div>
  );
}

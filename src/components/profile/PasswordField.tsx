import { Eye, EyeOff } from 'lucide-react';
import { useState, type ReactNode } from 'react';

interface Props {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  error?: string;
  hint?: ReactNode;
}

/** Campo de contraseña con botón para mostrar u ocultar el texto. */
export default function PasswordField({ id, label, value, onChange, autoComplete, error, hint }: Props) {
  const [show, setShow] = useState(false);
  const errorId = `${id}-error`;
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-[11px] font-extrabold uppercase tracking-[0.2em] text-slate-500">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={[
            'w-full rounded-xl border bg-white py-3 pl-4 pr-12 text-navy-900 outline-none transition-colors',
            'focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20',
            error ? 'border-red-500' : 'border-slate-200',
          ].join(' ')}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          className="absolute inset-y-0 right-0 flex items-center px-4 text-slate-500 hover:text-navy-900"
        >
          {show ? <EyeOff className="h-5 w-5" aria-hidden="true" /> : <Eye className="h-5 w-5" aria-hidden="true" />}
        </button>
      </div>
      {error ? (
        <p id={errorId} className="mt-1.5 text-sm font-semibold text-red-600">{error}</p>
      ) : hint ? (
        <div className="mt-1.5 text-sm text-slate-500">{hint}</div>
      ) : null}
    </div>
  );
}

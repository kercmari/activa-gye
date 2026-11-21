import { useEffect, useId, useRef, useState } from 'react';
import { buttonClasses } from '../ui/Button';
import { TextField } from '../ui/Field';

interface Props {
  title: string;
  text: string;
  confirmLabel: string;
  /** Si se indica, el botón de confirmar solo se activa cuando la persona escribe este texto exacto. */
  requireText?: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Diálogo propio para confirmar acciones (no usa window.confirm). Se monta solo cuando está abierto. */
export default function ConfirmDialog({ title, text, confirmLabel, requireText, busy = false, onConfirm, onCancel }: Props) {
  const [typed, setTyped] = useState('');
  const titleId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onCancel();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [busy, onCancel]);

  const blocked = busy || (requireText !== undefined && typed !== requireText);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/60 p-4">
      <div role="dialog" aria-modal="true" aria-labelledby={titleId} className="w-full max-w-md rounded-[1.75rem] bg-white p-8 shadow-2xl">
        <h2 id={titleId} className="display text-2xl text-navy-900">{title}</h2>
        <p className="mt-3 text-slate-600">{text}</p>
        {requireText !== undefined ? (
          <div className="mt-6">
            <TextField
              label={`Escribe ${requireText} para confirmar`}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
            />
          </div>
        ) : null}
        <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            disabled={busy}
            className={buttonClasses({ variant: 'secondary' })}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={blocked}
            className={buttonClasses({ variant: 'danger' })}
          >
            {busy ? 'Procesando…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';

interface Common {
  label: string;
  id?: string;
  error?: string;
  hint?: ReactNode;
}

function useFieldIds(id?: string) {
  const auto = useId();
  const fieldId = id ?? auto;
  return { fieldId, errorId: `${fieldId}-error` };
}

const labelClass = 'mb-2 block text-[11px] font-extrabold uppercase tracking-[0.2em] text-slate-500';
function controlClass(hasError: boolean) {
  return [
    'w-full rounded-xl border bg-white px-4 py-3 text-navy-900 outline-none transition-colors placeholder:text-slate-400',
    'focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20',
    hasError ? 'border-red-500' : 'border-slate-200',
  ].join(' ');
}

function FieldFrame({ label, fieldId, error, hint, children }: Common & { fieldId: string; errorId: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={fieldId} className={labelClass}>{label}</label>
      {children}
      {error ? <p className="mt-1.5 text-sm font-semibold text-red-600">{error}</p> : hint ? <p className="mt-1.5 text-sm text-slate-500">{hint}</p> : null}
    </div>
  );
}

export type TextFieldProps = Common & InputHTMLAttributes<HTMLInputElement>;
export function TextField({ label, id, error, hint, className: _c, ...rest }: TextFieldProps) {
  const { fieldId, errorId } = useFieldIds(id);
  return (
    <FieldFrame label={label} fieldId={fieldId} errorId={errorId} error={error} hint={hint}>
      <input
        id={fieldId}
        className={controlClass(!!error)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        {...rest}
      />
    </FieldFrame>
  );
}

export type SelectFieldProps = Common & SelectHTMLAttributes<HTMLSelectElement>;
export function SelectField({ label, id, error, hint, children, className: _c, ...rest }: SelectFieldProps) {
  const { fieldId, errorId } = useFieldIds(id);
  return (
    <FieldFrame label={label} fieldId={fieldId} errorId={errorId} error={error} hint={hint}>
      <select
        id={fieldId}
        className={controlClass(!!error)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        {...rest}
      >
        {children}
      </select>
    </FieldFrame>
  );
}

export type TextAreaProps = Common & TextareaHTMLAttributes<HTMLTextAreaElement>;
export function TextArea({ label, id, error, hint, className: _c, rows = 5, ...rest }: TextAreaProps) {
  const { fieldId, errorId } = useFieldIds(id);
  return (
    <FieldFrame label={label} fieldId={fieldId} errorId={errorId} error={error} hint={hint}>
      <textarea
        id={fieldId}
        rows={rows}
        className={controlClass(!!error)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        {...rest}
      />
    </FieldFrame>
  );
}

import { Star } from 'lucide-react';

const NUMEROS = [1, 2, 3, 4, 5] as const;

/** 4.5 -> "4,5" (coma decimal, como se escribe en Ecuador). */
function formatNumero(n: number): string {
  return n.toFixed(1).replace('.', ',');
}

/** Estrellas de solo lectura. Las estrellas llenas son el valor redondeado; el número se muestra junto. */
export function Stars({ value, showNumber = true }: { value: number; showNumber?: boolean }) {
  const llenas = Math.round(value);
  return (
    <span className="inline-flex items-center gap-2">
      <span className="inline-flex items-center gap-0.5" role="img" aria-label={`${formatNumero(value)} de 5 estrellas`}>
        {NUMEROS.map((n) => (
          <Star
            key={n}
            aria-hidden="true"
            className={`h-4 w-4 ${n <= llenas ? 'fill-current text-brand-orange' : 'text-slate-300'}`}
          />
        ))}
      </span>
      {showNumber ? <span className="text-sm font-extrabold text-navy-900">{formatNumero(value)}</span> : null}
    </span>
  );
}

interface StarInputProps {
  value: number;
  onChange: (stars: number) => void;
  disabled?: boolean;
}

/** Selector de 1 a 5 estrellas con botones accesibles (`aria-label="N estrellas"`). */
export function StarInput({ value, onChange, disabled = false }: StarInputProps) {
  return (
    <div role="group" aria-label="Tu calificación" className="flex items-center gap-1">
      {NUMEROS.map((n) => (
        <button
          key={n}
          type="button"
          aria-label={`${n} estrellas`}
          disabled={disabled}
          onClick={() => onChange(n)}
          className="rounded-lg p-1 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/40 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Star
            aria-hidden="true"
            className={`h-8 w-8 ${n <= value ? 'fill-current text-brand-orange' : 'text-slate-300'}`}
          />
        </button>
      ))}
    </div>
  );
}

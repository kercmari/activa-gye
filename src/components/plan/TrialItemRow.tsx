import { useState } from 'react';
import { Dumbbell, Target, Utensils, ChevronDown, type LucideIcon } from 'lucide-react';
import type { TrialItem, TrialItemKind } from '../../data';
import { errorMessage } from '../ui/States';

const KIND: Record<TrialItemKind, { label: string; icon: LucideIcon }> = {
  comida: { label: 'Comida', icon: Utensils },
  rutina: { label: 'Rutina', icon: Dumbbell },
  habito: { label: 'Hábito', icon: Target },
};

export interface TrialItemRowProps {
  item: TrialItem;
  /** true si el día está cerrado o ya completo: no se puede marcar. */
  disabled: boolean;
  onToggle: (done: boolean) => Promise<void>;
}

/** Un ítem del día: casilla, hora, tipo y detalle desplegable. */
export function TrialItemRow({ item, disabled, onToggle }: TrialItemRowProps) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { label, icon: Icon } = KIND[item.kind];
  const detailId = `detalle-${item.id}`;

  const toggle = async () => {
    setBusy(true);
    setError(null);
    try {
      await onToggle(!item.done);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <div className="flex items-start gap-3">
        <input
          id={`item-${item.id}`}
          type="checkbox"
          checked={item.done}
          disabled={disabled || busy}
          onChange={() => void toggle()}
          className="mt-1 h-5 w-5 shrink-0 cursor-pointer accent-brand-orange disabled:cursor-not-allowed"
        />
        <div className="min-w-0 flex-1">
          <label htmlFor={`item-${item.id}`} className="block cursor-pointer">
            <span className="flex flex-wrap items-center gap-x-2 text-xs font-bold text-slate-500">
              <span>{item.at_time}</span>
              <span className="inline-flex items-center gap-1">
                <Icon aria-hidden="true" className="h-3.5 w-3.5" />
                {label}
              </span>
            </span>
            <span className={`mt-1 block font-bold ${item.done ? 'text-slate-400 line-through' : 'text-navy-900'}`}>
              {item.title}
            </span>
          </label>
          {item.detail ? (
            <>
              <button
                type="button"
                aria-expanded={open}
                aria-controls={detailId}
                onClick={() => setOpen((v) => !v)}
                className="mt-1 inline-flex items-center gap-1 rounded-lg px-1 text-xs font-bold text-brand-blue hover:underline"
              >
                {open ? 'Ocultar detalle' : 'Ver detalle'}
                <ChevronDown aria-hidden="true" className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
              </button>
              {open ? (
                <p id={detailId} className="mt-2 whitespace-pre-line text-sm text-slate-600">
                  {item.detail}
                </p>
              ) : null}
            </>
          ) : null}
          {error ? (
            <p role="alert" className="mt-2 text-sm font-semibold text-red-700">
              {error}
            </p>
          ) : null}
        </div>
      </div>
    </li>
  );
}

export default TrialItemRow;

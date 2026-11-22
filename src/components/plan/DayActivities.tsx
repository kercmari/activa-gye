/** Lista de actividades de un día abierto: hora, punto, título, detalle y casilla para marcar. */
import { Check } from 'lucide-react';
import type { TrialItem } from '../../data';

interface Props {
  items: TrialItem[];
  busyId: string | null;
  onToggle: (item: TrialItem) => void;
}

export default function DayActivities({ items, busyId, onToggle }: Props) {
  if (items.length === 0) {
    return <p className="text-slate-500">No hay actividades este día.</p>;
  }
  return (
    <ol className="space-y-5">
      {items.map((item) => (
        <li key={item.id} className="flex gap-4" data-testid="actividad">
          <span className="w-14 shrink-0 pt-0.5 text-sm font-bold text-navy-900">{item.at_time}</span>
          <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-brand-orange" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className={`font-semibold ${item.done ? 'text-slate-400 line-through' : 'text-navy-900'}`}>{item.title}</p>
            {item.detail ? <p className="text-sm text-slate-500">{item.detail}</p> : null}
          </div>
          <button
            type="button"
            onClick={() => onToggle(item)}
            disabled={busyId === item.id}
            aria-label={`${item.done ? 'Desmarcar' : 'Marcar'}: ${item.title}`}
            aria-pressed={item.done}
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-2 transition disabled:opacity-50 ${item.done ? 'border-brand-orange bg-brand-orange text-white' : 'border-slate-300 bg-white text-transparent hover:border-brand-orange'}`}
          >
            <Check className="h-4 w-4" aria-hidden="true" />
          </button>
        </li>
      ))}
    </ol>
  );
}

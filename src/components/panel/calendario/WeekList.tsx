import { Check } from 'lucide-react';
import type { PlanDay } from '../../../data/types';
import { parseISO } from '../../profile/labels';
import { WEEKDAY_SHORT, weekDays } from './calendarUtils';

interface Props {
  anchor: string;
  byDate: Map<string, PlanDay>;
  selected: string | null;
  onSelect: (day: string) => void;
  onPrevWeek: () => void;
  onNextWeek: () => void;
}

/** Vista de celular: los siete días de la semana en lista, con ‹ › para cambiar de semana. */
export default function WeekList({ anchor, byDate, selected, onSelect, onPrevWeek, onNextWeek }: Props) {
  const days = weekDays(anchor);
  const first = parseISO(days[0]);
  const last = parseISO(days[6]);
  const range = `${first.getDate()} de ${first.toLocaleDateString('es-EC', { month: 'short' })} – ${last.getDate()} de ${last.toLocaleDateString('es-EC', { month: 'short' })}`;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onPrevWeek}
          aria-label="Semana anterior"
          className="rounded-xl px-3 py-2 text-lg font-extrabold text-navy-900 hover:bg-slate-100"
        >
          ‹
        </button>
        <p className="text-center text-sm font-extrabold text-navy-900">Semana del {range}</p>
        <button
          type="button"
          onClick={onNextWeek}
          aria-label="Semana siguiente"
          className="rounded-xl px-3 py-2 text-lg font-extrabold text-navy-900 hover:bg-slate-100"
        >
          ›
        </button>
      </div>
      <ul className="divide-y divide-slate-100">
        {days.map((iso, i) => {
          const plan = byDate.get(iso);
          const date = parseISO(iso).getDate();
          const label = `${WEEKDAY_SHORT[i]} ${date}`;
          if (!plan) {
            return (
              <li key={iso} className="flex items-center justify-between py-3 text-slate-400">
                <span className="font-semibold">{label}</span>
                <span className="text-sm">Sin plan</span>
              </li>
            );
          }
          const done = plan.done_at !== null;
          return (
            <li key={iso}>
              <button
                type="button"
                aria-pressed={selected === iso}
                onClick={() => onSelect(iso)}
                className={`flex w-full items-center justify-between gap-3 rounded-xl px-2 py-3 text-left hover:bg-slate-50 ${selected === iso ? 'bg-navy-900/5' : ''}`}
              >
                <span className="min-w-0">
                  <span className="block font-extrabold text-navy-900">{label}</span>
                  <span className="block truncate text-sm text-slate-600">{plan.title}</span>
                </span>
                {done ? (
                  <span className="flex shrink-0 items-center gap-1 text-sm font-bold text-emerald-700">
                    <Check className="h-4 w-4" aria-hidden="true" /> Cumplido
                  </span>
                ) : (
                  <span className="flex shrink-0 items-center gap-2 text-sm font-bold text-brand-orange">
                    <span className="h-2.5 w-2.5 rounded-full bg-brand-orange" aria-hidden="true" /> Pendiente
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

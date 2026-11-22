import { Check } from 'lucide-react';
import type { PlanDay } from '../../../data/types';
import { parseISO } from '../../profile/labels';
import { WEEKDAY_SHORT, dayLabel, monthGrid } from './calendarUtils';

interface Props {
  month: string;
  today: string;
  byDate: Map<string, PlanDay>;
  selected: string | null;
  onSelect: (day: string) => void;
}

/** Cuadrícula lunes–domingo del mes. Solo los días con plan son botones. */
export default function MonthGrid({ month, today, byDate, selected, onSelect }: Props) {
  const currentMonth = month.slice(0, 7);
  const weeks = monthGrid(month);

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-extrabold uppercase tracking-wide text-slate-500">
        {WEEKDAY_SHORT.map((name) => (
          <span key={name} className="py-2">{name}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {weeks.flat().map((iso) => {
          const plan = byDate.get(iso);
          const inMonth = iso.startsWith(currentMonth);
          const isToday = iso === today;
          const number = parseISO(iso).getDate();
          const cellBase = `flex min-h-14 flex-col items-center justify-start gap-1 rounded-2xl px-1 py-2 text-sm ${inMonth ? 'text-navy-900' : 'text-slate-300'} ${isToday ? 'ring-2 ring-navy-900' : ''}`;

          if (!plan) {
            return (
              <div key={iso} className={cellBase} aria-label={`${dayLabel(iso)}, sin plan`}>
                <span className="font-semibold">{number}</span>
              </div>
            );
          }

          const done = plan.done_at !== null;
          return (
            <button
              key={iso}
              type="button"
              aria-pressed={selected === iso}
              aria-label={`${dayLabel(iso)}, ${done ? 'cumplido' : 'pendiente'}`}
              onClick={() => onSelect(iso)}
              className={`${cellBase} cursor-pointer transition hover:bg-slate-100 ${selected === iso ? 'bg-navy-900/5' : ''}`}
            >
              <span className="font-extrabold">{number}</span>
              {done ? (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white" aria-hidden="true">
                  <Check className="h-3.5 w-3.5" />
                </span>
              ) : (
                <span className="h-2.5 w-2.5 rounded-full bg-brand-orange" aria-hidden="true" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

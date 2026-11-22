/** Mes de la Agenda: lunes primero, días de otros meses atenuados, punto naranja con actividades y candado en días cerrados. */
import { ChevronLeft, ChevronRight, Lock } from 'lucide-react';

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const DAY_MS = 86_400_000;

interface Props {
  year: number;
  /** 1–12 */
  month: number;
  /** 'AAAA-MM-DD' */
  selected: string;
  today: string;
  dotDates: Set<string>;
  lockedDates: Set<string>;
  onSelect: (date: string) => void;
  onPrev: () => void;
  onNext: () => void;
}

function iso(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

function buildCells(year: number, month: number): { date: string; inMonth: boolean }[] {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const offset = (first.getUTCDay() + 6) % 7; // lunes = 0
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const total = Math.ceil((offset + daysInMonth) / 7) * 7;
  const start = Date.UTC(year, month - 1, 1 - offset);
  const cells: { date: string; inMonth: boolean }[] = [];
  for (let i = 0; i < total; i++) {
    const ms = start + i * DAY_MS;
    cells.push({ date: iso(ms), inMonth: new Date(ms).getUTCMonth() === month - 1 });
  }
  return cells;
}

function labelOf(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return `${d} de ${MESES[m - 1]} de ${y}`;
}

export default function MonthCalendar({ year, month, selected, today, dotDates, lockedDates, onSelect, onPrev, onNext }: Props) {
  const cells = buildCells(year, month);
  const title = `${MESES[month - 1].charAt(0).toUpperCase()}${MESES[month - 1].slice(1)} ${year}`;

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <h3 className="display text-xl text-navy-900">{title}</h3>
        <div className="flex gap-2">
          <button type="button" onClick={onPrev} aria-label="Mes anterior" className="flex h-9 w-9 items-center justify-center rounded-full text-navy-900 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-brand-orange">
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          <button type="button" onClick={onNext} aria-label="Mes siguiente" className="flex h-9 w-9 items-center justify-center rounded-full text-navy-900 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-brand-orange">
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1 text-center text-xs font-bold text-slate-500">
        {DIAS.map((d) => <span key={d}>{d}</span>)}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((c) => {
          const isSelected = c.date === selected;
          const isToday = c.date === today;
          const locked = lockedDates.has(c.date);
          const dot = dotDates.has(c.date);
          const dayNumber = Number(c.date.slice(8));
          const tone = isSelected
            ? 'bg-navy-900 text-white'
            : c.inMonth ? 'text-navy-900 hover:bg-slate-100' : 'text-slate-300 hover:bg-slate-50';
          return (
            <button
              key={c.date}
              type="button"
              data-date={c.date}
              data-outside={c.inMonth ? undefined : 'true'}
              aria-label={labelOf(c.date)}
              aria-pressed={isSelected}
              aria-current={isToday ? 'date' : undefined}
              onClick={() => onSelect(c.date)}
              className={`relative mx-auto flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold transition ${tone} ${isToday && !isSelected ? 'ring-2 ring-brand-orange/60' : ''}`}
            >
              <span>{dayNumber}</span>
              {locked ? (
                <Lock className="absolute bottom-0.5 h-2.5 w-2.5 text-slate-400" aria-hidden="true" />
              ) : dot ? (
                <span className={`absolute bottom-1 h-1.5 w-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-brand-orange'}`} aria-hidden="true" />
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-brand-orange" aria-hidden="true" />Días con actividades</span>
        <span className="flex items-center gap-2"><Lock className="h-3 w-3" aria-hidden="true" />Días cerrados</span>
      </div>
    </div>
  );
}

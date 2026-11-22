import { useState } from 'react';
import { repo } from '../../data';
import type { PlanDay } from '../../data/types';
import { useAuth } from '../../auth/AuthContext';
import ProgressTab from '../profile/ProgressTab';
import { addDaysISO, todayISO } from '../profile/labels';
import { useAsync } from '../profile/useAsync';
import { buttonClasses } from '../ui/Button';
import { EmptyState, ErrorState, Loading } from '../ui/States';
import DayDetail from './calendario/DayDetail';
import MonthGrid from './calendario/MonthGrid';
import WeekList from './calendario/WeekList';
import { monthProgress, monthRange, monthStartOf, monthTitle, shiftMonth } from './calendario/calendarUtils';
import { useIsNarrow } from './calendario/useIsNarrow';

/** Pestaña "Calendario y progreso": calendario del plan, progreso del mes y registro de peso. */
export default function CalendarioTab() {
  const { session } = useAuth();
  if (!session) return null;
  return <CalendarioContent userId={session.user.id} />;
}

function CalendarioContent({ userId }: { userId: string }) {
  const today = todayISO();
  const narrow = useIsNarrow();
  const [month, setMonth] = useState(() => monthStartOf(today));
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [weekAnchor, setWeekAnchor] = useState(today);
  // Días guardados en esta sesión; así el detalle se actualiza sin recargar el mes.
  const [overrides, setOverrides] = useState<Record<string, PlanDay>>({});

  const { from, to } = monthRange(month);
  const list = useAsync(() => repo.listPlanDays(userId, from, to), [userId, month]);

  const days: PlanDay[] = list.status === 'ok' ? list.data.map((d) => overrides[d.id] ?? d) : [];
  const byDate = new Map(days.map((d) => [d.day, d]));
  const selected = selectedDay ? byDate.get(selectedDay) ?? null : null;

  const goMonth = (delta: number) => {
    setMonth((m) => shiftMonth(m, delta));
    setSelectedDay(null);
    setWeekAnchor(shiftMonth(month, delta));
  };

  const goToday = () => {
    setMonth(monthStartOf(today));
    setSelectedDay(null);
    setWeekAnchor(today);
  };

  const selectDay = (iso: string) => {
    setSelectedDay(iso);
    setWeekAnchor(iso);
  };

  // En celular, cambiar de semana también cambia de mes si la semana cruza al mes vecino.
  const moveWeek = (delta: number) => {
    const next = addDaysISO(weekAnchor, delta * 7);
    setWeekAnchor(next);
    if (monthStartOf(next) !== month) {
      setMonth(monthStartOf(next));
      setSelectedDay(null);
    }
  };

  const progress = list.status === 'ok' ? monthProgress(days, today) : null;

  return (
    <div className="flex flex-col gap-6">
      {progress && progress.total > 0 ? (
        <section aria-labelledby="progreso-mes" className="rounded-[1.75rem] bg-white p-6 shadow-xl shadow-navy-900/5 md:p-8">
          <h2 id="progreso-mes" className="display text-2xl text-navy-900">Tu progreso del mes</h2>
          <p className="mt-3 text-lg font-extrabold text-navy-900">
            Cumpliste {progress.done} de {progress.total} días este mes
          </p>
          <div
            role="progressbar"
            aria-label="Días cumplidos este mes"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress.pct}
            className="mt-4 h-3 w-full overflow-hidden rounded-full bg-slate-100"
          >
            <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${progress.pct}%` }} />
          </div>
          <p className="mt-2 text-sm font-semibold text-slate-600">{progress.pct}% completado</p>
          <p className="mt-4 text-sm text-slate-700">
            {progress.streak > 0
              ? `Racha: ${progress.streak} ${progress.streak === 1 ? 'día seguido cumplido' : 'días seguidos cumplidos'}.`
              : 'Aún sin racha. Marca tus días al cumplirlos.'}
          </p>
        </section>
      ) : null}

      <section aria-labelledby="calendario-titulo" className="rounded-[1.75rem] bg-white p-6 shadow-xl shadow-navy-900/5 md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="calendario-titulo" className="display text-2xl capitalize text-navy-900">{monthTitle(month)}</h2>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => goMonth(-1)} className={buttonClasses({ variant: 'ghost', size: 'md' })}>
              ‹ Mes anterior
            </button>
            <button type="button" onClick={goToday} className={buttonClasses({ variant: 'secondary', size: 'md' })}>
              Hoy
            </button>
            <button type="button" onClick={() => goMonth(1)} className={buttonClasses({ variant: 'ghost', size: 'md' })}>
              Mes siguiente ›
            </button>
          </div>
        </div>

        <div className="mt-6">
          {list.status === 'loading' ? <Loading text="Cargando tu calendario…" /> : null}
          {list.status === 'error' ? <ErrorState message={list.message} onRetry={list.reload} /> : null}
          {list.status === 'ok' && days.length === 0 ? (
            <EmptyState
              title="Aún no hay días planificados"
              text="Tu nutricionista aún no arma tu calendario."
              action={{ to: '/mi-panel?tab=nutricionista', label: 'Ver mi nutricionista' }}
            />
          ) : null}
          {list.status === 'ok' && days.length > 0 && narrow ? (
            <WeekList
              anchor={weekAnchor}
              byDate={byDate}
              selected={selectedDay}
              onSelect={selectDay}
              onPrevWeek={() => moveWeek(-1)}
              onNextWeek={() => moveWeek(1)}
            />
          ) : null}
          {list.status === 'ok' && days.length > 0 && !narrow ? (
            <MonthGrid month={month} today={today} byDate={byDate} selected={selectedDay} onSelect={selectDay} />
          ) : null}
        </div>
      </section>

      {selected ? (
        <DayDetail
          key={selected.id}
          plan={selected}
          today={today}
          onClose={() => setSelectedDay(null)}
          onSaved={(updated) => setOverrides((o) => ({ ...o, [updated.id]: updated }))}
        />
      ) : null}

      <section aria-labelledby="mi-peso" className="flex flex-col gap-4">
        <h2 id="mi-peso" className="display text-2xl text-navy-900">Mi peso</h2>
        <ProgressTab />
      </section>
    </div>
  );
}

/** /mi-plan/progreso: resumen de la semana gratis, gráficos de chequeos e historial. */
import { EmptyState, ErrorState, Loading } from '../../components/ui/States';
import PageHeader from '../../components/ui/PageHeader';
import { useAuth } from '../../auth/AuthContext';
import { repo, type DailyCheckin, type Trial } from '../../data';
import { useAsync } from '../../components/profile/useAsync';
import { useTrial } from '../../components/plan/useTrial';
import MiniLineChart, { type ChartPoint } from '../../components/plan/MiniLineChart';
import { formatDate } from '../../components/nutrition/labels';

const DIAS_CHEQUEO = 30;
const EMOJI_ANIMO = ['', '😣', '🙁', '😐', '🙂', '😄'];

/** «21/11», sin año, para los ejes de los gráficos. */
function corto(iso: string): string {
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
}

function promedio(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function resumenPeso(checkins: DailyCheckin[]): string {
  const pesos = checkins.filter((c) => c.weight_kg !== null);
  if (pesos.length < 2) return 'Registra dos pesos para ver el cambio';
  const delta = (pesos[pesos.length - 1].weight_kg as number) - (pesos[0].weight_kg as number);
  if (Math.abs(delta) < 0.05) return 'Sin cambio';
  const signo = delta > 0 ? '+' : '−';
  return `${signo}${Math.abs(delta).toFixed(1).replace('.', ',')} kg`;
}

function porcentajeItems(trial: Trial): number {
  const total = trial.days.reduce((s, d) => s + d.items_total, 0);
  const hechos = trial.days.reduce((s, d) => s + d.items_done, 0);
  return total === 0 ? 0 : Math.round((hechos / total) * 100);
}

function Resumen({ trial, checkins }: { trial: Trial; checkins: DailyCheckin[] }) {
  const animo = promedio(checkins.map((c) => c.mood));
  const completados = trial.days.filter((d) => d.completed_at).length;
  const tarjetas = [
    { label: 'Días completados', value: `${completados} de 7` },
    { label: 'Ítems cumplidos', value: `${porcentajeItems(trial)}%` },
    { label: 'Ánimo promedio', value: animo === null ? '—' : `${animo.toFixed(1).replace('.', ',')} de 5` },
    { label: 'Cambio de peso', value: resumenPeso(checkins) },
  ];
  return (
    <dl className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {tarjetas.map((t) => (
        <div key={t.label} className="rounded-[1.5rem] bg-white p-5 shadow-xl shadow-navy-900/5">
          <dt className="text-xs font-extrabold uppercase tracking-[0.15em] text-slate-500">{t.label}</dt>
          <dd className="display mt-2 text-xl text-navy-900">{t.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Barras por día de la semana gratis: ítems cumplidos sobre ítems del día. */
function BarrasDias({ trial }: { trial: Trial }) {
  return (
    <section aria-labelledby="barras-dias" className="rounded-[1.75rem] bg-white p-6 shadow-xl shadow-navy-900/5">
      <h2 id="barras-dias" className="eyebrow mb-5 text-brand-orange">Cumplimiento por día</h2>
      <ul className="grid grid-cols-7 items-end gap-2" style={{ minHeight: '10rem' }}>
        {trial.days.map((d) => {
          const pct = d.items_total === 0 ? 0 : Math.round((d.items_done / d.items_total) * 100);
          const texto = d.items_total === 0 ? 'Sin ítems' : `${d.items_done} de ${d.items_total} ítems`;
          return (
            <li key={d.day_number} className="flex h-full flex-col items-center justify-end gap-2">
              <span className="text-xs font-bold text-slate-600">{d.items_total === 0 ? '' : `${pct}%`}</span>
              <div
                role="img"
                aria-label={`Día ${d.day_number}: ${texto}`}
                className={`w-full rounded-t-xl ${d.completed_at ? 'bg-brand-blue' : 'bg-brand-orange/70'}`}
                style={{ height: `${Math.max(pct, 4)}%` }}
              />
              <span className="text-xs font-extrabold text-navy-900">D{d.day_number}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Historial({ checkins }: { checkins: DailyCheckin[] }) {
  return (
    <section aria-labelledby="historial" className="rounded-[1.75rem] bg-white p-6 shadow-xl shadow-navy-900/5">
      <h2 id="historial" className="eyebrow mb-5 text-brand-orange">Registro de chequeos</h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[32rem] text-left text-sm" aria-label="Registro de chequeos">
          <thead className="text-xs uppercase tracking-[0.15em] text-slate-500">
            <tr>
              <th scope="col" className="py-2 pr-4">Fecha</th>
              <th scope="col" className="py-2 pr-4">Ánimo</th>
              <th scope="col" className="py-2 pr-4">Peso</th>
              <th scope="col" className="py-2 pr-4">Agua</th>
              <th scope="col" className="py-2">Nota</th>
            </tr>
          </thead>
          <tbody>
            {[...checkins].reverse().map((c) => (
              <tr key={c.id} className="border-t border-slate-100 align-top">
                <td className="py-3 pr-4 font-semibold text-navy-900">{formatDate(c.checkin_date)}</td>
                <td className="py-3 pr-4">
                  <span aria-hidden="true">{EMOJI_ANIMO[c.mood] ?? ''}</span> <span>{c.mood}/5</span>
                </td>
                <td className="py-3 pr-4">{c.weight_kg === null ? '—' : `${c.weight_kg.toFixed(1).replace('.', ',')} kg`}</td>
                <td className="py-3 pr-4">{c.water_glasses === null ? '—' : `${c.water_glasses} vasos`}</td>
                <td className="py-3 text-slate-600">{c.note ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Graficos({ checkins }: { checkins: DailyCheckin[] }) {
  const puntos = (valor: (c: DailyCheckin) => number | null): ChartPoint[] =>
    checkins.map((c) => ({ label: corto(c.checkin_date), value: valor(c) }));
  const pesos = checkins.map((c) => c.weight_kg).filter((v): v is number => v !== null);
  const pesoMin = pesos.length ? Math.floor(Math.min(...pesos)) - 1 : 40;
  const pesoMax = pesos.length ? Math.ceil(Math.max(...pesos)) + 1 : 120;
  const aguas = checkins.map((c) => c.water_glasses).filter((v): v is number => v !== null);
  const aguaMax = aguas.length ? Math.max(8, Math.ceil(Math.max(...aguas))) : 8;

  return (
    <div className="grid gap-6 md:grid-cols-3">
      <MiniLineChart title="Ánimo" unit="de 5" points={puntos((c) => c.mood)} min={1} max={5} />
      <MiniLineChart title="Peso" unit="kg" points={puntos((c) => c.weight_kg)} min={pesoMin} max={pesoMax} decimals={1} />
      <MiniLineChart title="Agua" unit="vasos" points={puntos((c) => c.water_glasses)} min={0} max={aguaMax} />
    </div>
  );
}

export default function ProgresoPage() {
  const { session } = useAuth();
  const miId = session?.user.id ?? null;
  const checkins = useAsync(
    () => (miId ? repo.listCheckins(miId, DIAS_CHEQUEO) : Promise.resolve([] as DailyCheckin[])),
    [miId],
  );
  const semana = useTrial();

  if (!session) return null;

  const cargando = checkins.status === 'loading' || semana.loading;
  const hayPlan = semana.trial !== null;

  return (
    <div className="pb-28">
      <section className="bg-navy-900">
        <div className="mx-auto max-w-6xl px-4 py-12 md:py-16">
          <PageHeader eyebrow="Mi plan" title="Progreso" subtitle="Cómo vas con tu semana gratis, día a día." />
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-8 px-4 py-10">
        {cargando ? <Loading text="Cargando tu progreso…" /> : null}

        {!cargando && semana.error ? (
          <ErrorState message={semana.error} onRetry={semana.reload} />
        ) : null}

        {!cargando && !semana.error && !hayPlan ? (
          <EmptyState
            title="Aún no tienes semana gratis"
            text="Completa tu ficha y genera tu semana gratis para ver tu progreso aquí."
            action={{ label: 'Ir a Hoy', to: '/mi-plan/hoy' }}
          />
        ) : null}

        {!cargando && semana.trial ? <Resumen trial={semana.trial} checkins={checkins.status === 'ok' ? checkins.data : []} /> : null}

        {!cargando && semana.trial ? <BarrasDias trial={semana.trial} /> : null}

        {!cargando && checkins.status === 'error' ? (
          <ErrorState message={checkins.message} onRetry={checkins.reload} />
        ) : null}

        {!cargando && checkins.status === 'ok' && checkins.data.length === 0 ? (
          <EmptyState
            title="Aún no hay chequeos: haz el primero en Hoy"
            text="Registra cómo te sientes, tu peso y tus vasos de agua para ver tu progreso."
            action={{ label: 'Ir a Hoy', to: '/mi-plan/hoy' }}
          />
        ) : null}

        {!cargando && checkins.status === 'ok' && checkins.data.length > 0 ? (
          <>
            <Graficos checkins={checkins.data} />
            <Historial checkins={checkins.data} />
          </>
        ) : null}
      </div>
    </div>
  );
}

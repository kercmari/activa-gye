import { repo } from '../../data';
import type { NutritionRequest } from '../../data/types';
import { LinkButton } from '../ui/Button';
import { EmptyState, ErrorState, Loading } from '../ui/States';
import { formatDateLong } from './labels';
import { useAsync } from './useAsync';

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-5 py-4">
      <p className="text-xs font-extrabold uppercase tracking-[0.15em] text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-extrabold text-navy-900">{value}</p>
    </div>
  );
}

/** Pestaña "Mi plan": la última guía nutricional y el plan del nutricionista, si existe. */
export default function PlanTab() {
  const state = useAsync(() => repo.listMyNutritionRequests(), []);

  if (state.status === 'loading') return <Loading text="Cargando tu plan…" />;
  if (state.status === 'error') return <ErrorState message={state.message} onRetry={state.reload} />;

  const requests: NutritionRequest[] = state.data;
  const latest = requests[0];
  if (!latest) {
    return (
      <div className="flex flex-col gap-6">
        <EmptyState
          title="Todavía no tienes un plan"
          text="Pide una guía nutricional con tus datos o conecta con un nutricionista."
          action={{ to: '/nutricion', label: 'Conectar con un nutricionista' }}
        />
        <div className="flex justify-center">
          <LinkButton to="/nutricion/nueva" variant="secondary">Nueva solicitud</LinkButton>
        </div>
      </div>
    );
  }

  const withPlan = requests.find((r) => r.nutritionist_plan);
  const guide = latest.ai_guide;

  return (
    <div className="flex flex-col gap-6">
      {withPlan?.nutritionist_plan ? (
        <section className="rounded-[1.75rem] border-2 border-brand-blue/30 bg-sky-50 p-6 md:p-8">
          <p className="eyebrow">Plan de tu nutricionista</p>
          <p className="mt-4 whitespace-pre-line text-navy-900">{withPlan.nutritionist_plan}</p>
        </section>
      ) : null}

      <section className="rounded-[1.75rem] bg-white p-6 shadow-xl shadow-navy-900/5 md:p-8">
        <p className="eyebrow">Tu última guía</p>
        <h2 className="display mt-2 text-2xl text-navy-900">Solicitud del {formatDateLong(latest.created_at.slice(0, 10))}</h2>
        {guide ? (
          <>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Stat label="Calorías al día" value={`${guide.daily_kcal} kcal`} />
              <Stat label="IMC" value={`${guide.bmi.toFixed(1).replace('.', ',')} · ${guide.bmi_label}`} />
            </div>
            <p className="mt-6 text-slate-700">{guide.summary}</p>
          </>
        ) : (
          <p className="mt-4 text-slate-600">
            {latest.ai_status === 'fallo'
              ? 'No pudimos generar la guía de esta solicitud. Puedes pedir una nueva.'
              : 'Tu guía se está preparando.'}
          </p>
        )}
        <div className="mt-8 flex flex-wrap gap-3">
          {guide ? <LinkButton to={`/nutricion/${latest.id}`} variant="primary">Ver guía completa</LinkButton> : null}
          <LinkButton to="/nutricion/nueva" variant="secondary">Nueva solicitud</LinkButton>
        </div>
      </section>
    </div>
  );
}

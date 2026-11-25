/** Piezas de recetas del paciente: día de la receta (Hoy y Agenda) y la lista «Mis recetas» (Agenda). */
import { useCallback, useEffect, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { repo, type PlanDay, type Prescription } from '../../data';
import { useAuth } from '../../auth/AuthContext';
import { formatDateTimeLong } from '../profile/labels';
import { EmptyState, ErrorState, Loading, errorMessage } from '../ui/States';
import { todayGuayaquil, tipoReceta } from './fechasPlan';

/** Un día del calendario que viene de una receta: título, comidas y ejercicio. */
export function PlanDayCard({ plan }: { plan: PlanDay }) {
  return (
    <article className="space-y-4">
      <h3 className="text-lg font-bold text-navy-900">{plan.title}</h3>
      {plan.meals ? (
        <div>
          <p className="eyebrow text-brand-orange">Comidas</p>
          <p className="mt-1 whitespace-pre-line text-slate-700">{plan.meals}</p>
        </div>
      ) : null}
      {plan.exercise ? (
        <div>
          <p className="eyebrow text-brand-orange">Ejercicio</p>
          <p className="mt-1 whitespace-pre-line text-slate-700">{plan.exercise}</p>
        </div>
      ) : null}
    </article>
  );
}

type Estado<T> = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ok'; data: T };

/** El día de hoy que viene de una receta entregada. Sin día de hoy no muestra nada. */
export function RecetaDeHoy() {
  const { session } = useAuth();
  const miId = session?.user.id ?? null;
  const [estado, setEstado] = useState<Estado<PlanDay | null>>({ status: 'loading' });

  const cargar = useCallback(async () => {
    if (!miId) return;
    setEstado({ status: 'loading' });
    try {
      const hoy = todayGuayaquil();
      const dias = await repo.listPlanDays(miId, hoy, hoy);
      setEstado({ status: 'ok', data: dias[0] ?? null });
    } catch (e) {
      setEstado({ status: 'error', message: errorMessage(e) });
    }
  }, [miId]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  // Mientras carga no ocupa lugar: la tarjeta es opcional y no debe competir con el estado de la semana.
  if (estado.status === 'loading') return null;
  if (estado.status === 'error') return <ErrorState message={estado.message} onRetry={() => void cargar()} />;
  if (!estado.data) return null;

  return (
    <section className="rounded-[1.75rem] bg-white p-6 shadow-xl shadow-navy-900/5" aria-label="Receta de hoy">
      <p className="eyebrow text-brand-orange">Receta de hoy</p>
      <div className="mt-4">
        <PlanDayCard plan={estado.data} />
      </div>
    </section>
  );
}

/** Lista de las recetas entregadas al paciente, con el texto completo al expandir. */
export function MisRecetas() {
  const [estado, setEstado] = useState<Estado<Prescription[]>>({ status: 'loading' });
  const [abierta, setAbierta] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setEstado({ status: 'loading' });
    try {
      setEstado({ status: 'ok', data: await repo.listMyPrescriptions() });
    } catch (e) {
      setEstado({ status: 'error', message: errorMessage(e) });
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  return (
    <section className="rounded-[1.75rem] bg-white p-6 shadow-xl shadow-navy-900/5" aria-labelledby="mis-recetas-titulo">
      <p className="eyebrow text-brand-orange">Mis recetas</p>
      <h2 id="mis-recetas-titulo" className="display mt-2 text-2xl text-navy-900">Recetas de tu nutricionista</h2>
      <div className="mt-5">
        {estado.status === 'loading' ? <Loading text="Cargando tus recetas…" /> : null}
        {estado.status === 'error' ? <ErrorState message={estado.message} onRetry={() => void cargar()} /> : null}
        {estado.status === 'ok' && estado.data.length === 0 ? (
          <EmptyState
            title="Aún no tienes recetas"
            text="Cuando tu nutricionista te entregue una dieta, rutina o recomendación, aparecerá aquí."
            action={{ label: 'Ir a Hoy', to: '/mi-plan/hoy' }}
          />
        ) : null}
        {estado.status === 'ok' && estado.data.length > 0 ? (
          <ul className="space-y-3">
            {estado.data.map((receta) => {
              const expandida = abierta === receta.id;
              const panelId = `receta-${receta.id}`;
              return (
                <li key={receta.id} className="rounded-2xl border border-slate-200 p-4">
                  <button
                    type="button"
                    aria-expanded={expandida}
                    aria-controls={panelId}
                    onClick={() => setAbierta(expandida ? null : receta.id)}
                    className="flex min-h-11 w-full items-start justify-between gap-3 text-left"
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-bold text-brand-orange">{tipoReceta(receta.kind)}</span>
                      <span className="block truncate font-extrabold text-navy-900">{receta.title}</span>
                      {receta.delivered_at ? (
                        <span className="block text-sm text-slate-500">{formatDateTimeLong(receta.delivered_at)}</span>
                      ) : null}
                    </span>
                    <span className="flex shrink-0 items-center gap-1 text-sm font-bold text-navy-900">
                      {expandida ? 'Ocultar' : 'Ver receta'}
                      {expandida ? <ChevronUp className="h-4 w-4" aria-hidden="true" /> : <ChevronDown className="h-4 w-4" aria-hidden="true" />}
                    </span>
                  </button>
                  {expandida ? (
                    <p id={panelId} className="mt-3 whitespace-pre-line break-words text-slate-700">
                      {receta.body || 'Esta receta no tiene texto.'}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </section>
  );
}

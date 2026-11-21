import { useEffect, useState } from 'react';
import { ArrowRight, ClipboardList, FileText, ShieldCheck, Stethoscope } from 'lucide-react';
import { Link } from 'react-router';
import { repo, type NutritionRequest } from '../data';
import { useAuth } from '../auth/AuthContext';
import PageHeader from '../components/ui/PageHeader';
import { LinkButton } from '../components/ui/Button';
import { EmptyState, ErrorState, Loading, errorMessage } from '../components/ui/States';
import { STATUS_LABELS, GOAL_LABELS, formatDate } from '../components/nutrition/labels';

const STEPS = [
  { icon: ClipboardList, title: 'Cuéntanos tus medidas', text: 'Altura, peso y tu objetivo. Tardas unos cinco minutos.' },
  { icon: FileText, title: 'Recibe tu guía', text: 'Calculamos tu IMC y unas necesidades aproximadas de energía, con recomendaciones de alimentación y actividad.' },
  { icon: Stethoscope, title: 'Un nutricionista revisa tu caso', text: 'Un profesional puede revisar tu solicitud y responderte con un plan.' },
];

const RECIBES = [
  'Tu IMC y una referencia de energía diaria (kcal).',
  'Recomendaciones de alimentación y un ejemplo de menú de un día.',
  'Actividad física sugerida y lugares de Guayaquil para practicarla.',
  'Un plan escrito por un nutricionista, cuando responda.',
];

export default function NutricionPage() {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const [requests, setRequests] = useState<NutritionRequest[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!userId) return;
    let alive = true;
    repo.listMyNutritionRequests().then(
      (list) => { if (alive) { setRequests(list); setError(null); } },
      (e: unknown) => { if (alive) setError(errorMessage(e)); },
    );
    return () => { alive = false; };
  }, [userId, attempt]);

  const showList = !!userId;

  return (
    <>
      <PageHeader
        eyebrow="NUTRICIÓN"
        title="Conecta con un nutricionista"
        subtitle="Una guía orientativa para tu alimentación y tu actividad, basada en tus medidas y tu objetivo."
        back="/"
      />

      <div className="mx-auto max-w-6xl space-y-10 px-4 py-12">
        <section aria-labelledby="como-funciona">
          <h2 id="como-funciona" className="display text-3xl text-navy-900">Cómo funciona</h2>
          <ol className="mt-6 grid gap-5 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.title} className="rounded-[1.75rem] bg-white p-6 shadow-xl shadow-navy-900/5">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-brand-blue">
                  <s.icon className="h-6 w-6" aria-hidden="true" />
                </span>
                <p className="eyebrow mt-5">Paso {i + 1}</p>
                <h3 className="mt-2 text-lg font-extrabold text-navy-900">{s.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{s.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="grid gap-5 md:grid-cols-2" aria-labelledby="que-recibes">
          <div className="rounded-[1.75rem] bg-white p-6 shadow-xl shadow-navy-900/5 md:p-8">
            <h2 id="que-recibes" className="display text-2xl text-navy-900">Qué recibes</h2>
            <ul className="mt-4 space-y-3 text-slate-700">
              {RECIBES.map((r) => <li key={r} className="flex gap-3"><span className="text-brand-orange">•</span>{r}</li>)}
            </ul>
          </div>
          <div className="flex flex-col justify-between gap-6 rounded-[1.75rem] bg-navy-900 p-6 text-white md:p-8">
            <div>
              <ShieldCheck className="h-8 w-8 text-brand-blue" aria-hidden="true" />
              <p className="mt-4 font-extrabold">Orientación general. No reemplaza a un profesional de la salud.</p>
              <p className="mt-2 text-sm text-slate-300">Si tienes una condición de salud, consulta con tu médico antes de cambiar tu alimentación o tu actividad.</p>
            </div>
            <LinkButton to="/nutricion/nueva" variant="primary" size="lg" iconRight={ArrowRight} className="self-start">
              Empezar
            </LinkButton>
          </div>
        </section>

        {showList ? (
          <section aria-labelledby="mis-solicitudes">
            <h2 id="mis-solicitudes" className="display text-3xl text-navy-900">Mis solicitudes</h2>
            <div className="mt-6">
              {error ? (
                <ErrorState message={error} onRetry={() => { setError(null); setAttempt((n) => n + 1); }} />
              ) : requests === null ? (
                <Loading text="Cargando tus solicitudes…" />
              ) : requests.length === 0 ? (
                <EmptyState
                  title="Aún no tienes solicitudes"
                  text="Cuando pidas tu guía, aparecerá aquí para que la revises cuando quieras."
                  action={{ label: 'Pedir mi guía', to: '/nutricion/nueva' }}
                />
              ) : (
                <ul className="space-y-3">
                  {requests.map((r) => (
                    <li key={r.id}>
                      <Link
                        to={`/nutricion/${r.id}`}
                        className="flex flex-col gap-2 rounded-[1.75rem] bg-white p-5 shadow-xl shadow-navy-900/5 transition-colors hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <span>
                          <span className="block text-sm font-semibold text-slate-500">{formatDate(r.created_at)}</span>
                          <span className="block font-extrabold text-navy-900">{GOAL_LABELS[r.goal]}</span>
                        </span>
                        <span className="text-sm font-bold text-brand-blue">{STATUS_LABELS[r.status]}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        ) : null}
      </div>
    </>
  );
}

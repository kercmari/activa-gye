import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router';
import { Stethoscope } from 'lucide-react';
import { repo, type NutritionRequest } from '../data';
import PageHeader from '../components/ui/PageHeader';
import { LinkButton } from '../components/ui/Button';
import { ErrorState, Loading, errorMessage } from '../components/ui/States';
import GuideView from '../components/nutrition/GuideView';
import { ACTIVITY_LABELS, GOAL_LABELS, SEX_LABELS, STATUS_LABELS, formatDate } from '../components/nutrition/labels';

type Load =
  | { state: 'loading' }
  | { state: 'error'; message: string }
  | { state: 'ready'; request: NutritionRequest | null };

export default function NutricionDetallePage() {
  const { id = '' } = useParams();
  const [load, setLoad] = useState<Load>({ state: 'loading' });
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    repo.getNutritionRequest(id).then(
      (request) => { if (alive) setLoad({ state: 'ready', request }); },
      (e: unknown) => { if (alive) setLoad({ state: 'error', message: errorMessage(e) }); },
    );
    return () => { alive = false; };
  }, [id, attempt]);

  const request = load.state === 'ready' ? load.request : null;

  useEffect(() => {
    if (!request || !request.photo_path) return;
    let alive = true;
    (async () => {
      try {
        const url = await repo.getNutritionPhotoUrl(request);
        if (alive) setPhotoUrl(url);
      } catch {
        // Sin foto visible: el resto de la guía sigue disponible.
      }
    })();
    return () => { alive = false; };
  }, [request]);

  return (
    <>
      <PageHeader eyebrow="NUTRICIÓN" title="Mi guía nutricional" back="/nutricion" />

      <div className="mx-auto max-w-4xl space-y-8 px-4 py-10">
        {load.state === 'loading' ? <Loading text="Cargando tu guía…" /> : null}

        {load.state === 'error' ? (
          <ErrorState message={load.message} onRetry={() => { setLoad({ state: 'loading' }); setAttempt((n) => n + 1); }} />
        ) : null}

        {load.state === 'ready' && !request ? (
          <div className="rounded-[1.75rem] bg-white px-6 py-12 text-center shadow-xl shadow-navy-900/5">
            <h2 className="display text-2xl text-navy-900">No encontramos esta solicitud</h2>
            <p className="mx-auto mt-3 max-w-md text-slate-600">Puede que el enlace sea incorrecto o que la solicitud ya no exista.</p>
            <div className="mt-6 flex justify-center">
              <LinkButton to="/nutricion" variant="primary">Volver a nutrición</LinkButton>
            </div>
          </div>
        ) : null}

        {request ? (
          <>
            <section className="rounded-[1.75rem] bg-white p-6 shadow-xl shadow-navy-900/5 md:p-8">
              <p className="text-sm font-semibold text-slate-500">Solicitud del {formatDate(request.created_at)}</p>
              <p className="mt-1 text-xl font-extrabold text-navy-900">{GOAL_LABELS[request.goal]}</p>
              <p className="mt-1 text-sm font-bold text-brand-blue">{STATUS_LABELS[request.status]}</p>

              <details className="mt-5 rounded-2xl bg-slate-50 p-4">
                <summary className="cursor-pointer font-bold text-navy-900">Datos que enviaste</summary>
                <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                  <div><dt className="font-bold text-slate-500">Sexo</dt><dd className="text-navy-900">{SEX_LABELS[request.sex]}</dd></div>
                  <div><dt className="font-bold text-slate-500">Edad</dt><dd className="text-navy-900">{request.age} años</dd></div>
                  <div><dt className="font-bold text-slate-500">Altura</dt><dd className="text-navy-900">{request.height_cm} cm</dd></div>
                  <div><dt className="font-bold text-slate-500">Peso</dt><dd className="text-navy-900">{request.weight_kg} kg</dd></div>
                  <div><dt className="font-bold text-slate-500">Cintura</dt><dd className="text-navy-900">{request.waist_cm ? `${request.waist_cm} cm` : 'No indicada'}</dd></div>
                  <div><dt className="font-bold text-slate-500">Actividad</dt><dd className="text-navy-900">{ACTIVITY_LABELS[request.activity_level]}</dd></div>
                  <div className="sm:col-span-2"><dt className="font-bold text-slate-500">Restricciones</dt><dd className="text-navy-900">{request.restrictions ?? 'Ninguna'}</dd></div>
                  <div className="sm:col-span-2"><dt className="font-bold text-slate-500">Condiciones de salud</dt><dd className="text-navy-900">{request.health_conditions ?? 'Ninguna'}</dd></div>
                </dl>
              </details>

              {request.photo_path ? (
                <div className="mt-5">
                  {photoUrl ? (
                    <img src={photoUrl} alt="Tu foto enviada" className="h-48 w-48 rounded-2xl object-cover" />
                  ) : (
                    <p className="text-sm text-slate-500">Tu foto no está disponible en este momento.</p>
                  )}
                </div>
              ) : null}
            </section>

            {request.nutritionist_plan ? (
              <section className="rounded-[1.75rem] border-2 border-brand-blue bg-sky-50 p-6 shadow-xl shadow-brand-blue/10 md:p-8" aria-labelledby="plan-nutricionista">
                <h2 id="plan-nutricionista" className="flex items-center gap-2 display text-2xl text-navy-900">
                  <Stethoscope className="h-6 w-6 text-brand-blue" aria-hidden="true" /> Plan de tu nutricionista
                </h2>
                {request.responded_at ? (
                  <p className="mt-1 text-sm font-semibold text-slate-500">Respondido el {formatDate(request.responded_at)}</p>
                ) : null}
                <p className="mt-4 whitespace-pre-line text-slate-800">{request.nutritionist_plan}</p>
              </section>
            ) : (
              <section className="rounded-[1.75rem] bg-white p-6 text-slate-700 shadow-xl shadow-navy-900/5">
                Un nutricionista revisará tu caso pronto.
              </section>
            )}

            {request.ai_guide ? (
              <GuideView guide={request.ai_guide} kind={request.ai_kind ?? 'basica'} />
            ) : (
              <p className="rounded-[1.75rem] bg-white p-6 text-slate-700 shadow-xl shadow-navy-900/5">
                Tu guía automática aún no está lista. Un nutricionista puede revisar tu caso.
              </p>
            )}

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                to={request.ai_guide?.activity[0]
                  ? `/lugares?deporte=${encodeURIComponent(request.ai_guide.activity[0].sport_id)}`
                  : '/lugares'}
                className="inline-flex items-center justify-center rounded-2xl bg-brand-orange px-6 py-3.5 font-extrabold text-white shadow-lg shadow-brand-orange/30 hover:bg-brand-orange-dark"
              >
                Ver lugares recomendados para mi objetivo
              </Link>
              <LinkButton to="/perfil?tab=plan" variant="secondary">Volver a mi perfil</LinkButton>
            </div>
          </>
        ) : null}
      </div>
    </>
  );
}

import { ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import PageHeader from '../components/ui/PageHeader';
import { EmptyState, ErrorState, Loading, errorMessage } from '../components/ui/States';
import { repo, type Sport } from '../data';
import { sportIcon } from '../lib/icons';

interface Loaded { sports: Sport[]; counts: Record<string, number> }

export default function DeportesPage() {
  const [data, setData] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      setError(null);
      try {
        const [sports, places] = await Promise.all([repo.listSports(), repo.searchPlaces({})]);
        const counts: Record<string, number> = {};
        for (const sport of sports) {
          counts[sport.id] = places.filter((p) => p.sport_ids.includes(sport.id)).length;
        }
        if (alive) setData({ sports, counts });
      } catch (e: unknown) {
        if (alive) setError(errorMessage(e));
      }
    };
    void load();
    return () => { alive = false; };
  }, [attempt]);

  const retry = () => setAttempt((n) => n + 1);

  return (
    <>
      <PageHeader
        eyebrow="Muévete a tu manera"
        title="Explora por deporte"
        subtitle="Elige una actividad y mira dónde practicarla en Guayaquil."
      />
      <section className="mx-auto max-w-6xl px-4 py-12">
        {error ? <ErrorState message={error} onRetry={retry} /> : null}
        {!error && !data ? <Loading /> : null}
        {data && data.sports.length === 0 ? (
          <EmptyState
            title="Aún no hay deportes"
            text="Vuelve pronto: estamos preparando las actividades."
            action={{ label: 'Ver todos los lugares', to: '/lugares' }}
          />
        ) : null}
        {data && data.sports.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {data.sports.map((sport) => {
              const Icon = sportIcon(sport.icon);
              const count = data.counts[sport.id] ?? 0;
              return (
                <Link
                  key={sport.id}
                  to={`/deportes/${sport.id}`}
                  className="group relative flex h-40 items-end overflow-hidden rounded-[1.75rem] bg-navy-800 md:h-56"
                >
                  <img src={`/img/sports/${sport.id}.jpg`} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-navy-900 via-navy-900/40 to-transparent" />
                  <div className="relative flex w-full items-end justify-between gap-2 p-4">
                    <div>
                      <Icon className="mb-2 h-6 w-6 text-brand-orange" aria-hidden="true" />
                      <p className="display text-lg text-white">{sport.name}</p>
                      <p className="text-xs font-semibold text-slate-300">{count} {count === 1 ? 'lugar' : 'lugares'}</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-white" aria-hidden="true" />
                  </div>
                </Link>
              );
            })}
          </div>
        ) : null}
      </section>
    </>
  );
}

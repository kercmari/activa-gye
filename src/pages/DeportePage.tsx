import { ArrowRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import PlaceCard from '../components/places/PlaceCard';
import { LinkButton } from '../components/ui/Button';
import PageHeader from '../components/ui/PageHeader';
import { EmptyState, ErrorState, Loading, errorMessage } from '../components/ui/States';
import { repo, type Place, type Sector, type Sport } from '../data';

interface Loaded { sport: Sport | null; places: Place[]; sectors: Sector[] }

export default function DeportePage() {
  const { slug = '' } = useParams();
  const [data, setData] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      setError(null);
      try {
        const [sports, places, sectors] = await Promise.all([
          repo.listSports(),
          repo.searchPlaces({ sport: slug }),
          repo.listSectors(),
        ]);
        if (alive) setData({ sport: sports.find((s) => s.id === slug) ?? null, places, sectors });
      } catch (e: unknown) {
        if (alive) setError(errorMessage(e));
      }
    };
    void load();
    return () => { alive = false; };
  }, [slug, attempt]);

  const retry = () => setAttempt((n) => n + 1);

  if (error) {
    return (
      <>
        <PageHeader title="Deporte" back="/deportes" />
        <section className="mx-auto max-w-6xl px-4 py-12"><ErrorState message={error} onRetry={retry} /></section>
      </>
    );
  }
  if (!data) {
    return (
      <>
        <PageHeader title="Deporte" back="/deportes" />
        <section className="mx-auto max-w-6xl px-4 py-12"><Loading /></section>
      </>
    );
  }
  if (!data.sport) {
    return (
      <>
        <PageHeader title="Deporte" back="/deportes" />
        <section className="mx-auto max-w-6xl px-4 py-12">
          <EmptyState
            title="Ese deporte no existe"
            text="Revisa la lista de deportes y elige una actividad."
            action={{ label: 'Ver todos los deportes', to: '/deportes' }}
          />
        </section>
      </>
    );
  }

  const sport = data.sport;
  const sectorName = (id: string | null) => data.sectors.find((s) => s.id === id)?.name ?? 'Guayaquil';

  return (
    <>
      <PageHeader title={sport.name} eyebrow="Deporte" back="/deportes" />
      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <p className="text-slate-600">{data.places.length} {data.places.length === 1 ? 'lugar' : 'lugares'} para practicar {sport.name.toLowerCase()}.</p>
          <LinkButton to={`/lugares?deporte=${encodeURIComponent(sport.id)}`} variant="blue" iconRight={ArrowRight}>
            Buscar con más filtros
          </LinkButton>
        </div>

        {data.places.length === 0 ? (
          <div className="mt-10">
            <EmptyState
              title="Aún no hay lugares de este deporte"
              text="Puedes ver todos los lugares publicados y buscar por otra actividad."
              action={{ label: 'Ver todos los lugares', to: '/lugares' }}
            />
          </div>
        ) : (
          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {data.places.map((place) => (
              <PlaceCard
                key={place.id}
                place={place}
                sectorName={sectorName(place.sector_id)}
                sportName={sport.name}
              />
            ))}
          </div>
        )}
      </section>
    </>
  );
}

import { ArrowRight, ChevronRight, MapPin } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router';
import ContactForm from '../components/ContactForm';
import PlaceCard from '../components/places/PlaceCard';
import SearchCard from '../components/home/SearchCard';
import { usePhase } from '../auth/SettingsContext';
import { LinkButton } from '../components/ui/Button';
import { EmptyState, ErrorState, Loading, errorMessage } from '../components/ui/States';
import { repo, type Place, type Sector, type Sport } from '../data';
import { sportIcon } from '../lib/icons';

interface Catalog { sectors: Sector[]; sports: Sport[]; places: Place[] }

/** Lugares recomendados. Con la fase 3 encendida: primero los que tienen horario confirmado, luego por nombre. Sin ella solo por nombre (el orden no puede delatar horarios). */
function pickRecommended(places: Place[], verPrecios: boolean): Place[] {
  return [...places]
    .sort((a, b) => (verPrecios ? Number(!!b.hours) - Number(!!a.hours) : 0) || a.name.localeCompare(b.name, 'es'))
    .slice(0, 6);
}

export default function DeportesPage() {
  const verPrecios = usePhase(3);
  const [data, setData] = useState<Catalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.all([repo.listSectors(), repo.listSports(), repo.searchPlaces({})])
      .then(([sectors, sports, places]) => setData({ sectors, sports, places }))
      .catch((e: unknown) => setError(errorMessage(e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const sectorName = (id: string | null) => data?.sectors.find((s) => s.id === id)?.name ?? 'Guayaquil';
  const sportName = (ids: string[]) => data?.sports.find((s) => s.id === ids[0])?.name ?? 'Deporte';

  return (
    <>
      {/* a. Portada */}
      <section className="relative overflow-hidden bg-navy-900 text-white">
        <img src="/img/hero.jpg" alt="" className="absolute inset-y-0 right-0 h-full w-full object-cover object-[70%_center] opacity-40 md:w-3/5 md:opacity-100" />
        <div className="absolute inset-0 bg-gradient-to-r from-navy-900 via-navy-900/80 to-navy-900/10 md:via-navy-900/60" />
        <div className="relative mx-auto max-w-6xl px-4 pb-44 pt-14 md:pb-48 md:pt-24">
          <p className="inline-flex items-center gap-2 rounded-full border border-brand-blue/40 bg-brand-blue/10 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.2em] text-sky-300">
            <MapPin className="h-4 w-4" aria-hidden="true" />
            Tu guía deportiva en Guayaquil
          </p>
          <h1 className="display mt-6 max-w-3xl text-5xl md:text-7xl">
            Encuentra tu espacio, <span className="text-brand-orange">activa</span> tu pasión.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-slate-300">
            Descubre gimnasios, centros deportivos y actividades físicas en Guayaquil. Encuentra el lugar ideal para comenzar a moverte.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <LinkButton to="/lugares" variant="primary" size="lg" iconRight={ArrowRight}>Explorar lugares</LinkButton>
            <LinkButton to="/conocenos" variant="secondary" size="lg" onDark iconRight={ChevronRight}>Conoce más</LinkButton>
          </div>
        </div>
      </section>

      {/* b. Buscador (se monta sobre el borde del hero) */}
      <div className="relative z-10 mx-auto -mt-32 max-w-6xl px-4 md:-mt-36">
        <SearchCard />
      </div>

      {/* b2. Accesos del panel */}
      <nav aria-label="Accesos de deportes" className="mx-auto mt-8 grid max-w-6xl gap-4 px-4 md:grid-cols-2">
        <Link to="/lugares" className="flex items-center justify-between gap-4 rounded-[1.75rem] bg-white p-6 shadow-xl shadow-navy-900/5 hover:bg-sky-50">
          <span>
            <span className="display block text-xl text-navy-900">Buscar lugares</span>
            <span className="mt-1 block text-sm text-slate-600">{verPrecios ? 'Filtra por sector, precio, horario y servicios.' : 'Filtra por sector, actividad y servicios.'}</span>
          </span>
          <ChevronRight className="h-5 w-5 shrink-0 text-brand-orange" aria-hidden="true" />
        </Link>
        <Link to="/comparar" className="flex items-center justify-between gap-4 rounded-[1.75rem] bg-white p-6 shadow-xl shadow-navy-900/5 hover:bg-sky-50">
          <span>
            <span className="display block text-xl text-navy-900">Comparar lugares</span>
            <span className="mt-1 block text-sm text-slate-600">Pon dos o más lugares lado a lado.</span>
          </span>
          <ChevronRight className="h-5 w-5 shrink-0 text-brand-orange" aria-hidden="true" />
        </Link>
      </nav>

      {/* c. Deportes */}
      <section className="mx-auto max-w-6xl px-4 pb-16 pt-16">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="eyebrow">Muévete a tu manera</p>
            <h2 className="display mt-2 text-4xl text-navy-900 md:text-5xl">Explora por deporte</h2>
          </div>
          <p className="max-w-sm text-slate-600">Elige una actividad y mira dónde practicarla en la ciudad.</p>
        </div>

        {loading && !data ? <div className="mt-10"><Loading /></div> : null}
        {error && !data ? (
          <div className="mt-10"><ErrorState message={error} onRetry={load} /></div>
        ) : null}
        {data ? (
          <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-4">
            {data.sports.map((sport) => {
              const Icon = sportIcon(sport.icon);
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
                    </div>
                    <ChevronRight className="h-5 w-5 text-white" aria-hidden="true" />
                  </div>
                </Link>
              );
            })}
          </div>
        ) : null}
      </section>

      {/* d. Lugares recomendados */}
      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="eyebrow">Selección local</p>
            <h2 className="display mt-2 text-4xl text-navy-900 md:text-5xl">Lugares recomendados</h2>
          </div>
          {data ? (
            <span className="self-start rounded-full bg-sky-50 px-4 py-2 text-sm font-bold text-sky-tag md:self-auto">
              {data.places.length} resultados
            </span>
          ) : null}
        </div>

        {loading && !data ? <div className="mt-10"><Loading /></div> : null}
        {error && !data ? (
          <div className="mt-10"><ErrorState message={error} onRetry={load} /></div>
        ) : null}
        {data && data.places.length === 0 ? (
          <div className="mt-10">
            <EmptyState
              title="Aún no hay lugares publicados"
              text="Cuando se publiquen lugares, aparecerán aquí."
              action={{ label: 'Ver todos los lugares', to: '/lugares' }}
            />
          </div>
        ) : null}
        {data && data.places.length > 0 ? (
          <>
            <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {pickRecommended(data.places, verPrecios).map((place) => (
                <PlaceCard
                  key={place.id}
                  place={place}
                  sectorName={sectorName(place.sector_id)}
                  sportName={sportName(place.sport_ids)}
                />
              ))}
            </div>
            <div className="mt-10 flex justify-center">
              <LinkButton to="/lugares" variant="secondary" iconRight={ArrowRight}>Ver todos los lugares</LinkButton>
            </div>
          </>
        ) : null}
      </section>

      {/* e. Banda nutricionista */}
      <section className="bg-brand-blue text-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-12 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="display text-3xl text-white md:text-4xl">¿Quieres un plan de alimentación?</h2>
            <p className="mt-3 max-w-2xl text-white/90">
              Cuéntanos tus medidas y objetivo y recibe una guía orientativa. Un nutricionista puede revisar tu caso.
            </p>
          </div>
          <LinkButton to="/" variant="primary" size="lg" iconRight={ArrowRight} className="shrink-0">
            Conectar con un nutricionista
          </LinkButton>
        </div>
      </section>

      {/* f. Contacto */}
      <ContactForm id="contacto" />
    </>
  );
}

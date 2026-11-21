import { Check, Minus } from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { SERVICE_OPTIONS } from '../components/places/placeOptions';
import BackButton from '../components/ui/BackButton';
import { Button, LinkButton } from '../components/ui/Button';
import { EmptyState, ErrorState, Loading, errorMessage } from '../components/ui/States';
import { repo, type Place, type Sector } from '../data';
import { formatPrice, placeImage, summarizeHours } from '../lib/format';
import { isOpenNow } from '../lib/hours';

const MAX = 3;

/** ids=a,b,c -> ["a","b","c"], sin vacíos ni repetidos, máximo 3. */
function parseIds(raw: string): string[] {
  const unique = [...new Set(raw.split(',').map((s) => s.trim()).filter(Boolean))];
  return unique.slice(0, MAX);
}

interface Row {
  label: string;
  value: (place: Place) => ReactNode;
}

export default function CompararPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const idsRaw = searchParams.get('ids') ?? '';
  const ids = useMemo(() => parseIds(idsRaw), [idsRaw]);

  const [places, setPlaces] = useState<Place[] | null>(null);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const list = parseIds(idsRaw);
    if (list.length < 2) return;
    let alive = true;
    const load = async () => {
      setPlaces(null);
      setError(null);
      try {
        const [found, sec] = await Promise.all([repo.getPlaces(list), repo.listSectors()]);
        if (alive) { setPlaces(found); setSectors(sec); }
      } catch (e: unknown) {
        if (alive) setError(errorMessage(e));
      }
    };
    void load();
    return () => { alive = false; };
  }, [idsRaw, attempt]);

  const removePlace = (id: string) => {
    const rest = ids.filter((x) => x !== id);
    // Se escribe a mano para que la URL quede como /comparar?ids=a,b (sin %2C).
    navigate(rest.length > 0 ? `/comparar?ids=${rest.join(',')}` : '/comparar');
  };

  if (ids.length < 2) {
    return (
      <section className="mx-auto max-w-6xl px-4 py-12">
        <BackButton fallback="/lugares" className="mb-6" />
        <EmptyState
          title="Elige al menos 2 lugares para comparar"
          text="Marca lugares en la búsqueda con la casilla Comparar y vuelve aquí."
          action={{ label: 'Buscar lugares', to: '/lugares' }}
        />
      </section>
    );
  }

  if (error) {
    return (
      <section className="mx-auto max-w-6xl px-4 py-12">
        <BackButton fallback="/lugares" className="mb-6" />
        <ErrorState message={error} onRetry={() => setAttempt((n) => n + 1)} />
      </section>
    );
  }

  if (places === null) {
    return (
      <section className="mx-auto max-w-6xl px-4 py-12">
        <BackButton fallback="/lugares" className="mb-6" />
        <Loading />
      </section>
    );
  }

  // Orden de la URL; los ids que ya no existen se descartan.
  const shown = ids
    .map((id) => places.find((p) => p.id === id))
    .filter((p): p is Place => Boolean(p));

  if (shown.length < 2) {
    return (
      <section className="mx-auto max-w-6xl px-4 py-12">
        <BackButton fallback="/lugares" className="mb-6" />
        <EmptyState
          title="Elige al menos 2 lugares para comparar"
          text="Algunos lugares de la lista ya no están publicados."
          action={{ label: 'Buscar lugares', to: '/lugares' }}
        />
      </section>
    );
  }

  const sectorName = (place: Place) => sectors.find((s) => s.id === place.sector_id)?.name ?? 'Guayaquil';

  const rows: Row[] = [
    { label: 'Sector', value: (p) => sectorName(p) },
    { label: 'Precio', value: (p) => formatPrice(p) },
    { label: 'Horario', value: (p) => summarizeHours(p.hours) },
    {
      label: 'Abierto ahora',
      value: (p) => (p.hours === null ? 'Horario por confirmar' : isOpenNow(p.hours) ? 'Sí' : 'No'),
    },
    { label: 'Promociones', value: (p) => p.promotions?.trim() || '—' },
    ...SERVICE_OPTIONS.map((s) => ({
      label: s.label,
      value: (p: Place) => (p.services.includes(s.id)
        ? <span className="inline-flex items-center gap-1 font-bold text-emerald-700"><Check className="h-4 w-4" aria-hidden="true" />Sí</span>
        : <span className="inline-flex text-slate-400"><Minus className="h-4 w-4" aria-hidden="true" /></span>),
    })),
  ];

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 md:py-12">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <BackButton fallback="/lugares" className="-ml-2 mb-4" />
          <p className="eyebrow">Comparar</p>
          <h1 className="display mt-2 text-4xl text-navy-900 md:text-5xl">Compara lugares</h1>
        </div>
        <LinkButton to="/lugares" variant="secondary">Buscar más lugares</LinkButton>
      </div>

      {/* Escritorio: tabla */}
      <div className="mt-10 hidden overflow-x-auto rounded-[1.75rem] bg-white shadow-xl shadow-navy-900/5 md:block">
        <table className="w-full min-w-[40rem] border-collapse text-sm">
          <thead>
            <tr>
              <th scope="col" className="w-48 p-4 text-left text-[11px] font-extrabold uppercase tracking-[0.2em] text-slate-500">Lugar</th>
              {shown.map((place) => (
                <th scope="col" key={place.id} className="p-4 text-left align-top">
                  <img src={placeImage(place)} alt="" className="h-28 w-full rounded-2xl object-cover" />
                  <span className="display mt-3 block text-lg text-navy-900">{place.name}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-t border-slate-100">
                <th scope="row" className="p-4 text-left font-bold text-navy-900">{row.label}</th>
                {shown.map((place) => (
                  <td key={place.id} className="p-4 text-slate-700">{row.value(place)}</td>
                ))}
              </tr>
            ))}
            <tr className="border-t border-slate-100">
              <th scope="row" className="p-4 text-left font-bold text-navy-900">Acciones</th>
              {shown.map((place) => (
                <td key={place.id} className="p-4">
                  <div className="flex flex-wrap gap-2">
                    <Link to={`/lugares/${place.id}`} className="rounded-xl bg-sky-50 px-3 py-2 text-sm font-bold text-brand-blue hover:bg-sky-100">Ver lugar</Link>
                    <Button variant="ghost" onClick={() => removePlace(place.id)} aria-label={`Quitar ${place.name}`}>Quitar</Button>
                  </div>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Celular: tarjetas apiladas */}
      <div className="mt-10 space-y-6 md:hidden">
        {shown.map((place) => (
          <article key={place.id} className="overflow-hidden rounded-[1.75rem] bg-white shadow-xl shadow-navy-900/5">
            <img src={placeImage(place)} alt="" className="h-40 w-full object-cover" />
            <div className="p-5">
              <h2 className="display text-xl text-navy-900">{place.name}</h2>
              <dl className="mt-4 divide-y divide-slate-100 text-sm">
                {rows.map((row) => (
                  <div key={row.label} className="flex items-start justify-between gap-4 py-2">
                    <dt className="font-bold text-navy-900">{row.label}</dt>
                    <dd className="text-right text-slate-700">{row.value(place)}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-5 flex flex-wrap gap-2">
                <Link to={`/lugares/${place.id}`} className="rounded-xl bg-sky-50 px-3 py-2 text-sm font-bold text-brand-blue hover:bg-sky-100">Ver lugar</Link>
                <Button variant="ghost" onClick={() => removePlace(place.id)} aria-label={`Quitar ${place.name}`}>Quitar</Button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

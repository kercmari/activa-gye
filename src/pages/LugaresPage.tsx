import { LocateFixed, List, Map as MapIcon } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import PlaceCard from '../components/places/PlaceCard';
import PlaceMap from '../components/places/PlaceMap';
import { PRICE_OPTIONS, SCHEDULE_OPTIONS, SERVICE_OPTIONS } from '../components/places/placeOptions';
import { Button, LinkButton } from '../components/ui/Button';
import { SelectField, TextField } from '../components/ui/Field';
import PageHeader from '../components/ui/PageHeader';
import { EmptyState, ErrorState, Loading, errorMessage } from '../components/ui/States';
import { repo, type Place, type PlaceFilters, type PriceRange, type ScheduleRange, type Sector, type ServiceId, type Sport } from '../data';
import { distanceKm } from '../lib/geo';
import { useGeolocation } from '../lib/useGeolocation';

const PAGE_SIZE = 24;
const MAX_COMPARE = 3;

const PRICE_VALUES: string[] = PRICE_OPTIONS.map((o) => o.value).filter(Boolean);
const SCHEDULE_VALUES: string[] = SCHEDULE_OPTIONS.map((o) => o.value).filter(Boolean);
const SERVICE_IDS: string[] = SERVICE_OPTIONS.map((o) => o.id);

/** Lee los filtros de la URL. Lo vacío o inválido no filtra. */
function filtersFromParams(params: URLSearchParams): PlaceFilters {
  const filters: PlaceFilters = {};
  const name = params.get('nombre')?.trim();
  if (name) filters.name = name;
  const sector = params.get('sector');
  if (sector) filters.sector = sector;
  const sport = params.get('deporte');
  if (sport) filters.sport = sport;
  const price = params.get('precio');
  if (price && PRICE_VALUES.includes(price)) filters.price = price as PriceRange;
  const schedule = params.get('horario');
  if (schedule && SCHEDULE_VALUES.includes(schedule)) filters.schedule = schedule as ScheduleRange;
  const services = (params.get('servicios') ?? '').split(',').filter((s) => SERVICE_IDS.includes(s)) as ServiceId[];
  if (services.length > 0) filters.services = services;
  return filters;
}

interface Shown { place: Place; km?: number }

export default function LugaresPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryKey = searchParams.toString();
  const filters = useMemo(() => filtersFromParams(new URLSearchParams(queryKey)), [queryKey]);
  const cercaOn = searchParams.get('cerca') === '1';

  const geo = useGeolocation();
  const filterRef = useRef<HTMLDivElement>(null);

  const [sectors, setSectors] = useState<Sector[]>([]);
  const [sports, setSports] = useState<Sport[]>([]);
  const [places, setPlaces] = useState<Place[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [view, setView] = useState<'lista' | 'mapa'>('lista');
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [compareIds, setCompareIds] = useState<string[]>([]);

  // Catálogo para los selectores y los nombres.
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const [s, sp] = await Promise.all([repo.listSectors(), repo.listSports()]);
        if (alive) { setSectors(s); setSports(sp); }
      } catch {
        if (alive) { setSectors([]); setSports([]); }
      }
    };
    void load();
    return () => { alive = false; };
  }, []);

  // Resultados según los filtros de la URL.
  useEffect(() => {
    let alive = true;
    const load = async () => {
      setPlaces(null);
      setError(null);
      setVisible(PAGE_SIZE);
      try {
        const list = await repo.searchPlaces(filtersFromParams(new URLSearchParams(queryKey)));
        if (alive) setPlaces(list);
      } catch (e: unknown) {
        if (alive) setError(errorMessage(e));
      }
    };
    void load();
    return () => { alive = false; };
  }, [queryKey, attempt]);

  // "Cerca de mí" en la URL: si llega sin ubicación todavía, pedirla una vez.
  const { status: geoStatus, request: requestLocation } = geo;
  useEffect(() => {
    if (cercaOn && geoStatus === 'idle') requestLocation();
  }, [cercaOn, geoStatus, requestLocation]);

  const locationFailed = cercaOn && (geo.status === 'denied' || geo.status === 'unavailable');
  useEffect(() => {
    if (locationFailed) filterRef.current?.querySelector('select')?.focus();
  }, [locationFailed]);

  /** Cambia filtros en la URL. `replace` para el texto, así no se llena el historial letra a letra. */
  const update = (patch: Record<string, string | undefined>, replace = false) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        for (const [key, value] of Object.entries(patch)) {
          if (value) next.set(key, value);
          else next.delete(key);
        }
        return next;
      },
      { replace },
    );
  };

  const toggleService = (id: ServiceId) => {
    const current = filters.services ?? [];
    const next = current.includes(id) ? current.filter((s) => s !== id) : [...current, id];
    update({ servicios: next.join(',') || undefined });
  };

  const toggleCerca = () => {
    if (cercaOn) {
      update({ cerca: undefined });
    } else {
      update({ cerca: '1' });
      geo.request();
    }
  };

  const sectorName = (id: string | null) => sectors.find((s) => s.id === id)?.name ?? 'Guayaquil';
  const sportName = (ids: string[]) => sports.find((s) => s.id === ids[0])?.name ?? 'Deporte';

  // Con ubicación: ordena por distancia en línea recta. Sin ella: el orden del servidor (por nombre).
  const shown: Shown[] = useMemo(() => {
    if (!places) return [];
    const origin = cercaOn && geo.status === 'ok' ? geo.position : null;
    if (!origin) return places.map((place) => ({ place }));
    return places
      .map((place) => ({ place, km: distanceKm(origin, place) }))
      .sort((a, b) => (a.km ?? 0) - (b.km ?? 0));
  }, [places, cercaOn, geo.status, geo.position]);

  const toggleCompare = (id: string, checked: boolean) => {
    setCompareIds((prev) => {
      if (!checked) return prev.filter((x) => x !== id);
      if (prev.includes(id) || prev.length >= MAX_COMPARE) return prev;
      return [...prev, id];
    });
  };

  const hasFilters = queryKey !== '';
  const services = filters.services ?? [];

  return (
    <>
      <PageHeader eyebrow="Busca y compara" title="Lugares" subtitle="Ajusta los filtros y mira los resultados en lista o en mapa." back="/" />

      <section className={`mx-auto max-w-6xl px-4 py-10 ${compareIds.length >= 2 ? 'pb-32' : ''}`}>
        {/* Filtros: misma información que el buscador de la portada, editable aquí. */}
        <div ref={filterRef} className="rounded-[1.75rem] bg-white p-6 shadow-xl shadow-navy-900/5 md:p-8">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <TextField
              label="Nombre"
              placeholder="Ej. Olympic Gym"
              value={searchParams.get('nombre') ?? ''}
              onChange={(e) => update({ nombre: e.target.value }, true)}
            />
            <SelectField label="Zona o sector" value={searchParams.get('sector') ?? ''} onChange={(e) => update({ sector: e.target.value || undefined })}>
              <option value="">Todas las zonas</option>
              {sectors.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </SelectField>
            <SelectField label="Actividad" value={searchParams.get('deporte') ?? ''} onChange={(e) => update({ deporte: e.target.value || undefined })}>
              <option value="">Todas las actividades</option>
              {sports.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </SelectField>
            <SelectField label="Precio" value={filters.price ?? ''} onChange={(e) => update({ precio: e.target.value || undefined })}>
              {PRICE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </SelectField>
            <SelectField label="Horario" value={filters.schedule ?? ''} onChange={(e) => update({ horario: e.target.value || undefined })}>
              {SCHEDULE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </SelectField>
          </div>

          <fieldset className="mt-6 border-t border-slate-100 pt-6">
            <legend className="mb-3 text-[11px] font-extrabold uppercase tracking-[0.2em] text-slate-500">Servicios</legend>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 md:grid-cols-4">
              {SERVICE_OPTIONS.map((s) => (
                <label key={s.id} className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-brand-blue"
                    checked={services.includes(s.id)}
                    onChange={() => toggleService(s.id)}
                  />
                  {s.label}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="mt-6 flex flex-col gap-4 border-t border-slate-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <Button type="button" variant={cercaOn ? 'blue' : 'secondary'} onClick={toggleCerca} aria-pressed={cercaOn}>
              <LocateFixed className="h-4 w-4" aria-hidden="true" />
              Cerca de mí
            </Button>
            <div role="group" aria-label="Vista" className="inline-flex rounded-2xl border border-slate-200 p-1">
              <button
                type="button"
                aria-pressed={view === 'lista'}
                onClick={() => setView('lista')}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold ${view === 'lista' ? 'bg-navy-900 text-white' : 'text-navy-900 hover:bg-slate-100'}`}
              >
                <List className="h-4 w-4" aria-hidden="true" />
                Lista
              </button>
              <button
                type="button"
                aria-pressed={view === 'mapa'}
                onClick={() => setView('mapa')}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold ${view === 'mapa' ? 'bg-navy-900 text-white' : 'text-navy-900 hover:bg-slate-100'}`}
              >
                <MapIcon className="h-4 w-4" aria-hidden="true" />
                Mapa
              </button>
            </div>
          </div>

          {cercaOn && geo.status === 'asking' ? (
            <p role="status" className="mt-4 text-sm font-semibold text-slate-500">Buscando tu ubicación…</p>
          ) : null}
          {locationFailed ? (
            <p role="alert" className="mt-4 text-sm font-semibold text-red-700">No pudimos usar tu ubicación. Elige un sector.</p>
          ) : null}
        </div>

        <div className="mt-10">
          {error ? <ErrorState message={error} onRetry={() => setAttempt((n) => n + 1)} /> : null}
          {!error && places === null ? <Loading /> : null}

          {!error && places !== null && places.length === 0 ? (
            <EmptyState
              title="No encontramos lugares con esos filtros"
              text="Prueba con otra zona, otra actividad o quita algún filtro."
              action={hasFilters ? { label: 'Quitar filtros', to: '/lugares' } : { label: 'Ver deportes', to: '/deportes' }}
            />
          ) : null}

          {!error && places !== null && places.length > 0 ? (
            <>
              <p className="mb-6 inline-flex rounded-full bg-sky-50 px-4 py-2 text-sm font-bold text-sky-tag">
                {places.length} {places.length === 1 ? 'lugar encontrado' : 'lugares encontrados'}
              </p>

              {view === 'mapa' ? (
                <PlaceMap places={shown.map((s) => s.place)} className="h-[32rem]" />
              ) : (
                <>
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {shown.slice(0, visible).map(({ place, km }) => {
                      const checked = compareIds.includes(place.id);
                      return (
                        <PlaceCard
                          key={place.id}
                          place={place}
                          sectorName={sectorName(place.sector_id)}
                          sportName={sportName(place.sport_ids)}
                          distanceKm={km}
                          compare={{
                            checked,
                            disabled: !checked && compareIds.length >= MAX_COMPARE,
                            disabledLabel: 'Máximo 3',
                            onChange: (value) => toggleCompare(place.id, value),
                          }}
                        />
                      );
                    })}
                  </div>
                  {shown.length > visible ? (
                    <div className="mt-10 flex justify-center">
                      <Button variant="secondary" onClick={() => setVisible((n) => n + PAGE_SIZE)}>Ver más</Button>
                    </div>
                  ) : null}
                </>
              )}
            </>
          ) : null}
        </div>
      </section>

      {compareIds.length >= 2 ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-4 py-4 shadow-2xl backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
            <p className="text-sm font-bold text-navy-900">{compareIds.length} lugares elegidos</p>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setCompareIds([])}>Limpiar</Button>
              <LinkButton to={`/comparar?ids=${compareIds.map(encodeURIComponent).join(',')}`} variant="blue">
                Comparar ({compareIds.length})
              </LinkButton>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

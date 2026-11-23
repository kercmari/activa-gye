import { Clock, MapPin, ArrowRight } from 'lucide-react';
import { Link } from 'react-router';
import { usePhase } from '../../auth/SettingsContext';
import type { Place } from '../../data/types';
import { formatPrice, placeImage, summarizeHours } from '../../lib/format';

export interface PlaceCardCompare {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  /** Texto cuando está deshabilitada (p. ej. "Máximo 3"). Por defecto "Comparar". */
  disabledLabel?: string;
}

interface Props {
  place: Place;
  sectorName: string;
  sportName: string;
  distanceKm?: number;
  compare?: PlaceCardCompare;
}

/** Tarjeta de lugar. Toda la tarjeta lleva a la ficha (la casilla "Comparar" va aparte). */
export default function PlaceCard({ place, sectorName, sportName, distanceKm, compare }: Props) {
  const description = place.description?.trim() || `Lugar deportivo en ${sectorName}`;
  const distance = distanceKm === undefined ? null : `a ${distanceKm.toFixed(1).replace('.', ',')} km`;
  // Precios y horarios solo con la fase 3 encendida (regla de la dueña: fase 1 y 2 no los muestran).
  const verPrecios = usePhase(3);
  const showOsmNote = verPrecios && place.source === 'osm' && (place.price_from === null || place.price_from === undefined);

  return (
    <article className="relative flex flex-col overflow-hidden rounded-[1.75rem] bg-white shadow-xl shadow-navy-900/5">
      <div className="relative h-48 bg-navy-800">
        <img src={placeImage(place)} alt="" loading="lazy" className="h-full w-full object-cover" />
        <span className="absolute left-4 top-4 rounded-full bg-white px-3 py-1 text-xs font-bold text-sky-tag shadow">
          {sportName}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-6">
        <h3 className="display text-xl text-navy-900">{place.name}</h3>
        <p className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-sky-tag">
          <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{sectorName}{distance ? ` · ${distance}` : ''}</span>
        </p>
        <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-slate-600">{description}</p>

        <div className="mt-5 border-t border-slate-100 pt-4">
          <div className="flex items-end justify-between gap-3">
            {verPrecios ? (
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-sm text-slate-500">
                  <Clock className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{summarizeHours(place.hours)}</span>
                </p>
                <p className="mt-1 font-extrabold text-navy-900">{formatPrice(place)}</p>
                {showOsmNote ? <p className="mt-1 text-xs text-slate-400">Datos de OpenStreetMap</p> : null}
              </div>
            ) : null}
            <Link
              to={`/lugares/${place.id}`}
              aria-label={`Ver ${place.name}`}
              className="ml-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-50 text-brand-blue transition-colors after:absolute after:inset-0 after:content-[''] hover:bg-sky-100"
            >
              <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </Link>
          </div>

          {compare ? (
            <label className="relative z-10 mt-4 inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-600">
              <input
                type="checkbox"
                className="h-4 w-4 accent-brand-blue"
                checked={compare.checked}
                disabled={compare.disabled}
                onChange={(e) => compare.onChange(e.target.checked)}
              />
              {compare.disabled && compare.disabledLabel ? compare.disabledLabel : 'Comparar'}
            </label>
          ) : null}
        </div>
      </div>
    </article>
  );
}

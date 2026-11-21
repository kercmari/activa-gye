import { CircleMarker, MapContainer, Popup, TileLayer } from 'react-leaflet';
import { Link } from 'react-router';
import type { Place } from '../../data/types';

const GUAYAQUIL_CENTER: [number, number] = [-2.17, -79.9];

interface Props {
  places: Place[];
  center?: [number, number];
  zoom?: number;
  /** Color del punto: azul para listas, naranja para el lugar único de la ficha. */
  color?: 'blue' | 'orange';
  className?: string;
}

const COLORS = { blue: '#2563eb', orange: '#f97316' } as const;

/**
 * Mapa Leaflet con un punto por lugar. Usa CircleMarker (no los íconos de imagen,
 * que se rompen con Vite). Cada punto abre un popup con el nombre y enlace a la ficha.
 */
export default function PlaceMap({ places, center = GUAYAQUIL_CENTER, zoom = 12, color = 'blue', className = '' }: Props) {
  return (
    <div className={`overflow-hidden rounded-[1.75rem] shadow-xl shadow-navy-900/5 ${className}`}>
      <MapContainer center={center} zoom={zoom} scrollWheelZoom={false} className="h-full w-full min-h-[18rem]">
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="© OpenStreetMap"
        />
        {places.map((place) => (
          <CircleMarker
            key={place.id}
            center={[place.lat, place.lng]}
            radius={10}
            pathOptions={{ color: COLORS[color], fillColor: COLORS[color], fillOpacity: 0.8 }}
          >
            <Popup>
              <p className="font-bold">{place.name}</p>
              <Link to={`/lugares/${place.id}`} className="font-bold text-brand-blue">Ver lugar</Link>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}

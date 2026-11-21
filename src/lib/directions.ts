/** Enlaces de "Cómo llegar". Gratis y sin clave: solo construyen URLs. */
export interface Coordinates {
  lat: number;
  lng: number;
}

/** Google Maps: abre la ruta hasta el lugar (en celular abre la app). */
export function googleDirectionsUrl(p: Coordinates): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`;
}

/** OpenStreetMap: mapa del punto del lugar. */
export function osmUrl(p: Coordinates): string {
  return `https://www.openstreetmap.org/?mlat=${p.lat}&mlon=${p.lng}#map=17/${p.lat}/${p.lng}`;
}

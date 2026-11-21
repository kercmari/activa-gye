import { describe, expect, it } from 'vitest';
import { googleDirectionsUrl, osmUrl } from './directions';

describe('directions', () => {
  it('googleDirectionsUrl usa destino lat,lng', () => {
    expect(googleDirectionsUrl({ lat: -2.1894, lng: -79.9 })).toBe(
      'https://www.google.com/maps/dir/?api=1&destination=-2.1894,-79.9',
    );
  });

  it('osmUrl', () => {
    expect(osmUrl({ lat: -2.17, lng: -79.9 })).toBe(
      'https://www.openstreetmap.org/?mlat=-2.17&mlon=-79.9#map=17/-2.17/-79.9',
    );
  });
});

import { describe, it, expect } from 'vitest';
import { distanceKm, formatKm } from './geo';

describe('geo', () => {
  it('distanceKm Centro a Samborondón ≈ 6,1 km', () => {
    const d = distanceKm({ lat: -2.192, lng: -79.884 }, { lat: -2.14, lng: -79.865 });
    expect(d).toBeGreaterThan(5.8);
    expect(d).toBeLessThan(6.4);
  });

  it('formatKm en metros y en km con coma', () => {
    expect(formatKm(0.85)).toBe('a 850 m');
    expect(formatKm(1.23)).toBe('a 1,2 km');
  });
});

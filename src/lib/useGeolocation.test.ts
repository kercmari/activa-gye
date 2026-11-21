import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useGeolocation } from './useGeolocation';

afterEach(() => { vi.unstubAllGlobals(); });

describe('useGeolocation', () => {
  it('sin navigator.geolocation queda en unavailable', () => {
    vi.stubGlobal('navigator', {});
    const { result } = renderHook(() => useGeolocation());
    act(() => result.current.request());
    expect(result.current.status).toBe('unavailable');
  });

  it('permiso negado queda en denied', () => {
    vi.stubGlobal('navigator', {
      geolocation: {
        getCurrentPosition: (_ok: unknown, err: (e: { code: number }) => void) => err({ code: 1 }),
      },
    });
    const { result } = renderHook(() => useGeolocation());
    act(() => result.current.request());
    expect(result.current.status).toBe('denied');
  });

  it('ubicación concedida guarda la posición', () => {
    vi.stubGlobal('navigator', {
      geolocation: {
        getCurrentPosition: (ok: (p: unknown) => void) => ok({ coords: { latitude: -2.1, longitude: -79.9 } }),
      },
    });
    const { result } = renderHook(() => useGeolocation());
    act(() => result.current.request());
    expect(result.current.status).toBe('ok');
    expect(result.current.position).toEqual({ lat: -2.1, lng: -79.9 });
  });
});

import { useCallback, useState } from 'react';

export type GeoStatus = 'idle' | 'asking' | 'ok' | 'denied' | 'unavailable';
export interface GeoPosition { lat: number; lng: number }

const TIMEOUT_MS = 10_000;

/** Pide la ubicación del navegador bajo demanda. Sin soporte → `unavailable`. */
export function useGeolocation() {
  const [position, setPosition] = useState<GeoPosition | null>(null);
  const [status, setStatus] = useState<GeoStatus>('idle');

  const request = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setStatus('unavailable');
      return;
    }
    setStatus('asking');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setStatus('ok');
      },
      (err) => {
        setPosition(null);
        // 1 = PERMISSION_DENIED; 2 y 3 (no disponible / tiempo agotado) son "unavailable".
        setStatus(err.code === 1 ? 'denied' : 'unavailable');
      },
      { timeout: TIMEOUT_MS },
    );
  }, []);

  return { position, status, request };
}

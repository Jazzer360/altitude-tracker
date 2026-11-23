import type { Place } from './types';

const R = 6371000;
const rad = (d: number) => (d * Math.PI) / 180;

export function distanceM(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Nearest saved place whose radius contains the point (accuracy-padded), else null. */
export function matchPlace(places: Place[], pos: { lat: number; lng: number; accuracy?: number }): Place | null {
  const pad = Math.min(pos.accuracy ?? 0, 100);
  let best: Place | null = null;
  let bestD = Infinity;
  for (const p of places) {
    const d = distanceM(p, pos);
    if (d <= p.radiusM + pad && d < bestD) {
      best = p;
      bestD = d;
    }
  }
  return best;
}

export function getPosition(timeoutMs = 8000): Promise<{ lat: number; lng: number; accuracy: number } | null> {
  if (!('geolocation' in navigator)) return Promise.resolve(null);
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 120000 },
    );
  });
}

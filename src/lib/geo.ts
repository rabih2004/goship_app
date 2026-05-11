/**
 * Pure geographic helpers — no side effects, easy to unit-test.
 * All distances are in kilometres unless noted.
 */

const EARTH_RADIUS_KM = 6371;

export function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Great-circle distance between two coordinates using the Haversine formula.
 * Result is in kilometres. Accurate to ~0.5% over typical land distances.
 */
export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

/**
 * Picks the `k` nearest items to a target lat/lng. Returns each item plus
 * its computed `distanceKm`. Items lacking lat/lng are skipped, and the
 * returned `lat`/`lng` are narrowed to non-null.
 */
export function nearestK<T extends { lat: number | null; lng: number | null }>(
  items: T[],
  targetLat: number,
  targetLng: number,
  k: number
): Array<Omit<T, "lat" | "lng"> & { lat: number; lng: number; distanceKm: number }> {
  return items
    .filter((item): item is T & { lat: number; lng: number } =>
      item.lat != null && item.lng != null
    )
    .map((item) => ({
      ...item,
      distanceKm: haversineKm(targetLat, targetLng, item.lat, item.lng),
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, k);
}

/** Round to one decimal place, e.g. 1234.567 → 1234.6 */
export function roundKm(km: number): number {
  return Math.round(km * 10) / 10;
}

/**
 * Vessel-tracking provider abstraction. Set via VESSEL_TRACKING_PROVIDER env var.
 *
 * "mock"          — interpolate position along the great-circle from origin to
 *                   destination based on transit-fraction-elapsed. No network.
 * "marinetraffic" — MarineTraffic API stub. Throws "not yet wired".
 * "ais"           — Generic AIS provider stub. Throws "not yet wired".
 *
 * Position is only computed for bookings in the DEPARTED → ARRIVED window.
 * Before DEPARTED → null (vessel hasn't left). After ARRIVED → snap to
 * destination port. Beyond ARRIVED stages (CLEARED / DELIVERED) → null,
 * because the cargo is no longer on a vessel.
 */
import type { TrackingStage } from "@prisma/client";

export type VesselTrackingProvider = "mock" | "marinetraffic" | "ais";

export function vesselTrackingProvider(): VesselTrackingProvider {
  const v = (process.env.VESSEL_TRACKING_PROVIDER ?? "mock").toLowerCase();
  if (v === "marinetraffic") return "marinetraffic";
  if (v === "ais") return "ais";
  return "mock";
}

export type VesselPosition = {
  lat: number;
  lng: number;
  /** 0..1 — how far along the route the vessel is */
  fraction: number;
  /** ms since epoch, when ARRIVED is projected */
  etaMs: number;
  source: VesselTrackingProvider;
};

export type VesselQuery = {
  origin: { lat: number | null; lng: number | null };
  destination: { lat: number | null; lng: number | null };
  /** All stages reached so far, most-recent last. */
  events: Array<{ stage: TrackingStage; occurredAt: Date }>;
  /** Forwarder-promised transit days for this booking. */
  transitDays: number;
  /** Optional override (defaults to Date.now()) — handy for tests. */
  now?: Date;
};

const DAY_MS = 86_400_000;

/**
 * Great-circle interpolation (slerp on the unit sphere). Returns a point that
 * lies on the actual sea route between two coordinates — important for long
 * trans-Pacific lanes where linear lat/lng interpolation would drift far north.
 */
export function interpolateGreatCircle(
  oLat: number,
  oLng: number,
  dLat: number,
  dLng: number,
  fraction: number
): { lat: number; lng: number } {
  const f = Math.max(0, Math.min(1, fraction));
  const φ1 = toRad(oLat);
  const λ1 = toRad(oLng);
  const φ2 = toRad(dLat);
  const λ2 = toRad(dLng);

  const Δφ = φ2 - φ1;
  const Δλ = λ2 - λ1;
  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  const δ = 2 * Math.asin(Math.min(1, Math.sqrt(a))); // angular distance

  if (δ === 0) return { lat: oLat, lng: oLng };

  const A = Math.sin((1 - f) * δ) / Math.sin(δ);
  const B = Math.sin(f * δ) / Math.sin(δ);
  const x = A * Math.cos(φ1) * Math.cos(λ1) + B * Math.cos(φ2) * Math.cos(λ2);
  const y = A * Math.cos(φ1) * Math.sin(λ1) + B * Math.cos(φ2) * Math.sin(λ2);
  const z = A * Math.sin(φ1) + B * Math.sin(φ2);
  const φi = Math.atan2(z, Math.sqrt(x * x + y * y));
  const λi = Math.atan2(y, x);

  return { lat: toDeg(φi), lng: toDeg(λi) };
}

function toRad(d: number): number {
  return (d * Math.PI) / 180;
}
function toDeg(r: number): number {
  return (r * 180) / Math.PI;
}

/**
 * Latest tracking event by stage. Returns undefined if no such stage reached.
 */
function findEvent(
  events: VesselQuery["events"],
  stage: TrackingStage
): { stage: TrackingStage; occurredAt: Date } | undefined {
  for (let i = events.length - 1; i >= 0; i--) {
    if (events[i].stage === stage) return events[i];
  }
  return undefined;
}

/**
 * Returns a vessel position if the cargo is in the DEPARTED→ARRIVED window,
 * snapping to destination on ARRIVED. Returns null in all other states.
 */
export function mockVesselPosition(q: VesselQuery): VesselPosition | null {
  const { origin, destination, events, transitDays } = q;
  if (
    origin.lat == null ||
    origin.lng == null ||
    destination.lat == null ||
    destination.lng == null
  ) {
    return null;
  }

  const arrived = findEvent(events, "ARRIVED");
  const departed = findEvent(events, "DEPARTED");
  // After ARRIVED but before the cargo's-on-a-vessel state ends, the
  // vessel sits at the destination port. Once CLEARED/DELIVERED appear,
  // there's no vessel to track — return null and let the caller hide the map.
  const lastStage = events[events.length - 1]?.stage;
  if (lastStage === "CLEARED" || lastStage === "DELIVERED") return null;

  if (arrived) {
    return {
      lat: destination.lat,
      lng: destination.lng,
      fraction: 1,
      etaMs: arrived.occurredAt.getTime(),
      source: "mock",
    };
  }

  if (!departed) return null;

  const now = q.now ?? new Date();
  const elapsedMs = now.getTime() - departed.occurredAt.getTime();
  const totalMs = transitDays * DAY_MS;
  const fraction = totalMs > 0 ? Math.max(0, Math.min(1, elapsedMs / totalMs)) : 0;

  const pt = interpolateGreatCircle(
    origin.lat,
    origin.lng,
    destination.lat,
    destination.lng,
    fraction
  );

  return {
    lat: pt.lat,
    lng: pt.lng,
    fraction,
    etaMs: departed.occurredAt.getTime() + totalMs,
    source: "mock",
  };
}

/**
 * Provider-aware entry point. Real providers stub-throw so an unwired flip
 * is loud, not silent.
 */
export async function getVesselPosition(
  q: VesselQuery
): Promise<VesselPosition | null> {
  const provider = vesselTrackingProvider();
  if (provider === "mock") return mockVesselPosition(q);
  if (provider === "marinetraffic") {
    throw new Error(
      "MarineTraffic vessel-tracking provider is not yet wired. Keep VESSEL_TRACKING_PROVIDER=mock until the API integration ships."
    );
  }
  if (provider === "ais") {
    throw new Error(
      "AIS vessel-tracking provider is not yet wired. Keep VESSEL_TRACKING_PROVIDER=mock until the integration ships."
    );
  }
  return null;
}

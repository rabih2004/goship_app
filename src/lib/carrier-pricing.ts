/**
 * Carrier-pricing provider abstraction. Set via CARRIER_PRICING_PROVIDER env var.
 *
 * "mock"     — deterministic baseline computed from haversine distance + container
 *              size + carrier surcharge. No network. Same input always → same output.
 * "cmacgm"   — CMA CGM e-Commerce API. Stub: throws "not implemented" until keys land.
 * "freighty" — Freighty marketplace API. Stub: throws "not implemented".
 *
 * Mock returns a *single* reference rate per lane+container, not a real bid. The
 * forwarder sees it as anchor pricing on the RFQ page; it never bypasses their
 * own quote submission. Goal: dampen wildly off-market bids on day one.
 */
import { haversineKm } from "@/lib/geo";
import type { ContainerType } from "@prisma/client";

export type CarrierPricingProvider = "mock" | "cmacgm" | "freighty";

export type BaselineRate = {
  priceUSDCents: number;
  transitDays: number;
  carrierName: string;
  source: CarrierPricingProvider;
};

export type BaselineQuery = {
  origin: { unlocode: string; lat: number | null; lng: number | null };
  destination: { unlocode: string; lat: number | null; lng: number | null };
  containerType: ContainerType;
};

export function carrierPricingProvider(): CarrierPricingProvider {
  const v = (process.env.CARRIER_PRICING_PROVIDER ?? "mock").toLowerCase();
  if (v === "cmacgm") return "cmacgm";
  if (v === "freighty") return "freighty";
  return "mock";
}

export function isCarrierPricingMock(): boolean {
  return carrierPricingProvider() === "mock";
}

// Container multipliers: LCL is per-CBM-ish (we treat it as a small fixed),
// 20ft is the baseline, 40ft is ~1.6× a 20ft, HC slightly more.
const CONTAINER_MULTIPLIER: Record<ContainerType, number> = {
  LCL: 0.35,
  TWENTY_FT: 1.0,
  FORTY_FT: 1.6,
  FORTY_HC: 1.72,
};

// Base fee + per-nautical-mile rate (USD cents).
// Tuned so 5000 nm × 20ft lands around $2,400–$2,800, matching real spot rates.
const BASE_FEE_CENTS = 60_000; // $600 booking-and-handling floor
const PER_KM_CENTS = 38; // $0.38/km for a 20ft baseline

// Stable deterministic carrier pick for the mock based on the lane string.
// (Real CMA CGM stub would return its own brand here; this is just for display.)
const MOCK_CARRIERS = [
  "Hapag-Lloyd",
  "Maersk",
  "MSC",
  "CMA CGM",
  "ONE",
  "Evergreen",
];

function pickMockCarrier(originUnlocode: string, destUnlocode: string): string {
  let hash = 0;
  const key = `${originUnlocode}->${destUnlocode}`;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) | 0;
  return MOCK_CARRIERS[Math.abs(hash) % MOCK_CARRIERS.length];
}

/**
 * Mock baseline rate computed from great-circle distance.
 *
 * Returns null if either port lacks coordinates — caller hides the panel
 * rather than showing a misleading number.
 */
export function mockBaselineRate(q: BaselineQuery): BaselineRate | null {
  const o = q.origin;
  const d = q.destination;
  if (o.lat == null || o.lng == null || d.lat == null || d.lng == null) {
    return null;
  }

  const km = haversineKm(o.lat, o.lng, d.lat, d.lng);
  const mult = CONTAINER_MULTIPLIER[q.containerType];
  const variable = km * PER_KM_CENTS * mult;
  const priceUSDCents = Math.round(BASE_FEE_CENTS * mult + variable);

  // Ocean speed assumption: ~600 km/day including port dwell time.
  // Floor at 7 days so a Beirut→Limassol trip doesn't claim 1-day transit.
  const transitDays = Math.max(7, Math.round(km / 600));

  return {
    priceUSDCents,
    transitDays,
    carrierName: pickMockCarrier(o.unlocode, d.unlocode),
    source: "mock",
  };
}

/**
 * Provider-aware entry point. Stubs throw clearly so we don't ship broken
 * silence when someone flips the env var without wiring real credentials.
 */
export async function getBaselineRate(
  q: BaselineQuery
): Promise<BaselineRate | null> {
  const provider = carrierPricingProvider();
  if (provider === "mock") return mockBaselineRate(q);
  if (provider === "cmacgm") {
    throw new Error(
      "CMA CGM carrier-pricing provider is not yet wired. Keep CARRIER_PRICING_PROVIDER=mock until the e-Commerce API integration ships."
    );
  }
  if (provider === "freighty") {
    throw new Error(
      "Freighty carrier-pricing provider is not yet wired. Keep CARRIER_PRICING_PROVIDER=mock until the marketplace API integration ships."
    );
  }
  return null;
}

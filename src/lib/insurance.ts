/**
 * Cargo insurance pricing.
 *
 * v1 = flat-rate marine cargo cover. Configurable via INSURANCE_RATE_BPS env
 * var (basis points: 100 bps = 1%). Default 150 bps = 1.5% of cargo value,
 * which is typical for general-merchandise marine cargo insurance.
 *
 * Real underwriting (declared value caps, exclusions, war/strikes riders) is
 * deferred. This module only computes the premium — settlement on a claim is
 * out-of-band in v1.
 */

const DEFAULT_RATE_BPS = 150;

export function insuranceRateBps(): number {
  const raw = process.env.INSURANCE_RATE_BPS;
  if (!raw) return DEFAULT_RATE_BPS;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0 || n > 10_000) return DEFAULT_RATE_BPS;
  return Math.round(n);
}

/**
 * Premium in USD cents, rounded UP to the nearest cent so the platform never
 * under-charges by a fractional fluctuation. Returns 0 when not requested or
 * cargo value missing.
 */
export function computeInsuranceCents(
  wantsInsurance: boolean,
  cargoValueUSDCents: number | null | undefined,
  rateBps: number = insuranceRateBps()
): number {
  if (!wantsInsurance) return 0;
  if (cargoValueUSDCents == null || cargoValueUSDCents <= 0) return 0;
  return Math.ceil((cargoValueUSDCents * rateBps) / 10_000);
}

/**
 * Display-only formatter — "1.5%". Useful in disclosure copy.
 */
export function formatRatePercent(bps: number = insuranceRateBps()): string {
  const pct = bps / 100;
  return `${Number.isInteger(pct) ? pct.toFixed(0) : pct.toFixed(2)}%`;
}

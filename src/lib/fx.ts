/**
 * Multi-currency display layer.
 *
 * USD is the canonical settlement currency — Stripe, Connect payouts, and
 * every Money column in the schema are USD cents. `FxRate.usdRate` is "USD per
 * 1 unit of the target currency" so 1 EUR ≈ 1.08 USD → `usdRate=1.08`.
 *
 * Display-only: we NEVER store converted amounts. Conversion happens at
 * render time using the latest snapshot in `FxRate`. If the rate moves between
 * page load and a hypothetical payment, settlement still uses USD — there's no
 * FX risk for the platform.
 */

import { db } from "@/lib/db";

/**
 * Pure conversion. Returns minor units (cents/fils/yen integer) in the
 * target currency. Rounds to the nearest minor unit.
 *
 * @param amountUSDCents  Source amount in USD cents (the canonical unit).
 * @param usdPerTarget    `FxRate.usdRate` for the target currency
 *                        (USD per 1 unit of target). 1.08 means 1 EUR = 1.08 USD.
 */
export function convertFromUSDCents(
  amountUSDCents: number,
  usdPerTarget: number
): number {
  if (!Number.isFinite(usdPerTarget) || usdPerTarget <= 0) return amountUSDCents;
  return Math.round(amountUSDCents / usdPerTarget);
}

/**
 * Locale-aware money formatter. Uses Intl.NumberFormat with style "currency"
 * so each currency gets its proper symbol and decimal convention.
 * Works in Node (server components) and the browser.
 */
export function formatMoney(
  minorUnits: number,
  currency: string,
  locale: string = "en"
): string {
  // Most currencies have 2 minor-unit decimals. JPY/KRW have 0. Intl knows.
  const major = minorUnits / 100;
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      // Cap at 2 to keep prices readable; Intl auto-uses 0 for JPY etc.
      maximumFractionDigits: 2,
    }).format(major);
  } catch {
    // Unknown currency code → fall back to plain USD-style.
    return `${currency} ${major.toFixed(2)}`;
  }
}

/**
 * Currencies we offer in the settings dropdown. Adding one here ONLY adds it
 * to the dropdown — actual conversion is gated on the FxRate row existing for
 * that currency. (We render USD if no rate found.)
 */
export const SUPPORTED_CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "AED",
  "SAR",
  "LBP",
  "EGP",
  "JOD",
  "CNY",
  "JPY",
] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

export function isSupportedCurrency(c: string): c is SupportedCurrency {
  return (SUPPORTED_CURRENCIES as readonly string[]).includes(c);
}

/**
 * Look up the most recent rate for the given currency. Returns 1 for USD or
 * if no row found (graceful no-op → caller renders the USD amount).
 *
 * Cheap query — pulled from a small table indexed by `(date, currency)` PK.
 */
export async function getLatestRate(currency: string): Promise<number> {
  if (currency === "USD") return 1;
  const row = await db.fxRate.findFirst({
    where: { currency },
    orderBy: { date: "desc" },
    select: { usdRate: true },
  });
  return row?.usdRate ?? 1;
}

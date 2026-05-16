/**
 * Fetch today's FX rates from frankfurter.app (free, no API key, ECB data).
 *
 * Stored as `usdRate` = "USD per 1 unit of target currency". The API returns
 * rates relative to USD base, so we invert each value.
 *
 * Idempotent for a given date: PK is `(date, currency)` so re-running just
 * upserts. Safe to run multiple times per day.
 *
 * Note: frankfurter.app covers ECB currencies. LBP/SAR/EGP/JOD/AED may be
 * absent — those rows are simply skipped and the last seeded value stays.
 */
import { db } from "@/lib/db";

import { SUPPORTED_CURRENCIES } from "./fx";

type FrankfurterResponse = {
  base?: string;
  date?: string;
  rates?: Record<string, number>;
};

export async function fetchAndPersistFxRates(): Promise<{
  date: string;
  written: number;
}> {
  const symbols = SUPPORTED_CURRENCIES.filter((c) => c !== "USD").join(",");
  const url = `https://api.frankfurter.app/latest?base=USD&symbols=${symbols}`;

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`FX fetch failed: ${res.status} ${res.statusText}`);
  }
  const data = (await res.json()) as FrankfurterResponse;
  if (!data.rates || typeof data.rates !== "object") {
    throw new Error("FX fetch returned no rates payload");
  }

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  let written = 0;
  for (const [currency, targetPerUSD] of Object.entries(data.rates)) {
    if (!Number.isFinite(targetPerUSD) || targetPerUSD <= 0) continue;
    // Invert: API gives "1 USD = X target". We want "1 target = Y USD".
    const usdRate = 1 / targetPerUSD;
    await db.fxRate.upsert({
      where: { date_currency: { date: today, currency } },
      create: { date: today, currency, usdRate },
      update: { usdRate },
    });
    written++;
  }
  return { date: today.toISOString().slice(0, 10), written };
}

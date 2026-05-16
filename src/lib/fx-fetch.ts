/**
 * Fetch today's FX rates from exchangerate.host (free, no API key).
 *
 * Stored as `usdRate` = "USD per 1 unit of target currency", which is what
 * `convertFromUSDCents` expects. exchangerate.host gives rates relative to a
 * base — we use USD as base, so the API returns "target per 1 USD". We invert.
 *
 * Idempotent for a given date: PK is `(date, currency)` so re-running just
 * upserts. Safe to run multiple times per day; the most-recent row wins via
 * `orderBy: { date: "desc" }`.
 */
import { db } from "@/lib/db";

import { SUPPORTED_CURRENCIES } from "./fx";

type ExchangeRateHostResponse = {
  success?: boolean;
  base?: string;
  rates?: Record<string, number>;
};

/**
 * Pull rates for every supported currency (except USD itself) and write a row
 * per currency for today's date. Returns count written.
 *
 * Network failures are surfaced — caller (cron route or script) decides
 * whether to retry or alert.
 */
export async function fetchAndPersistFxRates(): Promise<{
  date: string;
  written: number;
}> {
  const symbols = SUPPORTED_CURRENCIES.filter((c) => c !== "USD").join(",");
  const url = `https://api.exchangerate.host/latest?base=USD&symbols=${symbols}`;

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(
      `FX fetch failed: ${res.status} ${res.statusText}`
    );
  }
  const data = (await res.json()) as ExchangeRateHostResponse;
  if (!data.rates || typeof data.rates !== "object") {
    throw new Error("FX fetch returned no rates payload");
  }

  // Date column is DATE (no time). Use today UTC.
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

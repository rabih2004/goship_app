/**
 * One-shot FX seed. Run via `npm run seed:fx`.
 * Idempotent — re-running upserts today's row.
 *
 * Uses hardcoded baseline rates so the seed never depends on an external API.
 * The daily cron at /api/cron/fx-rates keeps rates current in production.
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

// Approximate rates: 1 unit of currency = X USD
const BASELINE_RATES: Record<string, number> = {
  EUR: 1.08,
  GBP: 1.27,
  AED: 0.272,
  SAR: 0.267,
  LBP: 0.0000112,
  EGP: 0.0204,
  JOD: 1.41,
  CNY: 0.138,
  JPY: 0.0068,
};

async function main() {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  let written = 0;
  for (const [currency, usdRate] of Object.entries(BASELINE_RATES)) {
    await db.fxRate.upsert({
      where: { date_currency: { date: today, currency } },
      create: { date: today, currency, usdRate },
      update: { usdRate },
    });
    written++;
  }
  console.log(`Wrote ${written} baseline FX rates for ${today.toISOString().slice(0, 10)}.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());

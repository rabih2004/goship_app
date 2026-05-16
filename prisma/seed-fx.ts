/**
 * One-shot FX seed. Run via `npm run seed:fx`.
 * Idempotent — re-running upserts today's row.
 *
 * For production a daily cron (Vercel cron or GitHub Actions schedule) hits
 * `/api/cron/fx-rates` to call the same function.
 */
import { fetchAndPersistFxRates } from "../src/lib/fx-fetch";

async function main() {
  console.log("Fetching FX rates from exchangerate.host…");
  const { date, written } = await fetchAndPersistFxRates();
  console.log(`Wrote ${written} rates for ${date}.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });

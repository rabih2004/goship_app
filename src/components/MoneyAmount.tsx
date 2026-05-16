import { auth } from "@/auth";
import { db } from "@/lib/db";
import {
  SUPPORTED_CURRENCIES,
  convertFromUSDCents,
  formatMoney,
  getLatestRate,
  isSupportedCurrency,
} from "@/lib/fx";

/**
 * Renders a USD-cents amount in the viewer's preferred currency.
 *
 * Server component — does the DB lookup for the rate. Cheap (single row),
 * but if you render many on a page, prefer `<MoneyAmount.Resolved>` below
 * with a pre-fetched rate to avoid N round-trips.
 *
 * If the currency has no FxRate row OR isn't in our supported list, falls
 * back to USD without complaint — display layer should never error.
 *
 * If `showUSDAside` is true, renders "€92.59 ($100.00)" so the customer can
 * cross-check; useful on the booking-total line where USD is the settlement
 * currency.
 */
export async function MoneyAmount({
  usdCents,
  locale,
  currency,
  showUSDAside = false,
}: {
  usdCents: number;
  locale?: string;
  currency?: string; // override (e.g., admin viewing in original USD)
  showUSDAside?: boolean;
}) {
  const session = await auth();
  const pref =
    currency ??
    (session?.user
      ? (
          await db.user.findUnique({
            where: { id: session.user.id },
            select: { preferredCurrency: true },
          })
        )?.preferredCurrency
      : null) ??
    "USD";

  const code = isSupportedCurrency(pref) ? pref : "USD";

  if (code === "USD") {
    return <span>{formatMoney(usdCents, "USD", locale ?? "en")}</span>;
  }

  const rate = await getLatestRate(code);
  const converted = convertFromUSDCents(usdCents, rate);
  const main = formatMoney(converted, code, locale ?? "en");

  if (!showUSDAside) return <span>{main}</span>;
  return (
    <span>
      {main}
      <span className="ml-1 text-xs text-zinc-500">
        ({formatMoney(usdCents, "USD", locale ?? "en")})
      </span>
    </span>
  );
}

export { SUPPORTED_CURRENCIES };

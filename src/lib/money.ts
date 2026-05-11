/**
 * Money helpers. All prices in the DB are stored as integer USD cents
 * (priceUSDCents) to avoid float rounding.
 */

const USD = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function formatUSD(cents: number): string {
  return USD.format(Math.round(cents) / 100);
}

export function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100);
}

export function centsToDollars(cents: number): number {
  return Math.round(cents) / 100;
}

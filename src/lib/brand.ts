/**
 * Brand identity — name + tagline.
 *
 * Source of truth for the brand name is `NEXT_PUBLIC_BRAND_NAME` so the
 * entire platform can be white-labeled without touching code or translations.
 * `NEXT_PUBLIC_*` is required because we read this in client components too
 * (footer, mobile nav). Falls back to "GoShip" if unset.
 *
 * Tagline is still localized via next-intl — it's marketing copy, not identity.
 */

const FALLBACK_NAME = "GoShip";

export function brandName(): string {
  const v = process.env.NEXT_PUBLIC_BRAND_NAME;
  if (typeof v === "string" && v.trim().length > 0) return v.trim();
  return FALLBACK_NAME;
}

/**
 * Used in <title> and og:title. Includes a separator for sub-pages.
 */
export function pageTitle(suffix?: string): string {
  const base = brandName();
  return suffix ? `${suffix} · ${base}` : base;
}

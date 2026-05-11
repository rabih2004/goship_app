import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

/**
 * Locale-aware pagination strip. Directional arrows are intentionally avoided
 * because Unicode characters like ← and → do not auto-flip under dir="rtl";
 * the flex layout naturally swaps prev/next sides for the right-to-left locales.
 */
export function Pagination({
  page,
  totalPages,
  buildHref,
}: {
  page: number;
  totalPages: number;
  buildHref: (page: number) => string;
}) {
  const t = useTranslations("Common");
  if (totalPages <= 1) return null;

  return (
    <div className="mt-4 flex items-center justify-between text-sm">
      {page > 1 ? (
        <Link href={buildHref(page - 1)} className="text-[var(--brand)] underline">
          {t("prev")}
        </Link>
      ) : (
        <span />
      )}
      <span className="text-zinc-500">
        {t("pageOf", { page, totalPages })}
      </span>
      {page < totalPages ? (
        <Link href={buildHref(page + 1)} className="text-[var(--brand)] underline">
          {t("next")}
        </Link>
      ) : (
        <span />
      )}
    </div>
  );
}

import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";

/**
 * Locale switcher — EN / ع toggles. Defaults to the home route since locale-
 * switching is global; pass `href` to switch in-place on the current page
 * (currently not used because the Link `locale` prop swaps the URL prefix).
 */
export function LocaleSwitch({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-1 text-xs", className)}>
      <Link
        href="/"
        locale="en"
        className="rounded px-2 py-1 text-zinc-600 hover:bg-zinc-100"
      >
        EN
      </Link>
      <Link
        href="/"
        locale="ar"
        className="rounded px-2 py-1 text-zinc-600 hover:bg-zinc-100"
      >
        ع
      </Link>
    </div>
  );
}

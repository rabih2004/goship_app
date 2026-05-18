import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { brandName } from "@/lib/brand";
import { BrandLogo } from "@/components/BrandLogo";
import { LocaleSwitch } from "@/components/LocaleSwitch";

/**
 * Site-wide footer. Rendered at the bottom of every page layout (authed,
 * providers directory, marketing, sign-in/up). Compact on mobile, expanded
 * on desktop with brand column + nav columns + bottom bar.
 */
export async function Footer({ locale }: { locale: "en" | "ar" }) {
  const tBrand = await getTranslations({ locale, namespace: "Brand" });
  const tNav = await getTranslations({ locale, namespace: "Nav" });
  const tP = await getTranslations({ locale, namespace: "Providers" });

  const year = new Date().getFullYear();

  return (
    <footer className="mt-16 border-t border-zinc-200 bg-white">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <BrandLogo variant="full" size="md" />
            <p className="mt-3 max-w-sm text-sm text-zinc-600">
              {tBrand("tagline")}
            </p>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              {tP("tabForwarders")}
            </h3>
            <ul className="mt-3 space-y-2 text-sm text-zinc-700">
              <li>
                <Link href="/providers/forwarders" className="hover:text-zinc-900">
                  {tP("tabForwarders")}
                </Link>
              </li>
              <li>
                <Link href="/providers/coworkers" className="hover:text-zinc-900">
                  {tP("tabCoworkers")}
                </Link>
              </li>
              <li>
                <Link href="/providers/customs" className="hover:text-zinc-900">
                  {tP("tabCustoms")}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              {tNav("signIn")}
            </h3>
            <ul className="mt-3 space-y-2 text-sm text-zinc-700">
              <li>
                <Link href="/sign-in" className="hover:text-zinc-900">
                  {tNav("signIn")}
                </Link>
              </li>
              <li>
                <Link href="/sign-up" className="hover:text-zinc-900">
                  {tNav("signUp")}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-zinc-200 pt-6 text-xs text-zinc-500 sm:flex-row sm:items-center">
          <span>
            © {year} {brandName()}. All rights reserved.
          </span>
          <LocaleSwitch />
        </div>
      </div>
    </footer>
  );
}

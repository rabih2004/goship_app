import { setRequestLocale, getTranslations } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";

import { db } from "@/lib/db";
import { Link } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";
import { RatingStars } from "@/components/RatingStars";

export default async function CoworkersDirectoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ country?: string }>;
}) {
  const { locale: rawLocale } = await params;
  if (!hasLocale(routing.locales, rawLocale)) notFound();
  const locale = rawLocale as AppLocale;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "Providers" });

  const sp = await searchParams;
  const country = sp.country?.toUpperCase().slice(0, 2) || "";

  const profiles = await db.coworkerProfile.findMany({
    where: {
      onboardingComplete: true,
      user: { suspended: false },
      ...(country ? { countryCode: country } : {}),
    },
    orderBy: [{ ratingAvg: "desc" }, { ratingCount: "desc" }],
    select: {
      userId: true,
      displayName: true,
      countryCode: true,
      cityArea: true,
      serviceRadiusKm: true,
      vehicleType: true,
      perKmRateUSDCents: true,
      ratingAvg: true,
      ratingCount: true,
    },
  });

  return (
    <>
      <DirectoryHero
        image="/img/hero-coworkers.jpg"
        title={t("coworkersTitle")}
        intro={t("coworkersIntro")}
      />
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">

      <form className="mb-6 flex flex-wrap items-end gap-3 rounded-lg border border-zinc-200 bg-white p-4">
        <div className="flex-1 min-w-[160px]">
          <label
            htmlFor="country"
            className="block text-xs font-medium text-zinc-700"
          >
            {t("filterCountry")}
          </label>
          <input
            id="country"
            name="country"
            defaultValue={country}
            placeholder="LB"
            maxLength={2}
            className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
          />
        </div>
        <button
          type="submit"
          className="rounded-md bg-[var(--brand)] px-4 py-2 text-sm font-medium text-[var(--brand-fg)] hover:opacity-90"
        >
          {t("filterApply")}
        </button>
        {country && (
          <Link
            href="/providers/coworkers"
            className="text-sm text-zinc-600 underline"
          >
            {t("filterClear")}
          </Link>
        )}
      </form>

      {profiles.length === 0 ? (
        <p className="rounded-md border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500">
          {t("emptyCoworkers")}
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {profiles.map((p) => (
            <li key={p.userId}>
              <Link
                href={`/providers/coworkers/${p.userId}`}
                className="block h-full rounded-lg border border-zinc-200 bg-white p-5 transition hover:border-zinc-400"
              >
                <div className="text-base font-semibold text-zinc-900">
                  {p.displayName}
                </div>
                <div className="mt-0.5 text-xs uppercase tracking-wide text-zinc-500">
                  {p.cityArea} · {p.countryCode}
                </div>
                <div className="mt-3">
                  <RatingStars avg={p.ratingAvg} count={p.ratingCount} size="sm" />
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-zinc-600">
                  <div>
                    <dt className="text-zinc-500">{t("statRadius")}</dt>
                    <dd>{p.serviceRadiusKm} km</dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500">{t("statVehicle")}</dt>
                    <dd>{p.vehicleType}</dd>
                  </div>
                </dl>
              </Link>
            </li>
          ))}
        </ul>
      )}
      </div>
    </>
  );
}

function DirectoryHero({
  image,
  title,
  intro,
}: {
  image: string;
  title: string;
  intro: string;
}) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-amber-700 via-amber-600 to-amber-500 text-white">
      <div
        className="absolute inset-0 bg-cover bg-center opacity-30"
        style={{ backgroundImage: `url("${image}")` }}
        aria-hidden
      />
      <div className="relative mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm text-white/90 sm:text-base">{intro}</p>
      </div>
    </section>
  );
}

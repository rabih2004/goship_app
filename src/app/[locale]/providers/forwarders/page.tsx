import { setRequestLocale, getTranslations } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";

import { db } from "@/lib/db";
import { Link } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";
import { RatingStars } from "@/components/RatingStars";

export default async function ForwardersDirectoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ origin?: string; destination?: string }>;
}) {
  const { locale: rawLocale } = await params;
  if (!hasLocale(routing.locales, rawLocale)) notFound();
  const locale = rawLocale as AppLocale;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "Providers" });

  const sp = await searchParams;
  const origin = sp.origin?.toUpperCase() || "";
  const destination = sp.destination?.toUpperCase() || "";

  // Only surface onboarded, non-suspended forwarders.
  // Filter by lane match (active lane on the requested route) when provided.
  const profiles = await db.forwarderProfile.findMany({
    where: {
      onboardingComplete: true,
      user: { suspended: false },
    },
    orderBy: [{ ratingAvg: "desc" }, { ratingCount: "desc" }],
    select: {
      userId: true,
      companyName: true,
      countryCode: true,
      ratingAvg: true,
      ratingCount: true,
      _count: { select: { lanes: { where: { active: true } } } },
    },
  });

  // Second-stage filter by lane — done client-side after the index pull
  // because the relational filter in Prisma gets clunky for "has an active
  // lane on this specific origin+dest pair".
  let visible = profiles;
  if (origin && destination) {
    const idsOnLane = (
      await db.lane.findMany({
        where: {
          active: true,
          originPortUnlocode: origin,
          destinationPortUnlocode: destination,
        },
        select: { forwarderId: true },
      })
    ).map((l) => l.forwarderId);
    const set = new Set(idsOnLane);
    visible = profiles.filter((p) => set.has(p.userId));
  }

  return (
    <>
      <DirectoryHero
        image="/img/hero-forwarders.jpg"
        title={t("forwardersTitle")}
        intro={t("forwardersIntro")}
      />
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">

      <form className="mb-6 flex flex-wrap items-end gap-3 rounded-lg border border-zinc-200 bg-white p-4">
        <div className="flex-1 min-w-[160px]">
          <label htmlFor="origin" className="block text-xs font-medium text-zinc-700">
            {t("filterOrigin")}
          </label>
          <input
            id="origin"
            name="origin"
            defaultValue={origin}
            placeholder="LBBEY"
            className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
          />
        </div>
        <div className="flex-1 min-w-[160px]">
          <label
            htmlFor="destination"
            className="block text-xs font-medium text-zinc-700"
          >
            {t("filterDestination")}
          </label>
          <input
            id="destination"
            name="destination"
            defaultValue={destination}
            placeholder="DEHAM"
            className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
          />
        </div>
        <button
          type="submit"
          className="rounded-md bg-[var(--brand)] px-4 py-2 text-sm font-medium text-[var(--brand-fg)] hover:opacity-90"
        >
          {t("filterApply")}
        </button>
        {(origin || destination) && (
          <Link
            href="/providers/forwarders"
            className="text-sm text-zinc-600 underline"
          >
            {t("filterClear")}
          </Link>
        )}
      </form>

      {visible.length === 0 ? (
        <p className="rounded-md border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500">
          {t("emptyForwarders")}
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((p) => (
            <li key={p.userId}>
              <Link
                href={`/providers/forwarders/${p.userId}`}
                className="block h-full rounded-lg border border-zinc-200 bg-white p-5 transition hover:border-zinc-400"
              >
                <div className="text-base font-semibold text-zinc-900">
                  {p.companyName}
                </div>
                <div className="mt-0.5 text-xs uppercase tracking-wide text-zinc-500">
                  {p.countryCode}
                </div>
                <div className="mt-3">
                  <RatingStars avg={p.ratingAvg} count={p.ratingCount} size="sm" />
                </div>
                <div className="mt-3 text-xs text-zinc-600">
                  {t("activeLanesCount", { count: p._count.lanes })}
                </div>
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
    <section className="relative overflow-hidden bg-gradient-to-br from-brand-900 via-brand-700 to-brand-600 text-white">
      <div
        className="absolute inset-0 bg-cover bg-center opacity-30"
        style={{ backgroundImage: `url("${image}")` }}
        aria-hidden
      />
      <div className="relative mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm text-white/85 sm:text-base">{intro}</p>
      </div>
    </section>
  );
}

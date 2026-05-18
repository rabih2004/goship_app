import { setRequestLocale } from "next-intl/server";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: AppLocale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <Header variant="public" locale={locale} />
      <main className="flex-1">
        <Hero />
        <HowItWorks />
        <RoleCallouts />
      </main>
      <Footer locale={locale} />
    </>
  );
}

function Hero() {
  const t = useTranslations("Landing");

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-brand-900 via-brand-700 to-brand-600 text-white">
      {/* Hero image — falls back gracefully to gradient if file is missing.
          User drops public/img/hero-shipping.jpg per IMAGERY.md to enable. */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-25"
        style={{ backgroundImage: 'url("/img/hero-shipping.jpg")' }}
        aria-hidden
      />
      {/* Decorative blobs */}
      <div className="pointer-events-none absolute -top-24 -end-24 h-96 w-96 rounded-full bg-brand-400/30 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -bottom-24 -start-24 h-96 w-96 rounded-full bg-brand-300/20 blur-3xl" aria-hidden />

      <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28 lg:py-36">
        <div className="max-w-3xl">
          <span className="inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-xs font-medium uppercase tracking-wide text-white backdrop-blur">
            {t("heroBadge")}
          </span>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl lg:text-6xl">
            {t("hero")}
          </h1>
          <p className="mt-5 max-w-2xl text-base text-white/85 sm:text-lg">
            {t("subhero")}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/sign-up?role=customer"
              className="rounded-lg bg-white px-5 py-3 text-sm font-semibold text-brand-700 shadow-sm transition hover:bg-zinc-50 sm:text-base"
            >
              {t("ctaCustomer")}
            </Link>
            <Link
              href="/providers/forwarders"
              className="rounded-lg border border-white/40 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20 sm:text-base"
            >
              {t("browseProviders")}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const t = useTranslations("Landing");
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto mb-10 max-w-2xl text-center">
        <h2 className="text-2xl font-semibold text-zinc-900 sm:text-3xl">
          {t("howItWorks")}
        </h2>
      </div>
      <div className="grid gap-5 sm:grid-cols-3">
        <Step n={1} title={t("step1Title")} body={t("step1Body")} />
        <Step n={2} title={t("step2Title")} body={t("step2Body")} />
        <Step n={3} title={t("step3Title")} body={t("step3Body")} />
      </div>
    </section>
  );
}

function RoleCallouts() {
  const t = useTranslations("Landing");
  return (
    <section className="bg-zinc-50">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <h2 className="text-2xl font-semibold text-zinc-900 sm:text-3xl">
            {t("roleCalloutsTitle")}
          </h2>
          <p className="mt-3 text-base text-zinc-600">
            {t("roleCalloutsSubtitle")}
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <RoleCard
            href="/sign-up?role=forwarder"
            title={t("ctaForwarder")}
            body={t("ctaForwarderBody")}
            getStarted={t("getStarted")}
            accent="from-brand-500 to-brand-700"
          />
          <RoleCard
            href="/sign-up?role=coworker"
            title={t("ctaCoworker")}
            body={t("ctaCoworkerBody")}
            getStarted={t("getStarted")}
            accent="from-amber-400 to-amber-600"
          />
          <RoleCard
            href="/sign-up?role=customs-agent"
            title={t("ctaCustomsAgent")}
            body={t("ctaCustomsBody")}
            getStarted={t("getStarted")}
            accent="from-emerald-400 to-emerald-600"
          />
        </div>
      </div>
    </section>
  );
}

function Step({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-base font-semibold text-brand-700">
        {n}
      </div>
      <h3 className="mb-1.5 text-lg font-semibold text-zinc-900">{title}</h3>
      <p className="text-sm text-zinc-600">{body}</p>
    </div>
  );
}

function RoleCard({
  href,
  title,
  body,
  getStarted,
  accent,
}: {
  href: string;
  title: string;
  body: string;
  getStarted: string;
  accent: string;
}) {
  return (
    <Link
      href={href}
      className="group relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div
        className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${accent}`}
        aria-hidden
      />
      <h3 className="mt-2 text-lg font-semibold text-zinc-900">{title}</h3>
      <p className="mt-1.5 text-sm text-zinc-600">{body}</p>
      <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand-700 group-hover:text-brand-800">
        {getStarted}
        <span className="dir-arrow" />
      </span>
    </Link>
  );
}

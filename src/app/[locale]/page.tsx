import { setRequestLocale } from "next-intl/server";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { auth } from "@/auth";
import type { AppLocale } from "@/i18n/routing";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: AppLocale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await auth();

  return <Landing isAuthed={!!session?.user} />;
}

function Landing({ isAuthed }: { isAuthed: boolean }) {
  const tBrand = useTranslations("Brand");
  const tNav = useTranslations("Nav");
  const t = useTranslations("Landing");

  return (
    <>
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto max-w-6xl flex items-center justify-between px-6 py-4">
          <Link href="/" className="text-lg font-semibold text-zinc-900">
            {tBrand("name")}
          </Link>
          <nav className="flex items-center gap-3 text-sm">
            <LocaleSwitch />
            {isAuthed ? (
              <Link
                href="/dashboard"
                className="rounded-md bg-[var(--brand)] px-4 py-2 font-medium text-[var(--brand-fg)] hover:opacity-90"
              >
                {tNav("dashboard")}
              </Link>
            ) : (
              <>
                <Link
                  href="/sign-in"
                  className="rounded-md px-4 py-2 font-medium text-zinc-700 hover:text-zinc-900"
                >
                  {tNav("signIn")}
                </Link>
                <Link
                  href="/sign-up"
                  className="rounded-md bg-[var(--brand)] px-4 py-2 font-medium text-[var(--brand-fg)] hover:opacity-90"
                >
                  {tNav("signUp")}
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-6 py-20 text-center">
          <h1 className="mx-auto max-w-3xl text-4xl font-semibold tracking-tight text-zinc-900 sm:text-5xl">
            {t("hero")}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-zinc-600">
            {t("subhero")}
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Link
              href="/sign-up?role=customer"
              className="rounded-md bg-[var(--brand)] px-6 py-3 font-medium text-[var(--brand-fg)] hover:opacity-90"
            >
              {t("ctaCustomer")}
            </Link>
            <Link
              href="/sign-up?role=forwarder"
              className="rounded-md border border-zinc-300 bg-white px-6 py-3 font-medium text-zinc-900 hover:bg-zinc-50"
            >
              {t("ctaForwarder")}
            </Link>
            <Link
              href="/sign-up?role=coworker"
              className="rounded-md border border-zinc-300 bg-white px-6 py-3 font-medium text-zinc-900 hover:bg-zinc-50"
            >
              {t("ctaCoworker")}
            </Link>
          </div>
          <p className="mt-6 text-sm text-zinc-500">
            <Link
              href="/providers/forwarders"
              className="text-[var(--brand)] underline"
            >
              {t("browseProviders")}
            </Link>
          </p>
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-20">
          <h2 className="mb-8 text-center text-2xl font-semibold text-zinc-900">
            {t("howItWorks")}
          </h2>
          <div className="grid gap-6 sm:grid-cols-3">
            <Step n={1} title={t("step1Title")} body={t("step1Body")} />
            <Step n={2} title={t("step2Title")} body={t("step2Body")} />
            <Step n={3} title={t("step3Title")} body={t("step3Body")} />
          </div>
        </section>
      </main>

      <footer className="border-t border-zinc-200 bg-white py-8 text-center text-sm text-zinc-500">
        © {new Date().getFullYear()} {tBrand("name")}
      </footer>
    </>
  );
}

function Step({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-6">
      <div className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--brand)] text-sm font-semibold text-[var(--brand-fg)]">
        {n}
      </div>
      <h3 className="mb-2 text-lg font-medium text-zinc-900">{title}</h3>
      <p className="text-sm text-zinc-600">{body}</p>
    </div>
  );
}

function LocaleSwitch() {
  return (
    <div className="flex items-center gap-1 text-xs">
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

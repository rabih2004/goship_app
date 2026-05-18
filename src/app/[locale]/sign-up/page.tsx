import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";

import type { AppLocale } from "@/i18n/routing";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

import { SignUpForm } from "./SignUpForm";

export default async function SignUpPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: AppLocale }>;
  searchParams: Promise<{ role?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);

  const defaultRole =
    sp.role === "forwarder"
      ? "FORWARDER"
      : sp.role === "coworker"
        ? "COWORKER"
        : sp.role === "customs" || sp.role === "customs-agent"
          ? "CUSTOMS_AGENT"
          : "CUSTOMER";

  return (
    <>
      <Header variant="public" locale={locale} />
      <main className="flex-1">
        <SignUpView locale={locale} defaultRole={defaultRole} />
      </main>
      <Footer locale={locale} />
    </>
  );
}

function SignUpView({
  locale,
  defaultRole,
}: {
  locale: AppLocale;
  defaultRole: "CUSTOMER" | "FORWARDER" | "COWORKER" | "CUSTOMS_AGENT";
}) {
  const t = useTranslations("Auth");
  return (
    <div className="grid min-h-[640px] grid-cols-1 lg:grid-cols-5">
      <div className="flex items-center justify-center px-4 py-12 sm:px-8 lg:col-span-3">
        <div className="w-full max-w-md">
          <h1 className="text-2xl font-semibold text-zinc-900 sm:text-3xl">
            {t("signUpTitle")}
          </h1>
          <p className="mt-2 text-sm text-zinc-600">
            One account works across all roles you might play.
          </p>
          <div className="mt-8">
            <SignUpForm locale={locale} defaultRole={defaultRole} />
          </div>
        </div>
      </div>

      <div className="relative hidden bg-gradient-to-br from-brand-900 via-brand-700 to-brand-600 lg:col-span-2 lg:block">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-40"
          style={{ backgroundImage: 'url("/img/hero-shipping.jpg")' }}
          aria-hidden
        />
        <div className="relative flex h-full flex-col justify-end p-10 text-white">
          <ul className="space-y-3 text-sm">
            <li className="flex items-start gap-2">
              <span className="mt-0.5 inline-block h-5 w-5 rounded-full bg-white/20 text-center leading-5">✓</span>
              <span>Mock payments and onboarding — explore everything offline.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 inline-block h-5 w-5 rounded-full bg-white/20 text-center leading-5">✓</span>
              <span>English + Arabic (RTL) UI out of the box.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 inline-block h-5 w-5 rounded-full bg-white/20 text-center leading-5">✓</span>
              <span>End-to-end: RFQ → quotes → booking → tracking → reviews.</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

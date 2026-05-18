import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";

import type { AppLocale } from "@/i18n/routing";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

import { SignInForm } from "./SignInForm";

export default async function SignInPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: AppLocale }>;
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);

  return (
    <>
      <Header variant="public" locale={locale} />
      <main className="flex-1">
        <SignInView locale={locale} callbackUrl={sp.callbackUrl} />
      </main>
      <Footer locale={locale} />
    </>
  );
}

function SignInView({
  locale,
  callbackUrl,
}: {
  locale: AppLocale;
  callbackUrl?: string;
}) {
  const t = useTranslations("Auth");
  return (
    <div className="grid min-h-[640px] grid-cols-1 lg:grid-cols-5">
      {/* Form column */}
      <div className="flex items-center justify-center px-4 py-12 sm:px-8 lg:col-span-3">
        <div className="w-full max-w-md">
          <h1 className="text-2xl font-semibold text-zinc-900 sm:text-3xl">
            {t("signInTitle")}
          </h1>
          <p className="mt-2 text-sm text-zinc-600">
            Sign in to manage shipments, bids, or bookings.
          </p>
          <div className="mt-8">
            <SignInForm locale={locale} callbackUrl={callbackUrl} />
          </div>
        </div>
      </div>

      {/* Imagery column — hidden on mobile */}
      <div
        className="relative hidden bg-gradient-to-br from-brand-900 via-brand-700 to-brand-600 lg:col-span-2 lg:block"
      >
        <div
          className="absolute inset-0 bg-cover bg-center opacity-40"
          style={{ backgroundImage: 'url("/img/hero-shipping.jpg")' }}
          aria-hidden
        />
        <div className="relative flex h-full flex-col justify-end p-10 text-white">
          <blockquote className="text-lg leading-relaxed">
            "We post one RFQ and three forwarders bid within hours. What used to take
            a week now takes an afternoon."
          </blockquote>
          <div className="mt-4 text-sm text-white/80">
            — A real exporter, somewhere on the Mediterranean
          </div>
        </div>
      </div>
    </div>
  );
}

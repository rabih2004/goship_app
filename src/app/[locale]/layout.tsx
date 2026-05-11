import type { Metadata } from "next";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { setRequestLocale, getMessages, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Inter, Noto_Sans_Arabic } from "next/font/google";

import { routing, isRtl, type AppLocale } from "@/i18n/routing";
import "../globals.css";

const inter = Inter({
  variable: "--font-sans-latin",
  subsets: ["latin"],
});

const arabic = Noto_Sans_Arabic({
  variable: "--font-sans-arabic",
  subsets: ["arabic"],
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: AppLocale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Brand" });
  return {
    title: t("name"),
    description: t("tagline"),
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      dir={isRtl(locale) ? "rtl" : "ltr"}
      className={`${inter.variable} ${arabic.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-zinc-50 text-zinc-900">
        <NextIntlClientProvider messages={messages} locale={locale}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import type { AppLocale } from "@/i18n/routing";
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

  return <SignInView locale={locale} callbackUrl={sp.callbackUrl} />;
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
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-6 py-12">
      <h1 className="text-2xl font-semibold text-zinc-900">{t("signInTitle")}</h1>
      <SignInForm locale={locale} callbackUrl={callbackUrl} />
    </div>
  );
}

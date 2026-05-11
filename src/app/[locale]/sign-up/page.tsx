import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import type { AppLocale } from "@/i18n/routing";
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
        : "CUSTOMER";

  return <SignUpView locale={locale} defaultRole={defaultRole} />;
}

function SignUpView({
  locale,
  defaultRole,
}: {
  locale: AppLocale;
  defaultRole: "CUSTOMER" | "FORWARDER" | "COWORKER";
}) {
  const t = useTranslations("Auth");
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-6 py-12">
      <h1 className="text-2xl font-semibold text-zinc-900">{t("signUpTitle")}</h1>
      <SignUpForm locale={locale} defaultRole={defaultRole} />
    </div>
  );
}

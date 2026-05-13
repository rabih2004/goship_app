import { setRequestLocale } from "next-intl/server";
import { auth } from "@/auth";
import { redirect } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: AppLocale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await auth();
  if (!session?.user) redirect({ href: "/sign-in", locale });

  const role = session!.user.role;
  if (role === "ADMIN") redirect({ href: "/admin", locale });
  if (role === "FORWARDER") redirect({ href: "/forwarder", locale });
  if (role === "COWORKER") redirect({ href: "/coworker", locale });
  if (role === "CUSTOMS_AGENT") redirect({ href: "/customs", locale });
  redirect({ href: "/customer", locale });
}

import { hasLocale } from "next-intl";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import { routing } from "@/i18n/routing";
import { profileHrefForRole } from "@/components/nav-links";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  if (!hasLocale(routing.locales, rawLocale)) notFound();

  const session = await auth();
  if (!session?.user) redirect(`/${rawLocale}/sign-in`);

  const profileHref = profileHrefForRole(session.user.role as Parameters<typeof profileHrefForRole>[0]);
  redirect(`/${rawLocale}${profileHref}`);
}

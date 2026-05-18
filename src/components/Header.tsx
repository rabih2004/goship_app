import { getTranslations } from "next-intl/server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { Link } from "@/i18n/navigation";
import { BrandLogo } from "@/components/BrandLogo";
import { NotificationBell } from "@/components/NotificationBell";
import { UnreadBadge } from "@/components/UnreadBadge";
import { UserMenu } from "@/components/UserMenu";
import { MobileNav } from "@/components/MobileNav";
import { LocaleSwitch } from "@/components/LocaleSwitch";
import {
  dashboardHrefForRole,
  navLinksForRole,
  type NavLink,
} from "@/components/nav-links";
import { avatarUrl } from "@/lib/avatars";

type Role = "CUSTOMER" | "FORWARDER" | "COWORKER" | "CUSTOMS_AGENT" | "ADMIN";

/**
 * Universal header. Two variants:
 *  - `variant="authed"` — full nav, bell, chat badge, user menu, mobile drawer.
 *  - `variant="public"` — brand + sign-in/sign-up CTAs OR dashboard link if session exists.
 */
type HeaderProps =
  | { variant: "authed"; locale: "en" | "ar" }
  | { variant: "public"; locale: "en" | "ar" };

export async function Header(props: HeaderProps) {
  const { locale } = props;
  const session = await auth();
  const tNav = await getTranslations({ locale, namespace: "Nav" });
  const t = await getTranslations({ locale, namespace: "Header" });

  // Public variant
  if (props.variant === "public" || !session?.user) {
    return (
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/" className="inline-flex items-center" aria-label="Home">
            <BrandLogo variant="full" size="md" priority />
          </Link>
          <nav className="flex items-center gap-2 sm:gap-3 text-sm">
            <LocaleSwitch className="hidden sm:flex" />
            {session?.user ? (
              <Link
                href="/dashboard"
                className="rounded-md bg-brand-600 px-3 py-2 font-medium text-white hover:bg-brand-700 sm:px-4"
              >
                {tNav("dashboard")}
              </Link>
            ) : (
              <>
                <Link
                  href="/sign-in"
                  className="hidden rounded-md px-3 py-2 font-medium text-zinc-700 hover:text-zinc-900 sm:inline-block"
                >
                  {tNav("signIn")}
                </Link>
                <Link
                  href="/sign-up"
                  className="rounded-md bg-brand-600 px-3 py-2 font-medium text-white hover:bg-brand-700 sm:px-4"
                >
                  {tNav("signUp")}
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>
    );
  }

  // Authed variant — needs richer user info
  const role = session.user.role as Role;
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      email: true,
      image: true,
      forwarderProfile: { select: { logoUrl: true } },
      coworkerProfile: { select: { logoUrl: true } },
      customsAgentProfile: { select: { logoUrl: true } },
    },
  });

  // Prefer role-specific logo over user.image; resolve s3: markers to a real URL.
  const rawImage =
    user?.forwarderProfile?.logoUrl ??
    user?.coworkerProfile?.logoUrl ??
    user?.customsAgentProfile?.logoUrl ??
    user?.image ??
    null;
  const resolvedImage = await avatarUrl(rawImage);

  const links: NavLink[] = navLinksForRole(role);

  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6">
        <Link
          href={dashboardHrefForRole(role)}
          className="inline-flex shrink-0 items-center"
          aria-label="Dashboard"
        >
          <BrandLogo variant="full" size="md" priority />
        </Link>

        {/* Desktop nav */}
        <nav className="ms-6 hidden flex-1 items-center gap-1 lg:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-brand-50 hover:text-brand-700"
            >
              {t(l.labelKey)}
            </Link>
          ))}
        </nav>

        <div className="ms-auto flex items-center gap-1 sm:gap-2">
          <NotificationBell userId={session.user.id} locale={locale} />
          <span className="hidden sm:inline-flex">
            <UnreadBadge userId={session.user.id} />
          </span>

          {/* Desktop user menu */}
          <span className="hidden lg:inline-flex">
            <UserMenu
              name={user?.name ?? session.user.email ?? ""}
              email={user?.email ?? session.user.email ?? ""}
              image={resolvedImage}
              role={role}
              locale={locale}
            />
          </span>

          {/* Mobile drawer trigger */}
          <MobileNav
            name={user?.name ?? session.user.email ?? ""}
            email={user?.email ?? session.user.email ?? ""}
            image={resolvedImage}
            role={role}
            locale={locale}
          />
        </div>
      </div>
    </header>
  );
}

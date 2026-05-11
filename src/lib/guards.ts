import { auth } from "@/auth";
import { redirect } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";

type Role = "CUSTOMER" | "FORWARDER" | "COWORKER" | "ADMIN";

export async function requireRole(
  allowed: Role | Role[],
  locale: AppLocale
): Promise<{ id: string; email: string; role: Role; locale: string }> {
  const session = await auth();
  if (!session?.user) redirect({ href: "/sign-in", locale });

  const role = session!.user.role as Role;
  const allowedSet = Array.isArray(allowed) ? allowed : [allowed];
  if (!allowedSet.includes(role)) redirect({ href: "/dashboard", locale });

  return {
    id: session!.user.id,
    email: session!.user.email ?? "",
    role,
    locale: session!.user.locale,
  };
}

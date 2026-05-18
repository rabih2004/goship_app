import Image from "next/image";

import { cn } from "@/lib/cn";

/**
 * User/profile avatar. Falls back to initials on a brand-tinted background
 * when no image URL is set.
 *
 * Role drives an optional colored ring so a user can recognize counterparties
 * by role at a glance in chat / quote-comparison lists.
 */
type Size = "sm" | "md" | "lg" | "xl";
type Role = "CUSTOMER" | "FORWARDER" | "COWORKER" | "CUSTOMS_AGENT" | "ADMIN";

const SIZES: Record<Size, { px: number; text: string }> = {
  sm: { px: 28, text: "text-xs" },
  md: { px: 36, text: "text-sm" },
  lg: { px: 56, text: "text-base" },
  xl: { px: 96, text: "text-2xl" },
};

const ROLE_RING: Record<Role, string> = {
  CUSTOMER: "ring-[var(--role-customer)]",
  FORWARDER: "ring-[var(--role-forwarder)]",
  COWORKER: "ring-[var(--role-coworker)]",
  CUSTOMS_AGENT: "ring-[var(--role-customs)]",
  ADMIN: "ring-[var(--role-admin)]",
};

export function Avatar({
  name,
  image,
  size = "md",
  role,
  className,
}: {
  name: string;
  image?: string | null;
  size?: Size;
  role?: Role;
  className?: string;
}) {
  const { px, text } = SIZES[size];
  const ring = role ? `ring-2 ring-offset-2 ring-offset-white ${ROLE_RING[role]}` : "";

  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("") || "?";

  if (image) {
    return (
      <Image
        src={image}
        alt={name}
        width={px}
        height={px}
        className={cn(
          "rounded-full object-cover bg-zinc-100",
          ring,
          className
        )}
      />
    );
  }

  return (
    <span
      aria-label={name}
      title={name}
      className={cn(
        "inline-flex items-center justify-center rounded-full bg-brand-600 font-semibold text-white",
        text,
        ring,
        className
      )}
      style={{ width: px, height: px }}
    >
      {initials}
    </span>
  );
}

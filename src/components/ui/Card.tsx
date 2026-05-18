import type { HTMLAttributes } from "react";

import { cn } from "@/lib/cn";

/**
 * Surface primitive. Use everywhere a content block needs a card treatment.
 *
 * Variants:
 *  - padded: standard p-6 inner padding (most pages).
 *  - flush:  no inner padding — let the child control it (e.g. table cards).
 *  - interactive: adds hover ring + cursor; for clickable cards wrapped in <Link>.
 */
type Variant = "padded" | "flush" | "interactive";

const styles: Record<Variant, string> = {
  padded:
    "rounded-2xl border border-zinc-200 bg-white shadow-sm p-6",
  flush:
    "rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden",
  interactive:
    "rounded-2xl border border-zinc-200 bg-white shadow-sm p-6 transition hover:border-brand-300 hover:shadow-md cursor-pointer",
};

export function Card({
  variant = "padded",
  className,
  ...rest
}: HTMLAttributes<HTMLDivElement> & { variant?: Variant }) {
  return <div className={cn(styles[variant], className)} {...rest} />;
}

export function CardHeader({
  title,
  subtitle,
  action,
  className,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-4 flex items-start justify-between gap-3", className)}>
      <div>
        <h2 className="text-base font-semibold text-zinc-900">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-zinc-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

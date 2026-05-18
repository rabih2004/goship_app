import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

/**
 * Empty-state primitive. Use in any list/grid/inbox that can render zero items.
 * Optional `icon` is rendered above the heading; size yourself (h-12 w-12 is good).
 */
export function EmptyState({
  icon,
  title,
  body,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  body?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-dashed border-zinc-300 bg-zinc-50/60 px-6 py-12 text-center",
        className
      )}
    >
      {icon && (
        <div className="mx-auto mb-4 inline-flex items-center justify-center rounded-full bg-brand-50 p-3 text-brand-600">
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold text-zinc-900">{title}</h3>
      {body && (
        <p className="mx-auto mt-1.5 max-w-md text-sm text-zinc-600">{body}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  loading?: boolean;
};

const styles: Record<Variant, string> = {
  primary:
    "bg-[var(--brand)] text-[var(--brand-fg)] hover:opacity-90 disabled:opacity-50",
  secondary:
    "bg-white text-zinc-900 border border-zinc-300 hover:bg-zinc-50 disabled:opacity-50",
  ghost: "text-zinc-700 hover:text-zinc-900 hover:bg-zinc-100 disabled:opacity-50",
  danger: "bg-red-600 text-white hover:bg-red-700 disabled:opacity-50",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button({ className, variant = "primary", loading, disabled, children, ...rest }, ref) {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition",
          styles[variant],
          className
        )}
        {...rest}
      >
        {loading ? "…" : children}
      </button>
    );
  }
);

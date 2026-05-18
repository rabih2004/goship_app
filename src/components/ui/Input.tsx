import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  invalid?: boolean;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  function Input({ className, invalid, ...rest }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          "block w-full rounded-lg border bg-white px-3 py-2 text-sm text-zinc-900 transition",
          "placeholder:text-zinc-400",
          "focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-500",
          invalid
            ? "border-red-400 bg-red-50/40 focus:ring-red-200 focus:border-red-500"
            : "border-zinc-300 hover:border-zinc-400",
          className
        )}
        {...rest}
      />
    );
  }
);

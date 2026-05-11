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
          "block w-full rounded-md border bg-white px-3 py-2 text-sm text-zinc-900",
          "placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:border-[var(--brand)]",
          invalid ? "border-red-400" : "border-zinc-300",
          className
        )}
        {...rest}
      />
    );
  }
);

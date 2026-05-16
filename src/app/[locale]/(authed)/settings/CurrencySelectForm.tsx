"use client";

import { useTranslations } from "next-intl";

import { updatePreferredCurrencyAction } from "./actions";

export function CurrencySelectForm({
  locale,
  current,
  options,
}: {
  locale: "en" | "ar";
  current: string;
  options: string[];
}) {
  const t = useTranslations("Settings");
  return (
    <form action={updatePreferredCurrencyAction} className="flex flex-wrap items-center gap-3">
      <input type="hidden" name="locale" value={locale} />
      <select
        name="currency"
        defaultValue={current}
        className="block rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
      >
        {options.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      <button
        type="submit"
        className="rounded-md bg-[var(--brand)] px-4 py-2 text-sm font-medium text-[var(--brand-fg)] hover:opacity-90"
      >
        {t("save")}
      </button>
    </form>
  );
}

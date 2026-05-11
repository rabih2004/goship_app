"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { searchPorts, type PortHit } from "@/lib/ports";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/cn";

export function PortSelect({
  name,
  defaultValue,
  defaultLabel,
  placeholder,
  invalid,
}: {
  name: string;
  defaultValue?: string;
  defaultLabel?: string;
  placeholder?: string;
  invalid?: boolean;
}) {
  const t = useTranslations("Common");
  const [selected, setSelected] = useState<PortHit | null>(
    defaultValue && defaultLabel
      ? { unlocode: defaultValue, name: defaultLabel, country: "" }
      : null
  );
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PortHit[]>([]);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!query || selected?.name === query) {
      setResults([]);
      return;
    }
    const handle = setTimeout(() => {
      startTransition(async () => {
        const hits = await searchPorts(query);
        setResults(hits);
        setOpen(true);
      });
    }, 200);
    return () => clearTimeout(handle);
  }, [query, selected?.name]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function pick(hit: PortHit) {
    setSelected(hit);
    setQuery(`${hit.name} (${hit.unlocode})`);
    setOpen(false);
  }

  function clear() {
    setSelected(null);
    setQuery("");
    setResults([]);
    setOpen(false);
  }

  return (
    <div ref={wrapRef} className="relative">
      <input type="hidden" name={name} value={selected?.unlocode ?? ""} />
      <div className="relative">
        <Input
          value={query || (selected ? `${selected.name} (${selected.unlocode})` : "")}
          onChange={(e) => {
            setQuery(e.target.value);
            if (selected) setSelected(null);
          }}
          onFocus={() => results.length && setOpen(true)}
          placeholder={placeholder ?? t("portSearchPlaceholder")}
          autoComplete="off"
          invalid={invalid}
        />
        {selected && (
          <button
            type="button"
            onClick={clear}
            className="absolute end-2 top-1/2 -translate-y-1/2 rounded p-1 text-xs text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
            aria-label={t("clearAria")}
          >
            ✕
          </button>
        )}
      </div>

      {open && (results.length > 0 || pending) && (
        <ul className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-md border border-zinc-200 bg-white shadow-lg">
          {pending && (
            <li className="px-3 py-2 text-sm text-zinc-400">{t("searching")}</li>
          )}
          {!pending &&
            results.map((hit) => (
              <li key={hit.unlocode}>
                <button
                  type="button"
                  onClick={() => pick(hit)}
                  className={cn(
                    "block w-full px-3 py-2 text-start text-sm hover:bg-zinc-100",
                    selected?.unlocode === hit.unlocode && "bg-zinc-100"
                  )}
                >
                  <span className="font-medium text-zinc-900">{hit.name}</span>{" "}
                  <span className="text-xs text-zinc-500">
                    {hit.unlocode} · {hit.country}
                  </span>
                </button>
              </li>
            ))}
          {!pending && results.length === 0 && query.length >= 2 && (
            <li className="px-3 py-2 text-sm text-zinc-400">
              {t("noPortMatch", { query })}
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

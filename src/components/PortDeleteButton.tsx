"use client";

import { deletePortAction } from "@/lib/ports-actions";
import { Button } from "@/components/ui/Button";

export function PortDeleteButton({
  unlocode,
  name,
  locale,
  backHref,
}: {
  unlocode: string;
  name: string;
  locale: string;
  backHref: string;
}) {
  return (
    <form action={deletePortAction}>
      <input type="hidden" name="unlocode" value={unlocode} />
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="backHref" value={backHref} />
      <Button
        type="submit"
        variant="ghost"
        size="sm"
        className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50"
        onClick={(e) => {
          if (!window.confirm(`Delete ${unlocode} — ${name}?`)) e.preventDefault();
        }}
      >
        Delete
      </Button>
    </form>
  );
}

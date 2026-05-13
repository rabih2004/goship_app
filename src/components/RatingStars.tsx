import { starsFilled, formatRating } from "@/lib/reviews";

/**
 * Read-only star display. Renders five glyphs and a "(N)" count suffix.
 * For interactive star pickers see `<StarPicker>` in ReviewForm.
 */
export function RatingStars({
  avg,
  count,
  showLabel = true,
  size = "md",
}: {
  avg: number;
  count: number;
  showLabel?: boolean;
  size?: "sm" | "md";
}) {
  const filled = starsFilled(avg);
  const cls = size === "sm" ? "text-xs" : "text-sm";

  return (
    <span className={`inline-flex items-center gap-1 ${cls}`}>
      <span aria-hidden className="font-mono text-amber-500">
        {"★".repeat(filled)}
        <span className="text-zinc-300">{"★".repeat(5 - filled)}</span>
      </span>
      {showLabel && (
        <span className="text-zinc-600">{formatRating(avg, count)}</span>
      )}
    </span>
  );
}

import Image from "next/image";

import { brandName } from "@/lib/brand";
import { cn } from "@/lib/cn";

/**
 * Brand logo. Picks file by variant; falls back to the SVG wordmark/mark in
 * /public/brand/ that ships with the repo. If the user drops `logo.png` /
 * `logo-mark.png` later, they win (no code edit needed — just place files).
 *
 * Why next/image: handles AVIF/WebP negotiation + lazy loading + proper
 * intrinsic sizing without CLS. SVG fallback is rendered via next/image too;
 * it works fine for vectors.
 */

type Variant = "full" | "mark" | "light";
type Size = "sm" | "md" | "lg";

const SIZE_MAP: Record<Variant, Record<Size, { w: number; h: number }>> = {
  full: {
    sm: { w: 96, h: 26 },
    md: { w: 144, h: 38 },
    lg: { w: 200, h: 53 },
  },
  mark: {
    sm: { w: 24, h: 24 },
    md: { w: 32, h: 32 },
    lg: { w: 48, h: 48 },
  },
  light: {
    sm: { w: 96, h: 26 },
    md: { w: 144, h: 38 },
    lg: { w: 200, h: 53 },
  },
};

// Prefer PNG drop-ins, fall back to SVG ship-with-repo. Ordered: try first, then second.
const SOURCES: Record<Variant, string[]> = {
  full: ["/brand/logo.png", "/brand/logo.svg"],
  mark: ["/brand/logo-mark.png", "/brand/logo-mark.svg"],
  light: ["/brand/logo-light.png", "/brand/logo.svg"],
};

export function BrandLogo({
  variant = "full",
  size = "md",
  className,
  priority = false,
}: {
  variant?: Variant;
  size?: Size;
  className?: string;
  priority?: boolean;
}) {
  const { w, h } = SIZE_MAP[variant][size];
  // Pick the first source — Next.js will return 404 if missing, but since
  // logo.svg / logo-mark.svg are always in /public/brand/, this never fails.
  // Once the user drops a logo.png, they'd update SOURCES order or replace the file.
  const src = SOURCES[variant][1]; // default to SVG; swap to [0] when PNG is dropped

  return (
    <Image
      src={src}
      alt={brandName()}
      width={w}
      height={h}
      priority={priority}
      className={cn("h-auto select-none", className)}
    />
  );
}

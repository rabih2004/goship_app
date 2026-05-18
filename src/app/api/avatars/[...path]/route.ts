import { NextResponse } from "next/server";

import { storage } from "@/lib/storage";

/**
 * Mock-mode proxy for avatar files. URL shape: /api/avatars/avatars/<userId>-<uuid>.png
 *
 * In s3 mode avatars are loaded directly via signed URLs (see avatars.ts ::
 * `avatarUrl`); this route isn't hit.
 *
 * Cached aggressively because avatars are immutable per upload (each upload
 * gets a fresh UUID, so the URL changes when the image changes).
 */
const EXT_TO_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export async function GET(
  _req: Request,
  context: { params: Promise<{ path: string[] }> }
): Promise<NextResponse> {
  const { path: segments } = await context.params;
  if (!segments || segments.length === 0) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const key = segments.map(decodeURIComponent).join("/");

  // Defence-in-depth: only allow keys under avatars/, never escape via ../.
  if (!key.startsWith("avatars/") || key.includes("..")) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const ext = key.split(".").pop()?.toLowerCase() ?? "";
  const contentType = EXT_TO_MIME[ext] ?? "application/octet-stream";

  try {
    const adapter = await storage();
    const body = await adapter.read(key);
    return new NextResponse(body as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
}

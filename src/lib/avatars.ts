/**
 * Avatar / company-logo upload helpers.
 *
 * Reuses the storage adapter from `@/lib/storage`:
 *   - mock: writes to .uploads/avatars/<key>; served back via /api/avatars/<key>
 *   - s3:   uploads to R2/S3; URL is a presigned GET valid for 5 minutes
 *
 * NB: presigned URLs expire — in s3 mode we re-sign on each page render. For
 * now we store the *key* and resolve to a URL at read time (see `avatarUrl()`).
 * Mock mode stores the public path directly since /api/avatars proxies forever.
 */
import { randomUUID } from "node:crypto";

import { storage, storageProvider } from "@/lib/storage";

export const MAX_AVATAR_BYTES = 2 * 1024 * 1024; // 2 MB
export const ALLOWED_AVATAR_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function extFromMime(mime: string): string {
  if (mime === "image/jpeg") return ".jpg";
  if (mime === "image/png") return ".png";
  if (mime === "image/webp") return ".webp";
  return ".bin";
}

/**
 * Put an avatar into storage and return the URL that should be persisted on
 * User.image / ForwarderProfile.logoUrl / etc.
 *
 * In mock mode the URL is `/api/avatars/<key>` (stable, no expiry).
 * In s3 mode we store the s3 key as a URL-fragment marker so the page can
 * resolve it via `avatarUrl()`.
 */
export async function uploadAvatar({
  userId,
  body,
  contentType,
}: {
  userId: string;
  body: Buffer;
  contentType: string;
}): Promise<string> {
  if (!ALLOWED_AVATAR_MIME.has(contentType)) {
    throw new Error("BAD_TYPE");
  }
  if (body.byteLength > MAX_AVATAR_BYTES) {
    throw new Error("TOO_LARGE");
  }

  const ext = extFromMime(contentType);
  const key = `avatars/${userId}-${randomUUID()}${ext}`;

  const adapter = await storage();
  await adapter.put({ key, body, contentType });

  // Mock: serve via our proxy route. Browsers can fetch indefinitely.
  // s3: persist the key itself prefixed with `s3:` so `avatarUrl()` knows to
  // resolve to a freshly-signed URL on read.
  return storageProvider() === "s3" ? `s3:${key}` : `/api/avatars/${encodeStorageKey(key)}`;
}

function encodeStorageKey(key: string): string {
  // Encode each path segment but keep slashes as-is so the route can split on them.
  return key.split("/").map(encodeURIComponent).join("/");
}

/**
 * Resolve a stored avatar marker back to a URL the browser can load.
 *
 * Resolution order for s3:<key> markers:
 *   1. S3_PUBLIC_URL is set → return `${S3_PUBLIC_URL}/<key>` (CDN / public bucket)
 *   2. Fallback → generate a presigned GET URL (expires in 5 min)
 *
 * Mock URLs (/api/avatars/…) are returned as-is.
 */
export async function avatarUrl(stored: string | null | undefined): Promise<string | null> {
  if (!stored) return null;
  if (!stored.startsWith("s3:")) return stored;
  const key = stored.slice(3); // e.g. "avatars/<userId>-<uuid>.png"

  const publicBase = process.env.S3_PUBLIC_URL?.replace(/\/$/, "");
  if (publicBase) return `${publicBase}/${key}`;

  const adapter = await storage();
  return adapter.getDownloadUrl(key);
}

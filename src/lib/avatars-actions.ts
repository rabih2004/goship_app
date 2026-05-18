"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import {
  ALLOWED_AVATAR_MIME,
  MAX_AVATAR_BYTES,
  uploadAvatar,
  avatarUrl,
} from "@/lib/avatars";

export type AvatarUploadState = {
  ok: boolean;
  url?: string;
  error?: "auth" | "tooLarge" | "badType" | "missing" | "unknown";
};

/**
 * Upload + persist an avatar / company logo.
 *
 * Where the URL goes depends on the user's role:
 *   - CUSTOMER / ADMIN → User.image
 *   - FORWARDER        → ForwarderProfile.logoUrl
 *   - COWORKER         → CoworkerProfile.logoUrl
 *   - CUSTOMS_AGENT    → CustomsAgentProfile.logoUrl
 *
 * The role-specific profile choice is intentional: a forwarder's "avatar"
 * is really their company logo, surfaced in the public directory + quote
 * cards, and we want it on the profile model so it travels with the
 * business identity rather than the user account.
 */
export async function uploadAvatarAction(
  _prev: AvatarUploadState | undefined,
  formData: FormData
): Promise<AvatarUploadState> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "auth" };

  const locale = (formData.get("locale") as string) || "en";
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "missing" };
  }
  if (file.size > MAX_AVATAR_BYTES) return { ok: false, error: "tooLarge" };
  if (!ALLOWED_AVATAR_MIME.has(file.type)) return { ok: false, error: "badType" };

  try {
    const body = Buffer.from(await file.arrayBuffer());
    const url = await uploadAvatar({
      userId: session.user.id,
      body,
      contentType: file.type,
    });

    const role = session.user.role;
    if (role === "FORWARDER") {
      await db.forwarderProfile.update({
        where: { userId: session.user.id },
        data: { logoUrl: url },
      });
    } else if (role === "COWORKER") {
      await db.coworkerProfile.update({
        where: { userId: session.user.id },
        data: { logoUrl: url },
      });
    } else if (role === "CUSTOMS_AGENT") {
      await db.customsAgentProfile.update({
        where: { userId: session.user.id },
        data: { logoUrl: url },
      });
    } else {
      // CUSTOMER + ADMIN — use User.image
      await db.user.update({
        where: { id: session.user.id },
        data: { image: url },
      });
    }

    // Bust the (authed) shell so the header avatar refreshes.
    for (const root of [
      "/customer",
      "/forwarder",
      "/coworker",
      "/customs",
      "/admin",
    ]) {
      revalidatePath(`/${locale}${root}`);
    }
    revalidatePath(`/${locale}/providers/forwarders`);
    revalidatePath(`/${locale}/providers/coworkers`);
    revalidatePath(`/${locale}/providers/customs`);

    // Resolve s3: key to a presigned URL so the browser can load it immediately.
    const displayUrl = await avatarUrl(url) ?? url;
    return { ok: true, url: displayUrl };
  } catch (err) {
    console.error("uploadAvatarAction failed:", err);
    const msg = (err as Error)?.message;
    if (msg === "TOO_LARGE") return { ok: false, error: "tooLarge" };
    if (msg === "BAD_TYPE") return { ok: false, error: "badType" };
    return { ok: false, error: "unknown" };
  }
}

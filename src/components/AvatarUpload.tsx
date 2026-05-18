"use client";

import { useActionState, useRef, useState } from "react";
import { useTranslations } from "next-intl";

import { Avatar } from "@/components/Avatar";
import { uploadAvatarAction, type AvatarUploadState } from "@/lib/avatars-actions";

const initial: AvatarUploadState = { ok: false };

type Role = "CUSTOMER" | "FORWARDER" | "COWORKER" | "CUSTOMS_AGENT" | "ADMIN";

/**
 * Avatar / company-logo upload widget. Shows current image (or initials),
 * a "change" CTA that opens the file picker, and inline error states.
 *
 * Calls `uploadAvatarAction` via useActionState — the server action persists
 * to the right field based on the user's role + revalidates dashboards so
 * the header avatar refreshes on next paint.
 */
export function AvatarUpload({
  name,
  currentImage,
  role,
  locale,
}: {
  name: string;
  currentImage?: string | null;
  role: Role;
  locale: "en" | "ar";
}) {
  const t = useTranslations("Avatar");
  const [state, action, pending] = useActionState(uploadAvatarAction, initial);
  const formRef = useRef<HTMLFormElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const displayedImage = previewUrl ?? state.url ?? currentImage ?? null;

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.currentTarget.files?.[0];
    if (!file) return;
    // Instant local preview
    const reader = new FileReader();
    reader.onload = () => setPreviewUrl(typeof reader.result === "string" ? reader.result : null);
    reader.readAsDataURL(file);
    // Submit
    formRef.current?.requestSubmit();
  }

  const err =
    state.error === "tooLarge"
      ? t("errTooLarge")
      : state.error === "badType"
        ? t("errBadType")
        : state.error === "missing"
          ? t("errMissing")
          : state.error
            ? t("errUnknown")
            : null;

  return (
    <form ref={formRef} action={action} className="flex items-center gap-4">
      <input type="hidden" name="locale" value={locale} />
      <input
        ref={fileRef}
        type="file"
        name="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={onFileChange}
        className="sr-only"
      />

      <Avatar name={name} image={displayedImage} size="xl" role={role} />

      <div className="flex flex-col gap-1">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={pending}
          className="inline-flex items-center justify-center rounded-md bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 border border-zinc-300 hover:bg-zinc-50 disabled:opacity-50"
        >
          {pending ? t("uploading") : currentImage ? t("replace") : t("upload")}
        </button>
        <p className="text-xs text-zinc-500">{t("hint")}</p>
        {err && <p className="text-xs text-red-600">{err}</p>}
      </div>
    </form>
  );
}

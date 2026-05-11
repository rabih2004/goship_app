"use server";

import { signOut } from "@/auth";

export async function signOutAction(formData: FormData) {
  const locale = (formData.get("locale") as string) || "en";
  await signOut({ redirectTo: `/${locale}` });
}

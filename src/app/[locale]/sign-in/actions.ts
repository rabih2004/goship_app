"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { signInInput } from "@/lib/validation";

export type SignInState = {
  ok: boolean;
  error?: "validation" | "invalidCredentials" | "unknown";
};

export async function signInAction(
  _prev: SignInState | undefined,
  formData: FormData
): Promise<SignInState> {
  const raw = Object.fromEntries(formData.entries());
  const callbackUrl = (formData.get("callbackUrl") as string) || undefined;
  const locale = (formData.get("locale") as string) || "en";

  const parsed = signInInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "validation" };

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: callbackUrl ?? `/${locale}/dashboard`,
    });
    return { ok: true };
  } catch (e) {
    if (e instanceof AuthError) {
      return { ok: false, error: "invalidCredentials" };
    }
    throw e;
  }
}

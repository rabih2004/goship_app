"use server";

import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";

import { signIn } from "@/auth";
import { db } from "@/lib/db";
import { signUpInput } from "@/lib/validation";

export type SignUpState = {
  ok: boolean;
  error?: "validation" | "emailTaken" | "unknown";
  fieldErrors?: Record<string, string>;
};

export async function signUpAction(
  _prev: SignUpState | undefined,
  formData: FormData
): Promise<SignUpState> {
  const raw = Object.fromEntries(formData.entries());

  const parsed = signUpInput.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".") || "_root";
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, error: "validation", fieldErrors };
  }

  const data = parsed.data;

  const existing = await db.user.findUnique({
    where: { email: data.email },
    select: { id: true },
  });
  if (existing) return { ok: false, error: "emailTaken" };

  const passwordHash = await bcrypt.hash(data.password, 12);

  await db.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: data.email,
        name: data.name,
        passwordHash,
        role: data.role,
        locale: data.locale,
      },
      select: { id: true },
    });

    if (data.role === "FORWARDER") {
      await tx.forwarderProfile.create({
        data: {
          userId: user.id,
          companyName: data.companyName,
          countryCode: data.countryCode,
        },
      });
    } else if (data.role === "COWORKER") {
      await tx.coworkerProfile.create({
        data: {
          userId: user.id,
          displayName: data.displayName,
          countryCode: data.countryCode,
          cityArea: data.cityArea,
        },
      });
    } else if (data.role === "CUSTOMS_AGENT") {
      await tx.customsAgentProfile.create({
        data: {
          userId: user.id,
          displayName: data.displayName,
          countryCode: data.countryCode,
          licenseNumber: data.licenseNumber || null,
        },
      });
    }
  });

  try {
    await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirectTo: `/${data.locale}/dashboard`,
    });
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, error: "unknown" };
    throw e;
  }

  return { ok: true };
}

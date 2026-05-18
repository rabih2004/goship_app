"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { db } from "@/lib/db";

type AllowedRole = "ADMIN" | "FORWARDER";

function checkRole(role: string): role is AllowedRole {
  return role === "ADMIN" || role === "FORWARDER";
}

const portSchema = z.object({
  unlocode: z
    .string()
    .trim()
    .toUpperCase()
    .min(3)
    .max(10)
    .regex(/^[A-Z]{2}[A-Z0-9]{2,8}$/, "Format: 2-letter country + location code (e.g. LBBEY, DEHAM)"),
  name: z.string().trim().min(1, "Name is required").max(120),
  country: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2}$/, "Use 2-letter ISO code (e.g. LB, DE)"),
  lat: z.preprocess(
    (v) => (v === "" || v === undefined ? null : Number(v)),
    z.number().min(-90).max(90).nullable()
  ),
  lng: z.preprocess(
    (v) => (v === "" || v === undefined ? null : Number(v)),
    z.number().min(-180).max(180).nullable()
  ),
  locale: z.enum(["en", "ar"]).default("en"),
});

export type PortActionState = {
  ok: boolean;
  error?: "auth" | "validation" | "duplicate" | "inUse" | "notFound" | "unknown";
  fieldErrors?: Record<string, string>;
};

export async function createPortAction(
  _prev: PortActionState | undefined,
  formData: FormData
): Promise<PortActionState> {
  const session = await auth();
  if (!session?.user || !checkRole(session.user.role)) {
    return { ok: false, error: "auth" };
  }

  const parsed = portSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".") || "_root";
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, error: "validation", fieldErrors };
  }

  const d = parsed.data;

  try {
    await db.port.create({
      data: {
        unlocode: d.unlocode,
        name: d.name,
        country: d.country,
        lat: d.lat,
        lng: d.lng,
      },
    });
  } catch (e: unknown) {
    if ((e as { code?: string }).code === "P2002") {
      return { ok: false, error: "duplicate", fieldErrors: { unlocode: "A port with this UN/LOCODE already exists." } };
    }
    console.error("createPortAction failed:", e);
    return { ok: false, error: "unknown" };
  }

  revalidatePath(`/${d.locale}/admin/ports`);
  revalidatePath(`/${d.locale}/forwarder/ports`);
  return { ok: true };
}

export async function updatePortAction(
  _prev: PortActionState | undefined,
  formData: FormData
): Promise<PortActionState> {
  const session = await auth();
  if (!session?.user || !checkRole(session.user.role)) {
    return { ok: false, error: "auth" };
  }

  const parsed = portSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".") || "_root";
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, error: "validation", fieldErrors };
  }

  const d = parsed.data;

  try {
    await db.port.update({
      where: { unlocode: d.unlocode },
      data: { name: d.name, country: d.country, lat: d.lat, lng: d.lng },
    });
  } catch (e: unknown) {
    if ((e as { code?: string }).code === "P2025") {
      return { ok: false, error: "notFound" };
    }
    console.error("updatePortAction failed:", e);
    return { ok: false, error: "unknown" };
  }

  revalidatePath(`/${d.locale}/admin/ports`);
  revalidatePath(`/${d.locale}/forwarder/ports`);
  return { ok: true };
}

export async function deletePortAction(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user || !checkRole(session.user.role)) return;

  const unlocode = ((formData.get("unlocode") as string) ?? "").trim().toUpperCase();
  const locale = (formData.get("locale") as string) || "en";
  const backHref = (formData.get("backHref") as string) || `/${locale}/admin/ports`;

  if (!unlocode) return;

  const [laneCount, shipmentCount] = await Promise.all([
    db.lane.count({ where: { OR: [{ originPortUnlocode: unlocode }, { destinationPortUnlocode: unlocode }] } }),
    db.shipment.count({ where: { OR: [{ originPortUnlocode: unlocode }, { destinationPortUnlocode: unlocode }] } }),
  ]);

  if (laneCount + shipmentCount > 0) return;

  try {
    await db.port.delete({ where: { unlocode } });
  } catch {
    return;
  }

  revalidatePath(`/${locale}/admin/ports`);
  revalidatePath(`/${locale}/forwarder/ports`);
  redirect(backHref);
}

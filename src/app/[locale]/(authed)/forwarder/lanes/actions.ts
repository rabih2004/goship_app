"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { db } from "@/lib/db";

const addInput = z
  .object({
    originPortUnlocode: z.string().regex(/^[A-Z]{5,10}$/),
    destinationPortUnlocode: z.string().regex(/^[A-Z]{5,10}$/),
    transitDays: z.coerce.number().int().min(1).max(180),
  })
  .refine((d) => d.originPortUnlocode !== d.destinationPortUnlocode, {
    message: "Origin and destination must differ",
    path: ["destinationPortUnlocode"],
  });

export type LaneState = {
  ok: boolean;
  error?: "auth" | "validation" | "duplicate" | "unknownPort" | "unknown";
  fieldErrors?: Record<string, string>;
};

export async function addLaneAction(
  _prev: LaneState | undefined,
  formData: FormData
): Promise<LaneState> {
  const session = await auth();
  if (!session?.user || session.user.role !== "FORWARDER") {
    return { ok: false, error: "auth" };
  }

  const parsed = addInput.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".") || "_root";
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, error: "validation", fieldErrors };
  }

  const { originPortUnlocode, destinationPortUnlocode, transitDays } = parsed.data;

  const portsExist = await db.port.count({
    where: { unlocode: { in: [originPortUnlocode, destinationPortUnlocode] } },
  });
  if (portsExist !== 2) return { ok: false, error: "unknownPort" };

  try {
    await db.lane.create({
      data: {
        forwarderId: session.user.id,
        originPortUnlocode,
        destinationPortUnlocode,
        transitDays,
      },
    });
  } catch (e) {
    if (
      typeof e === "object" &&
      e !== null &&
      "code" in e &&
      (e as { code?: string }).code === "P2002"
    ) {
      return { ok: false, error: "duplicate" };
    }
    return { ok: false, error: "unknown" };
  }

  revalidatePath(`/${session.user.locale}/forwarder/lanes`);
  return { ok: true };
}

export async function toggleLaneAction(formData: FormData) {
  const session = await auth();
  if (!session?.user || session.user.role !== "FORWARDER") return;

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const lane = await db.lane.findUnique({
    where: { id },
    select: { forwarderId: true, active: true },
  });
  if (!lane || lane.forwarderId !== session.user.id) return;

  await db.lane.update({
    where: { id },
    data: { active: !lane.active },
  });

  revalidatePath(`/${session.user.locale}/forwarder/lanes`);
}

export async function deleteLaneAction(formData: FormData) {
  const session = await auth();
  if (!session?.user || session.user.role !== "FORWARDER") return;

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const lane = await db.lane.findUnique({
    where: { id },
    select: { forwarderId: true },
  });
  if (!lane || lane.forwarderId !== session.user.id) return;

  await db.lane.delete({ where: { id } });
  revalidatePath(`/${session.user.locale}/forwarder/lanes`);
}

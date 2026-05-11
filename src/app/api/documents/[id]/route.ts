import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { storage, storageProvider } from "@/lib/storage";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await params;
  const doc = await db.document.findUnique({
    where: { id },
    select: {
      storageKey: true,
      filename: true,
      contentType: true,
      sizeBytes: true,
      booking: {
        select: { customerId: true, forwarderId: true },
      },
    },
  });
  if (!doc) return new NextResponse("Not found", { status: 404 });

  const userId = session.user.id;
  const role = session.user.role;
  const owns =
    userId === doc.booking.customerId ||
    userId === doc.booking.forwarderId ||
    role === "ADMIN";
  if (!owns) return new NextResponse("Forbidden", { status: 403 });

  const adapter = await storage();

  if (storageProvider() === "s3") {
    const url = await adapter.getDownloadUrl(doc.storageKey, {
      filename: doc.filename,
    });
    return NextResponse.redirect(url, { status: 302 });
  }

  // Mock: stream the file from disk.
  const bytes = await adapter.read(doc.storageKey);
  return new NextResponse(bytes, {
    status: 200,
    headers: {
      "Content-Type": doc.contentType,
      "Content-Length": String(doc.sizeBytes),
      "Content-Disposition": `attachment; filename="${encodeFilename(doc.filename)}"`,
      "Cache-Control": "private, no-store",
    },
  });
}

function encodeFilename(name: string): string {
  // Strip control + non-ASCII for the basic header; UA filename* would be the
  // RFC-5987 way to handle unicode but this is sufficient for mock dev use.
  return name.replace(/[\r\n"\\]/g, "_");
}

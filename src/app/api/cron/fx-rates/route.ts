import { NextResponse } from "next/server";

import { fetchAndPersistFxRates } from "@/lib/fx-fetch";

/**
 * Daily cron target. Configure in `vercel.json`:
 *   { "crons": [{ "path": "/api/cron/fx-rates", "schedule": "0 6 * * *" }] }
 *
 * Vercel signs cron requests with a header so we know it's legitimate.
 * Locally / non-Vercel: hit with `?key=$CRON_SECRET` matching env.
 */
export async function GET(req: Request) {
  const headerSecret = req.headers.get("authorization");
  const url = new URL(req.url);
  const querySecret = url.searchParams.get("key");
  const expected = process.env.CRON_SECRET;

  // Allow Vercel cron's bearer header OR our shared-secret query param.
  const fromVercel = headerSecret === `Bearer ${expected}`;
  const fromManual = expected && querySecret === expected;
  if (!fromVercel && !fromManual) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const result = await fetchAndPersistFxRates();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("fx-rates cron failed:", err);
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}

import { setRequestLocale, getTranslations } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";

import { requireRole } from "@/lib/guards";
import { db } from "@/lib/db";
import { Link } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";
import { Button } from "@/components/ui/Button";
import { isMock } from "@/lib/payments";

import {
  startCoworkerOnboardingAction,
  refreshCoworkerAccountStatusAction,
  mockResetCoworkerOnboardingAction,
} from "./actions";

export default async function CoworkerOnboardingPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ return?: string }>;
}) {
  const { locale: rawLocale } = await params;
  if (!hasLocale(routing.locales, rawLocale)) notFound();
  const locale = rawLocale as AppLocale;

  setRequestLocale(locale);
  const user = await requireRole("COWORKER", locale);
  const t = await getTranslations({ locale, namespace: "Onboarding" });

  const sp = await searchParams;
  const returnedFromProvider = sp.return === "1";
  const mockMode = isMock();

  const profile = await db.coworkerProfile.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      displayName: user.email.split("@")[0],
      countryCode: "US",
      cityArea: "",
    },
    select: {
      stripeAccountId: true,
      onboardingComplete: true,
      displayName: true,
      countryCode: true,
    },
  });

  const stage = mockMode
    ? profile.onboardingComplete
      ? "complete"
      : "not-started"
    : !profile.stripeAccountId
      ? "not-started"
      : profile.onboardingComplete
        ? "complete"
        : "in-progress";

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-12">
      <div className="mb-6">
        <Link href="/coworker" className="text-sm text-[var(--brand)] underline">
          <span className="dir-back" /> {t("backToDashboard")}
        </Link>
      </div>

      <h1 className="mb-2 text-2xl font-semibold text-zinc-900">{t("title")}</h1>
      <p className="mb-4 text-sm text-zinc-600">
        {mockMode ? t("introMock") : t("intro")}
      </p>

      {mockMode && (
        <div className="mb-6 rounded-md border border-sky-200 bg-sky-50 p-3 text-xs text-sky-800">
          {t("mockBadge")}
        </div>
      )}

      <div className="rounded-lg border border-zinc-200 bg-white p-6">
        <div className="mb-4 flex items-center gap-3">
          <StatusDot stage={stage} />
          <div>
            <div className="font-medium text-zinc-900">
              {t(`stage.${stage}.title`)}
            </div>
            <div className="text-sm text-zinc-500">
              {t(`stage.${stage}.body`)}
            </div>
          </div>
        </div>

        {profile.stripeAccountId && (
          <div className="mb-4 rounded bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
            {t("stripeAccountId")}: <code>{profile.stripeAccountId}</code>
          </div>
        )}

        {!mockMode && returnedFromProvider && stage !== "complete" && (
          <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            {t("returnedNotComplete")}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          {stage !== "complete" && (
            <form action={startCoworkerOnboardingAction}>
              <input type="hidden" name="locale" value={locale} />
              <Button type="submit">
                {mockMode
                  ? t("mockMarkReadyBtn")
                  : stage === "not-started"
                    ? t("startBtn")
                    : t("resumeBtn")}
              </Button>
            </form>
          )}

          {!mockMode && profile.stripeAccountId && (
            <form action={refreshCoworkerAccountStatusAction}>
              <input type="hidden" name="locale" value={locale} />
              <Button type="submit" variant="secondary">
                {t("refreshBtn")}
              </Button>
            </form>
          )}

          {mockMode && stage === "complete" && (
            <form action={mockResetCoworkerOnboardingAction}>
              <input type="hidden" name="locale" value={locale} />
              <Button type="submit" variant="secondary">
                {t("mockResetBtn")}
              </Button>
            </form>
          )}
        </div>
      </div>

      <p className="mt-6 text-xs text-zinc-500">{t("compliance")}</p>
    </div>
  );
}

function StatusDot({
  stage,
}: {
  stage: "not-started" | "in-progress" | "complete";
}) {
  const cls =
    stage === "complete"
      ? "bg-emerald-500"
      : stage === "in-progress"
        ? "bg-amber-500"
        : "bg-zinc-400";
  return <span className={`inline-block h-3 w-3 rounded-full ${cls}`} />;
}

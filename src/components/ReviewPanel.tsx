import { getTranslations } from "next-intl/server";

import { RatingStars } from "./RatingStars";
import { ReviewForm } from "./ReviewForm";
import { averageScore } from "@/lib/reviews";

type Role = "CUSTOMER" | "FORWARDER" | "COWORKER" | "CUSTOMS_AGENT" | "ADMIN";

type Party = {
  userId: string;
  role: Exclude<Role, "ADMIN">;
  name: string;
};

type Review = {
  id: string;
  raterUserId: string;
  ratedUserId: string;
  score: number;
  comment: string | null;
  createdAt: Date;
};

/**
 * Renders the booking-level reviews block.
 *
 * Visibility rules:
 *   - If the booking has not reached DELIVERED yet, show a hint and exit.
 *   - For each counterparty != currentUser, show one of:
 *       (a) the existing review the user already left, or
 *       (b) the ReviewForm to submit one.
 *   - Show all reviews received by the current user from others on this booking.
 *
 * The parent page passes a fully-resolved list of parties (only those who
 * actually exist for the booking — e.g. coworker is absent on FOB).
 */
export async function ReviewPanel({
  bookingId,
  currentUserId,
  parties,
  delivered,
  reviews,
  locale,
}: {
  bookingId: string;
  currentUserId: string;
  parties: Party[];
  delivered: boolean;
  reviews: Review[];
  locale: "en" | "ar";
}) {
  const t = await getTranslations({ locale, namespace: "Reviews" });

  if (!delivered) {
    return (
      <section className="mt-10">
        <h2 className="mb-3 text-base font-medium text-zinc-900">
          {t("sectionTitle")}
        </h2>
        <p className="rounded-md border border-dashed border-zinc-300 p-4 text-sm text-zinc-500">
          {t("openWhenDelivered")}
        </p>
      </section>
    );
  }

  const counterparties = parties.filter((p) => p.userId !== currentUserId);
  const reviewsAuthored = new Map(
    reviews
      .filter((r) => r.raterUserId === currentUserId)
      .map((r) => [r.ratedUserId, r])
  );
  const reviewsReceived = reviews.filter((r) => r.ratedUserId === currentUserId);

  return (
    <section className="mt-10">
      <h2 className="mb-3 text-base font-medium text-zinc-900">
        {t("sectionTitle")}
      </h2>

      <div className="space-y-4">
        {counterparties.map((p) => {
          const existing = reviewsAuthored.get(p.userId);
          return (
            <div
              key={p.userId}
              className="rounded-lg border border-zinc-200 bg-white p-5"
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <div className="font-medium text-zinc-900">{p.name}</div>
                  <div className="text-xs uppercase tracking-wide text-zinc-500">
                    {t(`role.${p.role}`)}
                  </div>
                </div>
                {existing && (
                  <RatingStars avg={existing.score} count={1} showLabel={false} />
                )}
              </div>

              {existing ? (
                <div className="rounded bg-zinc-50 p-3 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-zinc-700">
                      {t("youRated")}:
                    </span>
                    <RatingStars
                      avg={existing.score}
                      count={1}
                      showLabel={false}
                    />
                    <span className="text-xs text-zinc-500">
                      · {existing.createdAt.toISOString().slice(0, 10)}
                    </span>
                  </div>
                  {existing.comment && (
                    <p className="mt-1 text-zinc-700">{existing.comment}</p>
                  )}
                </div>
              ) : (
                <ReviewForm
                  bookingId={bookingId}
                  ratedUserId={p.userId}
                  ratedRole={p.role}
                  ratedName={p.name}
                  locale={locale}
                />
              )}
            </div>
          );
        })}
      </div>

      {reviewsReceived.length > 0 && (
        <div className="mt-8">
          <h3 className="mb-3 text-sm font-medium text-zinc-900">
            {t("receivedTitle")}
          </h3>
          <RatingStars
            avg={averageScore(reviewsReceived)}
            count={reviewsReceived.length}
          />
          <ul className="mt-3 space-y-2">
            {reviewsReceived.map((r) => (
              <li
                key={r.id}
                className="rounded-md border border-zinc-200 bg-white p-3 text-sm"
              >
                <div className="flex items-center gap-2">
                  <RatingStars avg={r.score} count={1} showLabel={false} />
                  <span className="text-xs text-zinc-500">
                    · {r.createdAt.toISOString().slice(0, 10)}
                  </span>
                </div>
                {r.comment && (
                  <p className="mt-1 text-zinc-700">{r.comment}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

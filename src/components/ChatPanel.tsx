import { getTranslations } from "next-intl/server";

import { db } from "@/lib/db";
import { ChatComposer } from "@/components/ChatComposer";
import { MarkAsReadOnMount } from "@/components/MarkAsReadOnMount";

export async function ChatPanel({
  bookingId,
  currentUserId,
  locale,
}: {
  bookingId: string;
  currentUserId: string;
  locale: "en" | "ar";
}) {
  const t = await getTranslations({ locale, namespace: "Chat" });

  const conversation = await db.conversation.findUnique({
    where: { bookingId },
    select: {
      id: true,
      messages: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          body: true,
          createdAt: true,
          senderId: true,
          sender: {
            select: {
              name: true,
              email: true,
              role: true,
            },
          },
        },
      },
    },
  });

  const messages = conversation?.messages ?? [];

  return (
    <section className="mt-10">
      <h2 className="mb-3 text-base font-medium text-zinc-900">{t("title")}</h2>
      <p className="mb-3 text-xs text-zinc-500">{t("intro")}</p>

      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
        {messages.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-zinc-500">
            {t("empty")}
          </p>
        ) : (
          <ul className="max-h-96 space-y-3 overflow-y-auto px-5 py-4">
            {messages.map((m) => {
              const mine = m.senderId === currentUserId;
              const who =
                m.sender.name?.trim() || m.sender.email.split("@")[0];
              return (
                <li
                  key={m.id}
                  className={mine ? "flex justify-end" : "flex justify-start"}
                >
                  <div
                    className={
                      "max-w-[80%] rounded-2xl px-3 py-2 text-sm " +
                      (mine
                        ? "bg-[var(--brand)] text-[var(--brand-fg)]"
                        : "bg-zinc-100 text-zinc-900")
                    }
                  >
                    {!mine && (
                      <div className="mb-0.5 text-xs font-medium opacity-80">
                        {who}
                        <span className="ml-2 rounded bg-white/40 px-1 py-px text-[10px] uppercase tracking-wide">
                          {t(`role.${m.sender.role}`)}
                        </span>
                      </div>
                    )}
                    <div className="whitespace-pre-wrap break-words">
                      {m.body}
                    </div>
                    <div
                      className={
                        "mt-1 text-[10px] " +
                        (mine ? "text-white/80" : "text-zinc-500")
                      }
                    >
                      {m.createdAt
                        .toISOString()
                        .slice(0, 16)
                        .replace("T", " ")}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <ChatComposer bookingId={bookingId} locale={locale} />
      </div>

      <MarkAsReadOnMount bookingId={bookingId} locale={locale} />
    </section>
  );
}

import { getTotalUnread } from "@/lib/chat";

export async function UnreadBadge({ userId }: { userId: string }) {
  const count = await getTotalUnread(userId);
  if (count === 0) return null;
  return (
    <span
      title={`${count} unread`}
      className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-rose-600 px-1.5 py-0.5 text-[10px] font-semibold text-white"
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

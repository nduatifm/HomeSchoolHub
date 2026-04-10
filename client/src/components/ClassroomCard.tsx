import { ChevronRight } from "lucide-react";
import { getSubjectTheme } from "@/lib/subjectTheme";
import type { Classroom } from "@shared/schema";
import type { ClassroomNotification } from "@/lib/classroomNotifications";

type Props = {
  classroom: Classroom;
  href: string;
  ctaLabel?: string;
  notification?: ClassroomNotification | null;
};

export default function ClassroomCard({ classroom: c, href, ctaLabel = "Go to Class", notification }: Props) {
  const theme = getSubjectTheme(c.subject || "");

  const pendingCount = notification?.pendingCount ?? 0;
  const dueCount = notification?.dueCount ?? 0;
  const dueSoonCount = notification?.dueSoonCount ?? 0;
  const newCount = notification?.newCount ?? 0;

  const showBadge = pendingCount > 0;
  const badgeIsRed = dueCount > 0;
  const badgeIsAmber = !badgeIsRed && dueSoonCount > 0;
  const badgeIsGreen = !badgeIsRed && !badgeIsAmber && newCount > 0;

  const badgeBg = badgeIsRed
    ? "bg-red-500"
    : badgeIsAmber
      ? "bg-amber-500"
      : badgeIsGreen
        ? "bg-green-500"
        : "bg-primary";

  const badgeLabel = pendingCount > 9 ? "9+" : String(pendingCount);

  return (
    <button
      className={`relative text-left rounded-2xl border border-border overflow-hidden flex flex-col cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 active:scale-[0.985] ${theme.bg} group w-full`}
      onClick={() => { window.location.href = href; }}
    >
      {showBadge && (
        <span
          className={`absolute top-2.5 right-2.5 z-10 min-w-[22px] h-[22px] px-1.5 rounded-full text-[11px] font-bold text-white flex items-center justify-center shadow-sm ${badgeBg}`}
        >
          {badgeLabel}
        </span>
      )}
      <div className="w-full h-24 shrink-0 overflow-hidden">
        {theme.banner}
      </div>
      <div className="px-4 py-3 flex flex-col gap-1 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-bold text-sm text-foreground leading-snug">{c.name}</h3>
          {c.status === "archived" && (
            <span className="text-[10px] bg-white/70 text-muted-foreground px-1.5 py-0.5 rounded shrink-0 border border-border">Archived</span>
          )}
        </div>
        <span className={`text-xs font-semibold ${theme.pillText}`}>{c.subject}</span>
        {c.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{c.description}</p>
        )}
        <div className="mt-auto pt-3 flex items-center justify-between">
          <span className="text-xs font-semibold text-primary group-hover:underline">{ctaLabel}</span>
          <ChevronRight className="h-3.5 w-3.5 text-primary opacity-60 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
    </button>
  );
}

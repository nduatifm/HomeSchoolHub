import { ChevronRight } from "lucide-react";
import { getSubjectTheme } from "@/lib/subjectTheme";
import type { Classroom } from "@shared/schema";

type Props = {
  classroom: Classroom;
  href: string;
  ctaLabel?: string;
};

export default function ClassroomCard({ classroom: c, href, ctaLabel = "Go to Class" }: Props) {
  const theme = getSubjectTheme(c.subject || "");
  return (
    <button
      className={`text-left rounded-2xl border border-border overflow-hidden flex flex-col cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 active:scale-[0.985] ${theme.bg} group w-full`}
      onClick={() => { window.location.href = href; }}
    >
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

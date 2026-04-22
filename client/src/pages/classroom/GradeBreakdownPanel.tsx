import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Info } from "lucide-react";
import type { GradeBreakdown } from "@shared/schema";

const TYPE_META: Record<string, { color: string; bar: string; text: string }> = {
  assignment: { color: "bg-blue-100 text-blue-700", bar: "bg-blue-500", text: "text-blue-700" },
  test:       { color: "bg-orange-100 text-orange-700", bar: "bg-orange-500", text: "text-orange-700" },
  quiz:       { color: "bg-purple-100 text-purple-700", bar: "bg-purple-500", text: "text-purple-700" },
  project:    { color: "bg-teal-100 text-teal-700", bar: "bg-teal-500", text: "text-teal-700" },
};

export default function GradeBreakdownPanel({
  classroomId,
  studentId,
}: {
  classroomId: number;
  studentId: number;
}) {
  const { data: breakdown, isLoading } = useQuery<GradeBreakdown>({
    queryKey: ["/api/classrooms", classroomId, "grade-breakdown", studentId],
    queryFn: () => apiRequest(`/api/classrooms/${classroomId}/grade-breakdown/${studentId}`),
    enabled: classroomId > 0 && studentId > 0,
  });

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-4 flex items-center justify-center min-h-[72px]">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!breakdown) return null;

  const { breakdown: items } = breakdown;
  const hasAnyGraded = items.some((b) => b.status === "graded");
  // zero-weight items that have graded work must still be shown (not an empty state)
  const hasAnyZeroWeightGraded = items.some((b) => b.status === "zero-weight" && b.average !== null);

  if (!hasAnyGraded && !hasAnyZeroWeightGraded) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-muted/30 px-5 py-4 space-y-0.5 text-center">
        <p className="text-sm font-medium text-muted-foreground">No items have been graded yet.</p>
        <p className="text-xs text-muted-foreground">Grades will appear here once your teacher reviews submitted work.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
      {/* Overall */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-foreground">Overall Grade</span>
        {breakdown.overall !== null ? (
          <span className={`text-lg font-bold ${breakdown.overall >= 70 ? "text-green-600" : breakdown.overall >= 50 ? "text-amber-600" : "text-red-600"}`}>
            {breakdown.overall}%
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        )}
      </div>

      {/* Overall progress bar */}
      {breakdown.overall !== null && (
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${breakdown.overall >= 70 ? "bg-green-500" : breakdown.overall >= 50 ? "bg-amber-500" : "bg-red-500"}`}
            style={{ width: `${breakdown.overall}%` }}
          />
        </div>
      )}

      {/* Per-type breakdown — all 4 types always shown */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
        {items.map((item) => {
          const meta = TYPE_META[item.type] ?? TYPE_META.assignment;
          return (
            <div key={item.type} className="flex items-center gap-2">
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${meta.color}`}>
                {item.label}
              </span>

              {item.status === "pending" && (
                <span className="text-xs font-medium text-amber-600">
                  Pending
                  {item.configuredWeight > 0 && (
                    <span className="ml-1 font-normal text-muted-foreground">({item.configuredWeight}%)</span>
                  )}
                </span>
              )}

              {item.status === "zero-weight" && (
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  {item.average !== null ? (
                    <>
                      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className={`h-full rounded-full opacity-40 ${meta.bar}`} style={{ width: `${item.average}%` }} />
                      </div>
                      <span className="text-xs text-muted-foreground tabular-nums shrink-0">{item.average}%</span>
                    </>
                  ) : null}
                  <span className="text-[10px] text-muted-foreground/70 shrink-0 italic">Not counted</span>
                </div>
              )}

              {item.status === "graded" && item.average !== null && (
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className={`h-full rounded-full ${meta.bar}`} style={{ width: `${item.average}%` }} />
                  </div>
                  <span className={`text-xs font-semibold tabular-nums shrink-0 ${meta.text}`}>{item.average}%</span>
                  <span
                    className="text-[10px] text-muted-foreground shrink-0"
                    title={`Configured: ${item.configuredWeight}%`}
                  >
                    ({item.effectiveWeight}% of grade)
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Partial-grade notice */}
      {breakdown.isPartial && breakdown.pendingTypes.length > 0 && (
        <div className="flex items-start gap-1.5 pt-0.5">
          <Info className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-600">
            Based on graded items only — {breakdown.pendingTypes.join(", ")} pending.
          </p>
        </div>
      )}
    </div>
  );
}

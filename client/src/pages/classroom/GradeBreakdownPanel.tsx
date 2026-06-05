import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";
import type { GradeBreakdown } from "@shared/schema";

const TYPE_DOT: Record<string, string> = {
  assignment: "bg-blue-500",
  test:       "bg-orange-500",
  quiz:       "bg-purple-500",
  project:    "bg-teal-500",
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
  const hasAnyZeroWeightGraded = items.some((b) => b.status === "zero-weight" && b.average !== null);

  if (!hasAnyGraded && !hasAnyZeroWeightGraded) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-muted/30 px-5 py-4 space-y-0.5 text-center">
        <p className="text-sm font-medium text-muted-foreground">No items have been graded yet.</p>
        <p className="text-xs text-muted-foreground">Grades will appear here once your teacher reviews submitted work.</p>
      </div>
    );
  }

  const overallColor =
    breakdown.overall === null ? "" :
    breakdown.overall >= 70 ? "text-green-600" :
    breakdown.overall >= 50 ? "text-amber-600" : "text-red-600";

  const overallBarColor =
    breakdown.overall === null ? "" :
    breakdown.overall >= 70 ? "bg-green-500" :
    breakdown.overall >= 50 ? "bg-amber-500" : "bg-red-500";

  return (
    <div className="rounded-2xl border border-border bg-card px-4 py-3 space-y-3">
      {/* Overall grade — visual centrepiece */}
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-semibold text-foreground">Overall Grade</span>
        {breakdown.overall !== null ? (
          <span className={`text-3xl font-bold tabular-nums ${overallColor}`}>
            {breakdown.overall}%
          </span>
        ) : (
          <span className="text-xl text-muted-foreground">—</span>
        )}
      </div>

      {breakdown.overall !== null && (
        <div className="h-2.5 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${overallBarColor}`}
            style={{ width: `${breakdown.overall}%` }}
          />
        </div>
      )}

      {/* Per-type rows */}
      <div className="divide-y divide-border/50">
        {items.map((item) => {
          const dot = TYPE_DOT[item.type] ?? TYPE_DOT.assignment;
          const isPending = item.status === "pending";
          const isZeroWeight = item.status === "zero-weight";

          return (
            <div key={item.type} className="flex items-center justify-between py-1.5 first:pt-0.5 last:pb-0">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full shrink-0 ${isPending || (isZeroWeight && item.average === null) ? "bg-muted-foreground/30" : dot}`} />
                <span className={`text-sm ${isPending ? "text-muted-foreground" : "text-foreground"}`}>
                  {item.label}
                </span>
              </div>

              {isPending && (
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  Pending
                </span>
              )}

              {isZeroWeight && item.average !== null && (
                <span className="text-sm font-semibold tabular-nums text-muted-foreground">
                  {item.average}%
                </span>
              )}

              {item.status === "graded" && item.average !== null && (
                <span className="text-sm font-semibold tabular-nums text-foreground">
                  {item.average}%
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Partial-grade notice */}
      {breakdown.isPartial && breakdown.pendingTypes.length > 0 && (
        <p className="text-xs text-muted-foreground pt-0.5">
          Some categories are still pending.
        </p>
      )}
    </div>
  );
}

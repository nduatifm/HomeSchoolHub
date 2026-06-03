import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, AlertCircle } from "lucide-react";
import type { ClassroomAssignment, ClassroomSubmission } from "@shared/schema";
import StatusBadge from "./StatusBadge";

function isOverdue(dueDate: string): boolean {
  if (!dueDate) return false;
  const due = new Date(dueDate);
  due.setHours(23, 59, 59, 999);
  return due < new Date();
}

export default function StudentAssignmentsTab({ classroomId, classroomSlug }: {
  classroomId: number; classroomSlug: string | number; studentId: number; isArchived: boolean;
}) {
  const [, navigate] = useLocation();

  const { data: assignments = [], isLoading: loadingA } = useQuery<ClassroomAssignment[]>({
    queryKey: ["/api/classrooms", classroomId, "assignments"],
    queryFn: () => apiRequest(`/api/classrooms/${classroomId}/assignments`),
  });
  const { data: mySubmissions = [], isLoading: loadingS } = useQuery<ClassroomSubmission[]>({
    queryKey: ["/api/classrooms", classroomId, "my-submissions"],
    queryFn: () => apiRequest(`/api/classrooms/${classroomId}/my-submissions`),
  });

  const subMap = Object.fromEntries(mySubmissions.map((s) => [s.assignmentId, s]));

  if (loadingA || loadingS) {
    return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  if (assignments.length === 0) {
    return <div className="text-center py-12 text-muted-foreground text-sm">Nothing here yet.</div>;
  }

  return (
    <div className="space-y-2">
      {assignments.map((a) => {
        const sub = subMap[a.id];
        const baseStatus = sub?.status ?? "not-submitted";
        const overdue = isOverdue(a.dueDate);
        const needsAttention =
          (baseStatus === "not-submitted" || baseStatus === "pending") && overdue;
        const effectiveStatus = needsAttention ? "late" : baseStatus;
        const detailUrl = `/classrooms/${classroomSlug}/classwork/${a.slug ?? a.id}`;

        return (
          <button
            key={a.id}
            type="button"
            className={`w-full text-left rounded-2xl border px-4 py-3.5 flex items-center gap-3 hover:bg-muted/30 transition-colors ${
              needsAttention
                ? "border-amber-300 bg-amber-50/60"
                : "border-border bg-card"
            }`}
            onClick={() => navigate(detailUrl)}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium text-sm text-foreground leading-snug">{a.title}</p>
                {needsAttention && (
                  <AlertCircle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                )}
              </div>
              <p className={`text-xs mt-0.5 ${needsAttention ? "text-amber-600 font-medium" : "text-muted-foreground"}`}>
                {needsAttention ? `Was due ${a.dueDate} — not submitted` : `Due ${a.dueDate}`}
              </p>
            </div>
            <StatusBadge status={effectiveStatus} grade={sub?.grade} points={a.points} />
          </button>
        );
      })}
    </div>
  );
}

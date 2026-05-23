import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";
import type { ClassroomAssignment, ClassroomSubmission } from "@shared/schema";
import StatusBadge from "./StatusBadge";

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
        const detailUrl = `/classrooms/${classroomSlug}/classwork/${a.slug ?? a.id}`;
        return (
          <button
            key={a.id}
            type="button"
            className="w-full text-left rounded-2xl border border-border bg-card px-4 py-3.5 flex items-center gap-3 hover:bg-muted/30 transition-colors"
            onClick={() => navigate(detailUrl)}
          >
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-foreground leading-snug">{a.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Due {a.dueDate}</p>
            </div>
            <StatusBadge status={sub?.status ?? "not-submitted"} />
          </button>
        );
      })}
    </div>
  );
}

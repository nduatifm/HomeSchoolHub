import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useQueries, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import ConfirmDialog from "@/components/ConfirmDialog";
import {
  Loader2,
  Plus,
  Trash2,
  Pencil,
} from "lucide-react";
import type { ClassroomAssignment } from "@shared/schema";
import type { SubmissionWithName } from "./types";

export default function TeacherAssignmentsTab({
  classroomId,
  classroomSlug,
  isArchived,
}: {
  classroomId: number;
  classroomSlug: string | number;
  isArchived: boolean;
}) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [, navigate] = useLocation();

  const { data: assignments = [], isLoading } = useQuery<ClassroomAssignment[]>({
    queryKey: ["/api/classrooms", classroomId, "assignments"],
    queryFn: () => apiRequest(`/api/classrooms/${classroomId}/assignments`),
  });

  const allSubResults = useQueries({
    queries: assignments.map((a) => ({
      queryKey: ["/api/classrooms", classroomId, "assignments", a.id, "submissions"],
      queryFn: () =>
        apiRequest(
          `/api/classrooms/${classroomId}/assignments/${a.id}/submissions`
        ) as Promise<SubmissionWithName[]>,
      enabled: assignments.length > 0,
      refetchInterval: 30000,
    })),
  });

  // Build per-assignment stats: submitted (any non-pending) + graded counts
  const statsMap: Record<number, { submitted: number; graded: number; toGrade: number }> = {};
  allSubResults.forEach((q, i) => {
    const id = assignments[i]?.id;
    if (!id) return;
    const subs = q.data ?? [];
    const graded = subs.filter((s) => s.status === "graded").length;
    const submitted = subs.filter((s) => s.status !== "pending").length;
    const toGrade = subs.filter((s) => s.status === "submitted" || s.status === "late").length;
    statsMap[id] = { submitted, graded, toGrade };
  });

  const deleteMutation = useMutation({
    mutationFn: (assignmentId: number) =>
      apiRequest(`/api/classrooms/${classroomId}/assignments/${assignmentId}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/classrooms", classroomId, "assignments"],
      });
      toast({ title: "Assignment deleted", type: "success" });
    },
    onError: () => toast({ title: "Couldn't delete — try again.", type: "error" }),
  });

  return (
    <div className="space-y-4">
      {!isArchived && (
        <div className="flex justify-end">
          <Button
            size="sm"
            className="gap-1.5"
            onClick={() => navigate(`/classrooms/${classroomSlug}/assignments/new`)}
          >
            <Plus className="h-3.5 w-3.5" />New Assignment
          </Button>
        </div>
      )}

      {isLoading && (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}
      {!isLoading && assignments.length === 0 && (
        <div className="text-center py-12 text-muted-foreground text-sm">
          Nothing here yet.
        </div>
      )}

      <div className="space-y-3">
        {assignments.map((a) => {
          const stats = statsMap[a.id];
          const toGrade = stats?.toGrade ?? 0;
          const graded = stats?.graded ?? 0;
          const submitted = stats?.submitted ?? 0;
          const hasStats = stats !== undefined;

          return (
            <div
              key={a.id}
              className={`rounded-2xl border bg-card overflow-hidden transition-colors ${
                toGrade > 0
                  ? "border-amber-300 border-l-4 border-l-amber-400"
                  : "border-border"
              }`}
            >
              <div className="flex items-start gap-3 px-4 py-3.5">
                <div className="flex-1 min-w-0 space-y-1">
                  <button
                    onClick={() =>
                      navigate(`/classrooms/${classroomSlug}/classwork/${a.slug ?? a.id}`)
                    }
                    className="font-semibold text-sm text-foreground hover:text-primary text-left transition-colors leading-snug"
                  >
                    {a.title}
                  </button>

                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-muted-foreground">Due {a.dueDate}</span>
                  </div>

                  {hasStats && submitted > 0 && (
                    <span className="text-[11px] text-muted-foreground">
                      {submitted} submitted / {graded} graded
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0 mt-0.5">
                  <Button
                    size="sm"
                    className={`h-8 px-3 text-xs gap-1.5 ${toGrade > 0 ? "bg-amber-600 hover:bg-amber-700" : ""}`}
                    variant={toGrade > 0 ? "default" : "ghost"}
                    onClick={() => navigate(`/classrooms/${classroomSlug}/classwork/${a.slug ?? a.id}`)}
                  >
                    Review
                  </Button>
                  {!isArchived && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                        onClick={() =>
                          window.open(`/classrooms/${classroomSlug}/assignments/${a.slug ?? a.id}/edit`, "_blank")
                        }
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-red-400 hover:text-red-600"
                        onClick={() => setConfirmDeleteId(a.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <ConfirmDialog
        open={confirmDeleteId !== null}
        title="Delete this assignment?"
        description="All student submissions will also be removed."
        onConfirm={() => {
          deleteMutation.mutate(confirmDeleteId!);
          setConfirmDeleteId(null);
        }}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}

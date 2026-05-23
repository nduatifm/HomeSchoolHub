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
  Paperclip,
  ClipboardList,
  Link2,
} from "lucide-react";
import type { ClassroomAssignment } from "@shared/schema";
import type { SubmissionWithName } from "./types";

const TYPE_BADGE: Record<string, { label: string; cls: string }> = {
  assignment: { label: "Assignment", cls: "bg-blue-100 text-blue-700" },
  test:       { label: "Test",       cls: "bg-orange-100 text-orange-700" },
  quiz:       { label: "Quiz",       cls: "bg-purple-100 text-purple-700" },
  project:    { label: "Project",    cls: "bg-teal-100 text-teal-700" },
};

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

  // Build per-assignment stats: toGrade (submitted/late/returned) + graded counts
  const statsMap: Record<number, { toGrade: number; graded: number }> = {};
  allSubResults.forEach((q, i) => {
    const id = assignments[i]?.id;
    if (!id) return;
    const subs = q.data ?? [];
    statsMap[id] = {
      toGrade: subs.filter((s) => s.status === "submitted" || s.status === "late" || s.status === "returned").length,
      graded: subs.filter((s) => s.status === "graded").length,
    };
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
          No assignments yet.
        </div>
      )}

      <div className="space-y-3">
        {assignments.map((a) => {
          const stats = statsMap[a.id];
          const toGrade = stats?.toGrade ?? 0;
          const graded = stats?.graded ?? 0;
          const hasStats = stats !== undefined;
          const typeMeta = TYPE_BADGE[a.assignmentType] ?? TYPE_BADGE.assignment;

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
                    <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                      {a.points} pts
                    </span>
                    <span className={`inline-flex items-center text-[11px] font-medium px-1.5 py-0.5 rounded-full ${typeMeta.cls}`}>
                      {typeMeta.label}
                    </span>
                    {a.formSchema && a.formSchema.length > 0 && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded-full font-medium">
                        <ClipboardList className="h-2.5 w-2.5" />
                        {a.formSchema.length} form {a.formSchema.length === 1 ? "question" : "questions"}
                      </span>
                    )}
                    {a.fileUrl && (
                      <a href={a.fileUrl} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline">
                        <Paperclip className="h-2.5 w-2.5" />Attachment
                      </a>
                    )}
                    {a.linkUrl && (
                      <a href={a.linkUrl} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:underline">
                        <Link2 className="h-2.5 w-2.5" />Link
                      </a>
                    )}
                  </div>

                  {hasStats && (toGrade > 0 || graded > 0) && (
                    <span className="text-[11px] text-muted-foreground">
                      {toGrade} submitted · {graded} graded
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

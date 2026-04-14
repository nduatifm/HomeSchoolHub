import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useQueries, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import {
  Loader2,
  Plus,
  Trash2,
  Pencil,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Paperclip,
  ClipboardList,
} from "lucide-react";
import type { ClassroomAssignment } from "@shared/schema";
import StatusBadge from "./StatusBadge";
import type { SubmissionWithName } from "./types";

// ─── Main tab ─────────────────────────────────────────────────────────────────

export default function TeacherAssignmentsTab({ classroomId, classroomSlug, isArchived }: { classroomId: number; classroomSlug: string | number; isArchived: boolean }) {
  const [expanded, setExpanded] = useState<number | null>(null);
  const [, navigate] = useLocation();

  const { data: assignments = [], isLoading } = useQuery<ClassroomAssignment[]>({
    queryKey: ["/api/classrooms", classroomId, "assignments"],
    queryFn: () => apiRequest(`/api/classrooms/${classroomId}/assignments`),
  });

  const allSubResults = useQueries({
    queries: assignments.map((a) => ({
      queryKey: ["/api/classrooms", classroomId, "assignments", a.id, "submissions"],
      queryFn: () => apiRequest(`/api/classrooms/${classroomId}/assignments/${a.id}/submissions`) as Promise<SubmissionWithName[]>,
      enabled: assignments.length > 0,
      refetchInterval: 30000,
    })),
  });
  const subCountMap: Record<number, number> = {};
  allSubResults.forEach((q, i) => {
    if (assignments[i]) subCountMap[assignments[i].id] = (q.data ?? []).filter((s) => s.status === "submitted" || s.status === "late").length;
  });

  const { data: expandedSubs = [], isLoading: loadingSubs } = useQuery<SubmissionWithName[]>({
    queryKey: ["/api/classrooms", classroomId, "assignments", expanded, "submissions"],
    queryFn: () => apiRequest(`/api/classrooms/${classroomId}/assignments/${expanded}/submissions`),
    enabled: expanded !== null,
  });

  const deleteMutation = useMutation({
    mutationFn: (assignmentId: number) =>
      apiRequest(`/api/classrooms/${classroomId}/assignments/${assignmentId}`, { method: "DELETE" }),
    onSuccess: () => {
      setExpanded(null);
      queryClient.invalidateQueries({ queryKey: ["/api/classrooms", classroomId, "assignments"] });
      toast({ title: "Assignment deleted", type: "success" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, type: "error" }),
  });

  return (
    <div className="space-y-4">
      {!isArchived && (
        <div className="flex justify-end">
          <Button size="sm" className="gap-1.5" onClick={() => navigate(`/classrooms/${classroomSlug}/assignments/new`)}>
            <Plus className="h-3.5 w-3.5" />New Assignment
          </Button>
        </div>
      )}

      {isLoading && <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>}
      {!isLoading && assignments.length === 0 && (
        <div className="text-center py-12 text-muted-foreground text-sm rounded-2xl border border-dashed border-border">No assignments yet.</div>
      )}

      <div className="space-y-3">
        {assignments.map((a) => {
          const subCount = subCountMap[a.id] ?? 0;
          const isExpanded = expanded === a.id;
          return (
            <div key={a.id} className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3.5">
                <div className="flex-1 min-w-0">
                  <button
                    onClick={() => navigate(`/classrooms/${classroomSlug}/classwork/${a.slug ?? a.id}`)}
                    className="font-semibold text-sm text-foreground hover:text-primary text-left transition-colors leading-snug"
                  >{a.title}</button>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-xs text-muted-foreground">Due {a.dueDate}</span>
                    <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">{a.points} pts</span>
                    {a.formSchema && a.formSchema.length > 0 && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded-full font-medium">
                        <ClipboardList className="h-2.5 w-2.5" />{a.formSchema.length} form {a.formSchema.length === 1 ? "question" : "questions"}
                      </span>
                    )}
                    {a.fileUrl && (
                      <a href={a.fileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline">
                        <Paperclip className="h-2.5 w-2.5" />Attachment
                      </a>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {subCount > 0 && (
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold mr-1">{subCount}</span>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs gap-1.5 h-8"
                    onClick={() => setExpanded(isExpanded ? null : a.id)}
                  >
                    {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    {isExpanded ? "Collapse" : "Submissions"}
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                    onClick={() => navigate(`/classrooms/${classroomSlug}/classwork/${a.slug ?? a.id}`)}>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                  {!isArchived && (
                    <>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                        onClick={() => window.open(`/classrooms/${classroomSlug}/assignments/${a.slug ?? a.id}/edit`, "_blank")}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-400 hover:text-red-600"
                        onClick={() => { if (confirm("Delete this assignment and all its submissions?")) deleteMutation.mutate(a.id); }}
                        disabled={deleteMutation.isPending}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-border bg-muted/30 px-4 py-4">
                  {loadingSubs && <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>}
                  {!loadingSubs && expandedSubs.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-3">No submissions yet.</p>
                  )}
                  {expandedSubs.length > 0 && (
                    <div className="space-y-2">
                      {expandedSubs.map((sub) => (
                        <div key={sub.id} className="rounded-xl border border-border bg-card px-4 py-3">
                          <div className="flex items-start justify-between gap-3 flex-wrap">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-sm text-foreground">{sub.studentName}</span>
                                <StatusBadge status={sub.status} />
                                {sub.grade !== null && sub.grade !== undefined && (
                                  <span className="text-xs font-semibold text-green-700">{sub.grade}/{a.points} pts</span>
                                )}
                              </div>
                              {sub.content && (
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-3">{sub.content}</p>
                              )}
                              {sub.fileUrl && (
                                <a
                                  href={sub.fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Paperclip className="h-3 w-3" />View submission
                                </a>
                              )}
                            </div>
                            {(sub.status === "submitted" || sub.status === "late" || sub.status === "graded") && (
                              <div className="shrink-0">
                                <Button size="sm" variant="outline" className="text-xs h-8"
                                  onClick={() => navigate(`/classrooms/${classroomSlug}/submissions/${sub.id}/review`)}>
                                  {sub.status === "graded" ? "Edit Grade" : "Review"}
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

    </div>
  );
}

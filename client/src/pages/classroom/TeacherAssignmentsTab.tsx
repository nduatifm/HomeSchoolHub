import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useQueries, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  X,
} from "lucide-react";
import type { ClassroomAssignment } from "@shared/schema";
import StatusBadge from "./StatusBadge";
import type { SubmissionWithName } from "./types";

// ─── Grading modal ────────────────────────────────────────────────────────────

function GradingModal({
  sub,
  assignment,
  classroomId,
  expandedAssignmentId,
  onClose,
}: {
  sub: SubmissionWithName | null;
  assignment: ClassroomAssignment | null;
  classroomId: number;
  expandedAssignmentId: number | null;
  onClose: () => void;
}) {
  const [gradeVal, setGradeVal] = useState("");
  const [feedbackVal, setFeedbackVal] = useState("");

  useEffect(() => {
    if (sub) {
      setGradeVal(sub.grade !== null && sub.grade !== undefined ? String(sub.grade) : "");
      setFeedbackVal(sub.feedback ?? "");
    }
  }, [sub?.id]);

  const gradeMutation = useMutation({
    mutationFn: ({ submissionId }: { submissionId: number }) =>
      apiRequest(`/api/classrooms/${classroomId}/submissions/${submissionId}/grade`, {
        method: "PATCH",
        body: JSON.stringify({ grade: parseInt(gradeVal), feedback: feedbackVal || null }),
      }),
    onSuccess: () => {
      if (expandedAssignmentId) queryClient.invalidateQueries({ queryKey: ["/api/classrooms", classroomId, "assignments", expandedAssignmentId, "submissions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/teacher/classroom-stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/classroom-notifications/total"] });
      toast({ title: "Graded", type: "success" });
      onClose();
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, type: "error" }),
  });

  return (
    <Dialog open={!!sub} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{assignment?.title ?? "Submission"}</DialogTitle>
          {sub && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {sub.studentName} · <StatusBadge status={sub.status} />
              {sub.grade !== null && sub.grade !== undefined && (
                <span className="ml-2 text-xs font-semibold text-green-700">
                  {sub.grade}/{assignment?.points} pts
                </span>
              )}
            </p>
          )}
        </DialogHeader>

        {sub && (
          <div className="space-y-4 pt-1">
            <div className="flex gap-4 text-xs text-muted-foreground">
              {assignment?.dueDate && <span>Due: {assignment.dueDate}</span>}
              {assignment?.points && <span>{assignment.points} points</span>}
            </div>

            {sub.content ? (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Student Answer</p>
                <div className="rounded-lg border border-border bg-muted/30 px-3.5 py-3 text-sm text-foreground whitespace-pre-wrap leading-relaxed max-h-56 overflow-y-auto">
                  {sub.content}
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">No text answer submitted.</p>
            )}

            {sub.fileUrl && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Submitted File</p>
                <a href={sub.fileUrl} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline font-medium">
                  <Paperclip className="h-4 w-4" />View submission file<ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            )}

            {sub.feedback && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Previous Feedback</p>
                <p className="text-sm text-muted-foreground italic">"{sub.feedback}"</p>
              </div>
            )}

            <div className="border-t border-border pt-4 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {sub.status === "graded" ? "Update Grade" : "Grade Submission"}
              </p>
              <div className="flex gap-3 items-start">
                <div className="w-28 shrink-0">
                  <Label className="text-xs">Score (0–{assignment?.points ?? 100})</Label>
                  <Input
                    type="number"
                    min={0}
                    max={assignment?.points ?? 100}
                    placeholder={`0–${assignment?.points ?? 100}`}
                    value={gradeVal}
                    onChange={(e) => setGradeVal(e.target.value)}
                    className="mt-1 h-8 text-sm"
                  />
                </div>
                <div className="flex-1">
                  <Label className="text-xs">Feedback <span className="font-normal text-muted-foreground">(optional)</span></Label>
                  <Textarea
                    placeholder="Leave feedback for the student…"
                    value={feedbackVal}
                    onChange={(e) => setFeedbackVal(e.target.value)}
                    rows={3}
                    className="mt-1 text-sm resize-none"
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
                <Button
                  size="sm"
                  disabled={gradeVal === "" || gradeMutation.isPending}
                  onClick={() => gradeMutation.mutate({ submissionId: sub.id })}
                >
                  {gradeMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
                  Save Grade
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Edit dialog ──────────────────────────────────────────────────────────────

function EditAssignmentDialog({
  assignment,
  classroomId,
  onClose,
}: {
  assignment: ClassroomAssignment;
  classroomId: number;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    title: assignment.title,
    description: assignment.description,
    dueDate: assignment.dueDate,
    points: String(assignment.points),
  });
  const [newFile, setNewFile] = useState<File | null>(null);
  const [clearFile, setClearFile] = useState(false);

  const editMutation = useMutation({
    mutationFn: () => {
      const fd = new FormData();
      fd.append("title", form.title);
      fd.append("description", form.description);
      fd.append("dueDate", form.dueDate);
      fd.append("points", form.points);
      if (newFile) {
        fd.append("file", newFile);
      } else if (clearFile) {
        fd.append("clearFile", "true");
      }
      const token = localStorage.getItem("sessionId");
      return fetch(`/api/classrooms/${classroomId}/assignments/${assignment.id}`, {
        method: "PATCH",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      }).then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error ?? "Update failed");
        return data;
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/classrooms", classroomId, "assignments"] });
      toast({ title: "Assignment updated", type: "success" });
      onClose();
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, type: "error" }),
  });

  const canSave = form.title.trim().length > 0 && form.dueDate.length > 0 && !editMutation.isPending;

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Edit Assignment</DialogTitle></DialogHeader>
        <div className="space-y-3 pt-2">
          <div>
            <Label>Title</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-1" />
          </div>
          <div>
            <Label>Description <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="mt-1 resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Due Date</Label>
              <Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label>Points</Label>
              <Input type="number" min={1} value={form.points} onChange={(e) => setForm({ ...form, points: e.target.value })} className="mt-1" />
            </div>
          </div>

          {/* Attachment */}
          <div>
            <Label>Attachment <span className="text-muted-foreground font-normal">(optional)</span></Label>
            {assignment.fileUrl && !clearFile && !newFile && (
              <div className="mt-1 flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-muted/30">
                <Paperclip className="h-3.5 w-3.5 text-primary shrink-0" />
                <a href={assignment.fileUrl} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline flex-1 truncate">
                  Current attachment
                </a>
                <button type="button" onClick={() => setClearFile(true)}
                  className="text-muted-foreground hover:text-red-500 transition-colors">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
            {clearFile && !newFile && (
              <p className="mt-1 text-xs text-muted-foreground">Attachment will be removed on save.</p>
            )}
            <Input
              type="file"
              accept="image/*,.pdf,.doc,.docx,.txt"
              className="mt-1 cursor-pointer"
              onChange={(e) => {
                setClearFile(false);
                setNewFile(e.target.files?.[0] ?? null);
              }}
            />
            {newFile && <p className="text-xs text-muted-foreground mt-1">New file: {newFile.name}</p>}
          </div>

          <div className="flex gap-2 justify-end pt-1">
            <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" disabled={!canSave} onClick={() => editMutation.mutate()}>
              {editMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main tab ─────────────────────────────────────────────────────────────────

export default function TeacherAssignmentsTab({ classroomId, classroomSlug, isArchived }: { classroomId: number; classroomSlug: string | number; isArchived: boolean }) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [modalSub, setModalSub] = useState<SubmissionWithName | null>(null);
  const [modalAssignment, setModalAssignment] = useState<ClassroomAssignment | null>(null);
  const [editingAssignment, setEditingAssignment] = useState<ClassroomAssignment | null>(null);
  const [form, setForm] = useState({ title: "", description: "", dueDate: "", points: "100" });
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [, navigate] = useLocation();

  const openModal = (sub: SubmissionWithName, assignment: ClassroomAssignment) => {
    setModalSub(sub);
    setModalAssignment(assignment);
  };

  const closeModal = () => {
    setModalSub(null);
    setModalAssignment(null);
  };

  const { data: assignments = [], isLoading } = useQuery<ClassroomAssignment[]>({
    queryKey: ["/api/classrooms", classroomId, "assignments"],
    queryFn: () => apiRequest(`/api/classrooms/${classroomId}/assignments`),
  });

  const allSubResults = useQueries({
    queries: assignments.map((a) => ({
      queryKey: ["/api/classrooms", classroomId, "assignments", a.id, "submissions"],
      queryFn: () => apiRequest(`/api/classrooms/${classroomId}/assignments/${a.id}/submissions`) as Promise<SubmissionWithName[]>,
      enabled: assignments.length > 0,
    })),
  });
  const subCountMap: Record<number, number> = {};
  allSubResults.forEach((q, i) => {
    if (assignments[i]) subCountMap[assignments[i].id] = (q.data ?? []).filter((s) => s.status !== "pending").length;
  });

  const { data: expandedSubs = [], isLoading: loadingSubs } = useQuery<SubmissionWithName[]>({
    queryKey: ["/api/classrooms", classroomId, "assignments", expanded, "submissions"],
    queryFn: () => apiRequest(`/api/classrooms/${classroomId}/assignments/${expanded}/submissions`),
    enabled: expanded !== null,
  });

  const createMutation = useMutation({
    mutationFn: () => {
      const fd = new FormData();
      fd.append("title", form.title);
      fd.append("description", form.description);
      fd.append("dueDate", form.dueDate);
      fd.append("points", form.points);
      if (attachedFile) fd.append("file", attachedFile);
      const token = localStorage.getItem("sessionId");
      return fetch(`/api/classrooms/${classroomId}/assignments/with-file`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      }).then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error ?? "Upload failed");
        return data;
      });
    },
    onSuccess: () => {
      setOpen(false);
      setForm({ title: "", description: "", dueDate: "", points: "100" });
      setAttachedFile(null);
      queryClient.invalidateQueries({ queryKey: ["/api/classrooms", classroomId, "assignments"] });
      toast({ title: "Assignment created", type: "success" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, type: "error" }),
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
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5"><Plus className="h-3.5 w-3.5" />New Assignment</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create Assignment</DialogTitle></DialogHeader>
              <div className="space-y-3 pt-2">
                <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
                <div><Label>Description <span className="text-muted-foreground font-normal">(optional)</span></Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Due Date</Label><Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></div>
                  <div><Label>Points</Label><Input type="number" min={1} value={form.points} onChange={(e) => setForm({ ...form, points: e.target.value })} /></div>
                </div>
                <div>
                  <Label>Attachment <span className="text-muted-foreground font-normal">(optional)</span></Label>
                  <Input type="file" accept="image/*,.pdf,.doc,.docx,.txt" className="mt-1 cursor-pointer" onChange={(e) => setAttachedFile(e.target.files?.[0] ?? null)} />
                  {attachedFile && <p className="text-xs text-muted-foreground mt-1">Selected: {attachedFile.name}</p>}
                </div>
                <Button className="w-full" disabled={!form.title || !form.dueDate || createMutation.isPending} onClick={() => createMutation.mutate()}>
                  {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Create Assignment
                </Button>
              </div>
            </DialogContent>
          </Dialog>
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
                        onClick={() => setEditingAssignment(a)}>
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
                                  onClick={() => openModal(sub, a)}>
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

      <GradingModal
        sub={modalSub}
        assignment={modalAssignment}
        classroomId={classroomId}
        expandedAssignmentId={expanded}
        onClose={closeModal}
      />

      {editingAssignment && (
        <EditAssignmentDialog
          assignment={editingAssignment}
          classroomId={classroomId}
          onClose={() => setEditingAssignment(null)}
        />
      )}
    </div>
  );
}

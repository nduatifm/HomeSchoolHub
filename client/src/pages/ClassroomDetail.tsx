import React, { useState, useRef } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useQueries, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import {
  BookOpen,
  Users,
  LibraryBig,
  BarChart2,
  Megaphone,
  Loader2,
  Plus,
  Trash2,
  ExternalLink,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Archive,
  ArchiveRestore,
  Send,
  Pencil,
  Link2,
  FileUp,
  Paperclip,
  ArrowRight,
} from "lucide-react";
import ModernSidebar from "@/components/ModernSidebar";
import type {
  Classroom,
  ClassroomPost,
  ClassroomAssignment,
  ClassroomSubmission,
  ClassroomMaterial,
  ClassroomEnrollment,
  Student,
} from "@shared/schema";

type PostWithAuthor = ClassroomPost & { authorName: string };
type SubmissionWithName = ClassroomSubmission & { studentName: string };
type EnrollmentWithStudent = ClassroomEnrollment & { student: { id: number; name: string; userId: number } };

// ── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-gray-100 text-gray-600",
    submitted: "bg-blue-100 text-blue-700",
    late: "bg-amber-100 text-amber-700",
    graded: "bg-green-100 text-green-700",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${map[status] ?? "bg-gray-100 text-gray-600"}`}>
      {status}
    </span>
  );
}

// ── Feed tab ─────────────────────────────────────────────────────────────────
function FeedTab({ classroomId, isTeacher, isArchived }: { classroomId: number; isTeacher: boolean; isArchived: boolean }) {
  const [content, setContent] = useState("");
  const { data: posts = [], isLoading } = useQuery<PostWithAuthor[]>({
    queryKey: ["/api/classrooms", classroomId, "posts"],
    queryFn: () => apiRequest(`/api/classrooms/${classroomId}/posts`),
  });
  const postMutation = useMutation({
    mutationFn: () => apiRequest(`/api/classrooms/${classroomId}/posts`, { method: "POST", body: JSON.stringify({ content }) }),
    onSuccess: () => {
      setContent("");
      queryClient.invalidateQueries({ queryKey: ["/api/classrooms", classroomId, "posts"] });
      toast({ title: "Posted", type: "success" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, type: "error" }),
  });

  return (
    <div className="space-y-4">
      {isTeacher && !isArchived && (
        <Card>
          <CardContent className="pt-4">
            <div className="space-y-2">
              <Textarea
                placeholder="Post an announcement to the class…"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="resize-none"
                rows={3}
              />
              <div className="flex justify-end">
                <Button
                  size="sm"
                  disabled={!content.trim() || postMutation.isPending}
                  onClick={() => postMutation.mutate()}
                  className="gap-1.5"
                >
                  {postMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  Post
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading && <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-gray-400" /></div>}

      {!isLoading && posts.length === 0 && (
        <div className="text-center py-12 text-gray-400 text-sm">No announcements yet.</div>
      )}

      <div className="space-y-3">
        {posts.map((post) => (
          <Card key={post.id}>
            <CardContent className="pt-4">
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{post.content}</p>
              <p className="text-xs text-gray-400 mt-2">
                {post.authorName} · {new Date(post.createdAt).toLocaleString()}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ── Teacher Assignments tab ───────────────────────────────────────────────────
function TeacherAssignmentsTab({ classroomId, classroomSlug, isArchived }: { classroomId: number; classroomSlug: string | number; isArchived: boolean }) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [gradingId, setGradingId] = useState<number | null>(null);
  const [gradeVal, setGradeVal] = useState("");
  const [feedbackVal, setFeedbackVal] = useState("");
  const [form, setForm] = useState({ title: "", description: "", dueDate: "", points: "100" });
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [, navigate] = useLocation();

  const { data: assignments = [], isLoading } = useQuery<ClassroomAssignment[]>({
    queryKey: ["/api/classrooms", classroomId, "assignments"],
    queryFn: () => apiRequest(`/api/classrooms/${classroomId}/assignments`),
  });

  // Pre-fetch submissions for all assignments to show submission counts upfront
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
    onError: (e: any) => toast({ title: "Error", description: e.message, type: "error" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (assignmentId: number) =>
      apiRequest(`/api/classrooms/${classroomId}/assignments/${assignmentId}`, { method: "DELETE" }),
    onSuccess: () => {
      setExpanded(null);
      queryClient.invalidateQueries({ queryKey: ["/api/classrooms", classroomId, "assignments"] });
      toast({ title: "Assignment deleted", type: "success" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, type: "error" }),
  });

  const gradeMutation = useMutation({
    mutationFn: ({ submissionId }: { submissionId: number }) =>
      apiRequest(`/api/classrooms/${classroomId}/submissions/${submissionId}/grade`, {
        method: "PATCH",
        body: JSON.stringify({ grade: parseInt(gradeVal), feedback: feedbackVal || null }),
      }),
    onSuccess: () => {
      setGradingId(null);
      setGradeVal("");
      setFeedbackVal("");
      if (expanded) queryClient.invalidateQueries({ queryKey: ["/api/classrooms", classroomId, "assignments", expanded, "submissions"] });
      toast({ title: "Graded", type: "success" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, type: "error" }),
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
                <div><Label>Description <span className="text-gray-400 font-normal">(optional)</span></Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Due Date</Label><Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></div>
                  <div><Label>Points</Label><Input type="number" min={1} value={form.points} onChange={(e) => setForm({ ...form, points: e.target.value })} /></div>
                </div>
                <div>
                  <Label>Attachment <span className="text-gray-400 font-normal">(optional)</span></Label>
                  <Input type="file" accept="image/*,.pdf,.doc,.docx,.txt" className="mt-1 cursor-pointer" onChange={(e) => setAttachedFile(e.target.files?.[0] ?? null)} />
                  {attachedFile && <p className="text-xs text-gray-500 mt-1">Selected: {attachedFile.name}</p>}
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

      {isLoading && <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-gray-400" /></div>}
      {!isLoading && assignments.length === 0 && <div className="text-center py-12 text-gray-400 text-sm">No assignments yet.</div>}

      <div className="overflow-x-auto rounded-lg border">
        {assignments.length > 0 && (
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Assignment</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Due Date</th>
                <th className="text-center px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Points</th>
                <th className="text-center px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Submissions</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {assignments.map((a) => (
                <React.Fragment key={a.id}>
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <button
                        onClick={() => navigate(`/classrooms/${classroomSlug}/classwork/${a.slug ?? a.id}`)}
                        className="font-medium text-gray-800 hover:text-primary text-left transition-colors"
                      >{a.title}</button>
                      <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{a.description}</p>
                      {a.fileUrl && (
                        <a href={a.fileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline mt-0.5">
                          <ExternalLink className="h-2.5 w-2.5" />Attachment
                        </a>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{a.dueDate}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">{a.points} pts</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Button variant="ghost" size="sm" className="text-xs gap-1.5" onClick={() => setExpanded(expanded === a.id ? null : a.id)}>
                        {subCountMap[a.id] !== undefined && subCountMap[a.id] > 0 && (
                          <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-primary text-white text-[10px] font-bold">{subCountMap[a.id]}</span>
                        )}
                        {expanded === a.id ? "Collapse" : "View Submissions"}
                      </Button>
                    </td>
                    <td className="px-4 py-3 text-right flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-gray-400 hover:text-gray-700"
                        onClick={() => navigate(`/classrooms/${classroomSlug}/classwork/${a.slug ?? a.id}`)}
                        title="Open assignment detail"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                      {!isArchived && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-400 hover:text-red-600"
                          onClick={() => {
                            if (confirm("Delete this assignment and all its submissions?")) {
                              deleteMutation.mutate(a.id);
                            }
                          }}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </td>
                  </tr>
                  {expanded === a.id && (
                    <tr key={`${a.id}-subs`}>
                      <td colSpan={5} className="px-4 pb-4 pt-1 bg-gray-50">
                        {loadingSubs && <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-gray-400" /></div>}
                        {!loadingSubs && expandedSubs.length === 0 && (
                          <p className="text-xs text-gray-400 text-center py-3">No submissions yet.</p>
                        )}
                        {expandedSubs.length > 0 && (
                          <div className="rounded-md border overflow-hidden mt-1">
                            <table className="min-w-full text-xs">
                              <thead className="bg-white border-b">
                                <tr>
                                  <th className="text-left px-3 py-2 font-semibold text-gray-500">Student</th>
                                  <th className="text-left px-3 py-2 font-semibold text-gray-500">Status</th>
                                  <th className="text-left px-3 py-2 font-semibold text-gray-500">Answer</th>
                                  <th className="text-left px-3 py-2 font-semibold text-gray-500">Grade</th>
                                  <th className="px-3 py-2"></th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100 bg-white">
                                {expandedSubs.map((sub) => (
                                  <tr key={sub.id}>
                                    <td className="px-3 py-2 font-medium text-gray-700">{sub.studentName}</td>
                                    <td className="px-3 py-2"><StatusBadge status={sub.status} /></td>
                                    <td className="px-3 py-2 max-w-[200px]">
                                      {sub.content ? (
                                        <span className="text-gray-600 truncate block">{sub.content}</span>
                                      ) : (
                                        <span className="text-gray-300">—</span>
                                      )}
                                    </td>
                                    <td className="px-3 py-2">
                                      {sub.grade !== null && sub.grade !== undefined ? (
                                        <span className="font-semibold text-green-700">{sub.grade}/{a.points}</span>
                                      ) : (
                                        <span className="text-gray-300">—</span>
                                      )}
                                      {sub.feedback && (
                                        <p className="text-gray-400 italic mt-0.5">"{sub.feedback}"</p>
                                      )}
                                    </td>
                                    <td className="px-3 py-2">
                                      {(sub.status === "submitted" || sub.status === "late") && gradingId !== sub.id && (
                                        <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => { setGradingId(sub.id); setGradeVal(""); setFeedbackVal(""); }}>
                                          Grade
                                        </Button>
                                      )}
                                      {gradingId === sub.id && (
                                        <div className="space-y-1.5 min-w-[220px]">
                                          <div className="flex gap-1.5">
                                            <Input type="number" min={0} max={a.points} placeholder={`0–${a.points}`} value={gradeVal} onChange={(e) => setGradeVal(e.target.value)} className="w-20 h-7 text-xs" />
                                            <Input placeholder="Feedback" value={feedbackVal} onChange={(e) => setFeedbackVal(e.target.value)} className="h-7 text-xs" />
                                          </div>
                                          <div className="flex gap-1.5">
                                            <Button size="sm" className="h-7 text-xs" disabled={gradeVal === "" || gradeMutation.isPending} onClick={() => gradeMutation.mutate({ submissionId: sub.id })}>
                                              {gradeMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
                                            </Button>
                                            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setGradingId(null)}>Cancel</Button>
                                          </div>
                                        </div>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── Teacher Grades tab (matrix) ───────────────────────────────────────────────
function TeacherGradesTab({ classroomId }: { classroomId: number }) {
  const { data: assignments = [] } = useQuery<ClassroomAssignment[]>({
    queryKey: ["/api/classrooms", classroomId, "assignments"],
    queryFn: () => apiRequest(`/api/classrooms/${classroomId}/assignments`),
  });
  const { data: enrollments = [] } = useQuery<EnrollmentWithStudent[]>({
    queryKey: ["/api/classrooms", classroomId, "enrollments"],
    queryFn: () => apiRequest(`/api/classrooms/${classroomId}/enrollments`),
  });

  // Fetch submissions for all assignments using useQueries (safe for dynamic counts)
  const allSubsResults = useQueries({
    queries: assignments.map((a) => ({
      queryKey: ["/api/classrooms", classroomId, "assignments", a.id, "submissions"],
      queryFn: () => apiRequest(`/api/classrooms/${classroomId}/assignments/${a.id}/submissions`) as Promise<SubmissionWithName[]>,
      enabled: assignments.length > 0,
    })),
  });

  // Build lookup: submissionMap[studentId][assignmentId] = submission
  const submissionMap: Record<number, Record<number, SubmissionWithName>> = {};
  allSubsResults.forEach((q, i) => {
    (q.data ?? []).forEach((sub) => {
      if (!submissionMap[sub.studentId]) submissionMap[sub.studentId] = {};
      submissionMap[sub.studentId][assignments[i].id] = sub;
    });
  });

  if (assignments.length === 0 || enrollments.length === 0) {
    return <div className="text-center py-12 text-gray-400 text-sm">Add assignments and students to see the grade book.</div>;
  }

  const totalPossible = assignments.reduce((s, a) => s + a.points, 0);

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 border-b">
          <tr>
            <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 min-w-[140px]">Student</th>
            {assignments.map((a) => (
              <th key={a.id} className="px-3 py-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[100px]">
                <div className="truncate max-w-[100px]" title={a.title}>{a.title}</div>
                <div className="text-gray-400 font-normal">{a.points} pts</div>
              </th>
            ))}
            <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[90px]">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {enrollments.map((e) => {
            const subs = submissionMap[e.studentId] ?? {};
            const earned = assignments.reduce((s, a) => s + (subs[a.id]?.grade ?? 0), 0);
            const pct = totalPossible > 0 ? Math.round((earned / totalPossible) * 100) : 0;
            return (
              <tr key={e.studentId} className="hover:bg-gray-50">
                <td className="px-3 py-2 font-medium text-gray-800 sticky left-0 bg-white">{e.student.name}</td>
                {assignments.map((a) => {
                  const sub = subs[a.id];
                  return (
                    <td key={a.id} className="px-3 py-2 text-center">
                      {sub?.grade !== null && sub?.grade !== undefined ? (
                        <span className="font-medium text-green-700">{sub.grade}</span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                  );
                })}
                <td className="px-3 py-2 text-center">
                  <div className="font-semibold text-gray-800">{earned}/{totalPossible}</div>
                  <div className="text-xs text-gray-400">{pct}%</div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Classwork tab ─────────────────────────────────────────────────────────────
type AttachType = "url" | "file";
type DialogMode = "create" | "edit";

function ClassworkDialog({
  mode,
  initial,
  classroomId,
  assignments,
  isArchived,
  onSuccess,
  trigger,
}: {
  mode: DialogMode;
  initial?: ClassroomMaterial;
  classroomId: number;
  assignments: ClassroomAssignment[];
  isArchived: boolean;
  onSuccess: () => void;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: initial?.title ?? "",
    description: initial?.description ?? "",
    attachType: (initial?.url ? "url" : "file") as AttachType,
    url: initial?.url ?? "",
    assignmentId: initial?.assignmentId ? String(initial.assignmentId) : "",
  });
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["/api/classrooms", classroomId, "materials"] });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const hasFile = form.attachType === "file" && file;
      const token = localStorage.getItem("sessionId");
      const method = mode === "create" ? "POST" : "PATCH";

      if (hasFile) {
        const endpoint = mode === "create"
          ? `/api/classrooms/${classroomId}/materials/with-file`
          : `/api/classrooms/${classroomId}/materials/${initial!.id}/with-file`;
        const fd = new FormData();
        fd.append("file", file!);
        fd.append("title", form.title);
        fd.append("description", form.description);
        if (form.assignmentId) fd.append("assignmentId", form.assignmentId);
        return fetch(endpoint, {
          method,
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: fd,
        }).then(async (r) => {
          const data = await r.json();
          if (!r.ok) throw new Error(data.error ?? "Upload failed");
          return data;
        });
      }
      const endpoint = mode === "create"
        ? `/api/classrooms/${classroomId}/materials`
        : `/api/classrooms/${classroomId}/materials/${initial!.id}`;
      return apiRequest(endpoint, {
        method,
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          url: form.url || null,
          assignmentId: form.assignmentId ? Number(form.assignmentId) : null,
        }),
      });
    },
    onSuccess: () => {
      setOpen(false);
      invalidate();
      toast({ title: mode === "create" ? "Classwork added" : "Classwork updated", type: "success" });
      onSuccess();
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, type: "error" }),
  });

  const canSubmit = form.title.trim().length > 0 && !submitMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={(v) => {
      setOpen(v);
      if (!v) {
        setFile(null);
        setForm({
          title: initial?.title ?? "",
          description: initial?.description ?? "",
          attachType: (initial?.url ? "url" : "file") as AttachType,
          url: initial?.url ?? "",
          assignmentId: initial?.assignmentId ? String(initial.assignmentId) : "",
        });
      }
    }}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Add Classwork" : "Edit Classwork"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          <div>
            <Label>Title <span className="text-red-400">*</span></Label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Reading Chapter 5"
            />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              placeholder="Optional notes for students…"
            />
          </div>

          {/* Attachment — toggle URL / File */}
          <div>
            <Label>Attachment <span className="text-xs text-gray-400 ml-1">(optional)</span></Label>
            <div className="flex gap-2 mt-1 mb-2">
              <Button
                type="button"
                size="sm"
                variant={form.attachType === "url" ? "default" : "outline"}
                className="gap-1.5"
                onClick={() => setForm({ ...form, attachType: "url" })}
              >
                <Link2 className="h-3.5 w-3.5" />URL
              </Button>
              <Button
                type="button"
                size="sm"
                variant={form.attachType === "file" ? "default" : "outline"}
                className="gap-1.5"
                onClick={() => setForm({ ...form, attachType: "file" })}
              >
                <FileUp className="h-3.5 w-3.5" />Upload file
              </Button>
            </div>
            {form.attachType === "url" ? (
              <Input
                type="url"
                placeholder="https://…"
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
              />
            ) : (
              <div className="flex items-center gap-2">
                <input ref={fileRef} type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => fileRef.current?.click()}>
                  <Paperclip className="h-3.5 w-3.5" />{file ? file.name : "Choose file"}
                </Button>
                {file && <span className="text-xs text-gray-500 truncate max-w-[180px]">{file.name}</span>}
              </div>
            )}
          </div>

          {/* Link assignment */}
          {assignments.length > 0 && (
            <div>
              <Label>Link to assignment <span className="text-xs text-gray-400 ml-1">(optional)</span></Label>
              <Select
                value={form.assignmentId || "none"}
                onValueChange={(v) => setForm({ ...form, assignmentId: v === "none" ? "" : v })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="No linked assignment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No linked assignment</SelectItem>
                  {assignments.map((a) => (
                    <SelectItem key={a.id} value={String(a.id)}>{a.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <Button className="w-full" disabled={!canSubmit} onClick={() => submitMutation.mutate()}>
            {submitMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {mode === "create" ? "Add Classwork" : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ClassworkCard({
  item,
  classroomId,
  classroomSlug,
  isTeacher,
  isArchived,
  assignments,
}: {
  item: ClassroomMaterial;
  classroomId: number;
  classroomSlug: string | number;
  isTeacher: boolean;
  isArchived: boolean;
  assignments: ClassroomAssignment[];
}) {
  const [expanded, setExpanded] = useState(false);
  const [, navigate] = useLocation();

  const deleteMutation = useMutation({
    mutationFn: () => apiRequest(`/api/classrooms/${classroomId}/materials/${item.id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/classrooms", classroomId, "materials"] });
      toast({ title: "Classwork removed", type: "success" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, type: "error" }),
  });

  const assignmentHref = item.linkedAssignment
    ? `/classrooms/${classroomSlug}/classwork/${item.linkedAssignment.slug ?? item.linkedAssignment.id}`
    : null;

  return (
    <div className="rounded-lg border bg-white hover:border-primary/30 transition-colors">
      {/* Collapsed header */}
      <button
        type="button"
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-gray-900">{item.title}</span>
            {item.url && <span title="Has attachment"><Paperclip className="h-3 w-3 text-gray-400 shrink-0" /></span>}
            {item.linkedAssignment && <span title="Linked to assignment"><Link2 className="h-3 w-3 text-primary shrink-0" /></span>}
          </div>
          <span className="text-[11px] text-gray-400">{new Date(item.uploadedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {isTeacher && !isArchived && (
            <>
              <ClassworkDialog
                mode="edit"
                initial={item}
                classroomId={classroomId}
                assignments={assignments}
                isArchived={isArchived}
                onSuccess={() => {}}
                trigger={
                  <button
                    type="button"
                    className="inline-flex items-center justify-center h-7 w-7 rounded-md text-gray-400 hover:text-primary hover:bg-gray-100 transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                }
              />
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-red-400 hover:text-red-600"
                onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(); }}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              </Button>
            </>
          )}
          {expanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
        </div>
      </button>

      {/* Expanded body */}
      {expanded && (
        <div className="px-4 pb-4 border-t pt-3 space-y-3">
          {item.description && (
            <p className="text-sm text-gray-600 leading-relaxed">{item.description}</p>
          )}
          {item.url && (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline font-medium"
            >
              <Paperclip className="h-3.5 w-3.5" />View attachment<ExternalLink className="h-3 w-3" />
            </a>
          )}
          {assignmentHref && (
            <button
              type="button"
              className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
              onClick={() => navigate(assignmentHref)}
            >
              <ArrowRight className="h-3.5 w-3.5" />Go to assignment: {item.linkedAssignment!.title}
            </button>
          )}
          {!item.description && !item.url && !assignmentHref && (
            <p className="text-sm text-gray-400 italic">No additional details.</p>
          )}
        </div>
      )}
    </div>
  );
}

function ClassworkTab({ classroomId, classroomSlug, isTeacher, isArchived }: { classroomId: number; classroomSlug: string | number; isTeacher: boolean; isArchived: boolean }) {
  const { data: classwork = [], isLoading } = useQuery<ClassroomMaterial[]>({
    queryKey: ["/api/classrooms", classroomId, "materials"],
    queryFn: () => apiRequest(`/api/classrooms/${classroomId}/materials`),
  });

  const { data: assignments = [] } = useQuery<ClassroomAssignment[]>({
    queryKey: ["/api/classrooms", classroomId, "assignments"],
    queryFn: () => apiRequest(`/api/classrooms/${classroomId}/assignments`),
    enabled: isTeacher,
  });

  return (
    <div className="space-y-3">
      {isTeacher && !isArchived && (
        <div className="flex justify-end">
          <ClassworkDialog
            mode="create"
            classroomId={classroomId}
            assignments={assignments}
            isArchived={isArchived}
            onSuccess={() => {}}
            trigger={
              <Button size="sm" className="gap-1.5">
                <Plus className="h-3.5 w-3.5" />Add Classwork
              </Button>
            }
          />
        </div>
      )}

      {isLoading && <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-gray-400" /></div>}
      {!isLoading && classwork.length === 0 && (
        <div className="text-center py-12 text-gray-400 text-sm">No classwork yet.</div>
      )}

      <div className="space-y-2">
        {classwork.map((item) => (
          <ClassworkCard
            key={item.id}
            item={item}
            classroomId={classroomId}
            classroomSlug={classroomSlug}
            isTeacher={isTeacher}
            isArchived={isArchived}
            assignments={assignments}
          />
        ))}
      </div>
    </div>
  );
}

// ── Students tab ──────────────────────────────────────────────────────────────
type StudentSearchResult = { id: number; name: string; gradeLevel: string; email: string };

function StudentsTab({ classroomId, teacherId, isArchived }: { classroomId: number; teacherId: number; isArchived: boolean }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQ, setSearchQ] = useState("");

  const { data: enrollments = [], isLoading } = useQuery<EnrollmentWithStudent[]>({
    queryKey: ["/api/classrooms", classroomId, "enrollments"],
    queryFn: () => apiRequest(`/api/classrooms/${classroomId}/enrollments`),
  });
  const { data: myStudents = [] } = useQuery<(Student & { email?: string })[]>({
    queryKey: ["/api/students/teacher"],
  });
  const { data: assignments = [] } = useQuery<ClassroomAssignment[]>({
    queryKey: ["/api/classrooms", classroomId, "assignments"],
    queryFn: () => apiRequest(`/api/classrooms/${classroomId}/assignments`),
  });
  const { data: searchResults = [] } = useQuery<StudentSearchResult[]>({
    queryKey: ["/api/students/search", searchQ],
    queryFn: () => apiRequest(`/api/students/search?q=${encodeURIComponent(searchQ)}`),
    enabled: searchOpen,
  });

  const enrolledIds = new Set(enrollments.map((e) => e.studentId));
  // Quick-add: teacher's assigned students not yet enrolled
  const unenrolledAssigned = myStudents.filter((s) => !enrolledIds.has(s.id));
  // Search results filtered to exclude already-enrolled
  const filteredSearch = searchResults.filter((s) => !enrolledIds.has(s.id));
  const totalPoints = assignments.reduce((s, a) => s + a.points, 0);

  // Per-student submission data for grade summary
  const submissionsResults = useQueries({
    queries: enrollments.map((e) => ({
      queryKey: ["/api/classrooms", classroomId, "my-submissions", e.studentId],
      queryFn: () => apiRequest(`/api/classrooms/${classroomId}/my-submissions?studentId=${e.studentId}`) as Promise<ClassroomSubmission[]>,
      enabled: enrollments.length > 0,
    })),
  });

  const enrollMutation = useMutation({
    mutationFn: (studentId: number) =>
      apiRequest(`/api/classrooms/${classroomId}/enroll`, { method: "POST", body: JSON.stringify({ studentId }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/classrooms", classroomId, "enrollments"] });
      toast({ title: "Student enrolled", type: "success" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, type: "error" }),
  });

  const removeMutation = useMutation({
    mutationFn: (studentId: number) =>
      apiRequest(`/api/classrooms/${classroomId}/students/${studentId}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/classrooms", classroomId, "enrollments"] });
      toast({ title: "Student removed", type: "success" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, type: "error" }),
  });

  return (
    <div className="space-y-4">
      {/* ── Enrolled students ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">
          Enrolled Students {enrollments.length > 0 && <span className="text-gray-400 font-normal">({enrollments.length})</span>}
        </h3>
        {!isArchived && (
          <Dialog open={searchOpen} onOpenChange={(o) => { setSearchOpen(o); if (!o) setSearchQ(""); }}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5"><Plus className="h-3.5 w-3.5" />Add Students</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add Students</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <Input
                  placeholder="Search by name, username, or email…"
                  value={searchQ}
                  onChange={(e) => setSearchQ(e.target.value)}
                  autoFocus
                />
                <div className="space-y-1 max-h-72 overflow-y-auto">
                  {filteredSearch.length === 0 && searchQ.length >= 2 && (
                    <p className="text-sm text-gray-400 text-center py-4">No students found.</p>
                  )}
                  {searchQ.length < 2 && (
                    <p className="text-sm text-gray-400 text-center py-4">Type at least 2 characters to search by name, username, or email.</p>
                  )}
                  {filteredSearch.map((s) => (
                    <div key={s.id} className="flex items-center justify-between rounded-lg border px-3 py-2">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{s.name}</p>
                        <p className="text-xs text-gray-400">{s.email} · {s.gradeLevel}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => enrollMutation.mutate(s.id)}
                        disabled={enrollMutation.isPending}
                      >
                        Enroll
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {isLoading && <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-gray-400" /></div>}
      {!isLoading && enrollments.length === 0 && (
        <div className="text-center py-12 text-gray-400 text-sm">No students enrolled yet. Use "Add Students" to enroll students.</div>
      )}

      <div className="space-y-2">
        {enrollments.map((e, i) => {
          const subs = submissionsResults[i]?.data ?? [];
          const earned = subs.reduce((s, sub) => s + (sub.grade ?? 0), 0);
          return (
            <div key={e.studentId} className="flex items-center justify-between rounded-lg border px-4 py-3">
              <div>
                <p className="text-sm font-medium text-gray-800">{e.student.name}</p>
                {totalPoints > 0 && (
                  <p className="text-xs text-gray-400">{earned} / {totalPoints} pts ({Math.round((earned / totalPoints) * 100)}%)</p>
                )}
              </div>
              {!isArchived && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-400 hover:text-red-600"
                  onClick={() => removeMutation.mutate(e.studentId)}
                  disabled={removeMutation.isPending}
                >
                  Remove
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Quick-add: assigned students not yet enrolled ─────────────────── */}
      {!isArchived && unenrolledAssigned.length > 0 && (
        <div className="pt-2 border-t">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Your students not yet enrolled</p>
          <div className="space-y-1">
            {unenrolledAssigned.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-lg border px-4 py-2">
                <span className="text-sm text-gray-700">{s.name}</span>
                <Button size="sm" variant="outline" onClick={() => enrollMutation.mutate(s.id)} disabled={enrollMutation.isPending}>
                  + Enroll
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Student Assignments tab ───────────────────────────────────────────────────
function StudentAssignmentsTab({ classroomId, classroomSlug, studentId, isArchived }: { classroomId: number; classroomSlug: string | number; studentId: number; isArchived: boolean }) {
  const [submitOpen, setSubmitOpen] = useState<number | null>(null);
  const [submissionText, setSubmissionText] = useState("");
  const [, navigate] = useLocation();

  const { data: assignments = [], isLoading: loadingA } = useQuery<ClassroomAssignment[]>({
    queryKey: ["/api/classrooms", classroomId, "assignments"],
    queryFn: () => apiRequest(`/api/classrooms/${classroomId}/assignments`),
  });

  const { data: mySubmissions = [], isLoading: loadingS } = useQuery<ClassroomSubmission[]>({
    queryKey: ["/api/classrooms", classroomId, "my-submissions"],
    queryFn: () => apiRequest(`/api/classrooms/${classroomId}/my-submissions`),
  });

  const [submissionFile, setSubmissionFile] = React.useState<File | null>(null);

  const submitMutation = useMutation({
    mutationFn: (assignmentId: number) => {
      const fd = new FormData();
      fd.append("content", submissionText);
      if (submissionFile) fd.append("file", submissionFile);
      const token = localStorage.getItem("sessionId");
      return fetch(`/api/classrooms/${classroomId}/assignments/${assignmentId}/submit`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      }).then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error ?? "Submission failed");
        return data;
      });
    },
    onSuccess: () => {
      setSubmitOpen(null);
      setSubmissionText("");
      setSubmissionFile(null);
      queryClient.invalidateQueries({ queryKey: ["/api/classrooms", classroomId, "my-submissions"] });
      toast({ title: "Submitted!", type: "success" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, type: "error" }),
  });

  const subMap = Object.fromEntries(mySubmissions.map((s) => [s.assignmentId, s]));
  const totalPoints = assignments.reduce((s, a) => s + a.points, 0);
  const earned = mySubmissions.reduce((s, sub) => s + (sub.grade ?? 0), 0);

  if (loadingA || loadingS) return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-gray-400" /></div>;

  return (
    <div className="space-y-4">
      {totalPoints > 0 && (
        <div className="bg-green-50 border border-green-100 rounded-lg px-4 py-3 flex items-center gap-3">
          <BarChart2 className="h-4 w-4 text-green-600" />
          <span className="text-sm font-medium text-green-800">
            Your total: {earned} / {totalPoints} pts ({Math.round((earned / totalPoints) * 100)}%)
          </span>
        </div>
      )}

      {assignments.length === 0 && <div className="text-center py-12 text-gray-400 text-sm">No assignments yet.</div>}

      {assignments.length > 0 && (
        <div className="overflow-x-auto rounded-lg border">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Assignment</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Due Date</th>
                <th className="text-center px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Points</th>
                <th className="text-center px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="text-center px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Grade</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {assignments.map((a) => {
                const sub = subMap[a.id];
                return (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <button
                        onClick={() => navigate(`/classrooms/${classroomSlug}/classwork/${a.slug ?? a.id}`)}
                        className="font-medium text-gray-800 hover:text-primary text-left transition-colors"
                      >{a.title}</button>
                      {a.description && <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{a.description}</p>}
                      {a.fileUrl && (
                        <a href={a.fileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline mt-1">
                          📎 View assignment file
                        </a>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{a.dueDate}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">{a.points} pts</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge status={sub?.status ?? "pending"} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      {sub?.grade !== null && sub?.grade !== undefined ? (
                        <div>
                          <span className="font-semibold text-green-700">{sub.grade}/{a.points}</span>
                          {sub.feedback && (
                            <p className="text-xs text-gray-400 italic mt-0.5 max-w-[120px] truncate" title={sub.feedback}>"{sub.feedback}"</p>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {(!sub || sub.status === "pending") && !isArchived && (
                        <Dialog
                          open={submitOpen === a.id}
                          onOpenChange={(v) => {
                            setSubmitOpen(v ? a.id : null);
                            if (!v) {
                              setSubmissionText("");
                              setSubmissionFile(null);
                            }
                          }}
                        >
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline" className="text-xs">Submit Work</Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Submit: {a.title}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-3 pt-2">
                              <p className="text-xs text-gray-500">Due {a.dueDate} · {a.points} pts</p>
                              <div>
                                <Label>Your answer or link</Label>
                                <Textarea
                                  placeholder="Write your answer or paste a link…"
                                  value={submissionText}
                                  onChange={(e) => setSubmissionText(e.target.value)}
                                  rows={4}
                                />
                              </div>
                              <div>
                                <Label>Attachment <span className="text-gray-400 font-normal">(optional)</span></Label>
                                <Input type="file" accept="image/*,.pdf,.doc,.docx,.txt" className="mt-1 cursor-pointer" onChange={(e) => setSubmissionFile(e.target.files?.[0] ?? null)} />
                                {submissionFile && <p className="text-xs text-gray-500 mt-1">Selected: {submissionFile.name}</p>}
                              </div>
                              <Button
                                className="w-full"
                                disabled={!submissionText.trim() || submitMutation.isPending}
                                onClick={() => submitMutation.mutate(a.id)}
                              >
                                {submitMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                Submit
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                      {sub && sub.status !== "pending" && (
                        <span className="text-xs text-gray-400">Submitted</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Parent Grades tab ─────────────────────────────────────────────────────────
function ParentGradesTab({ classroomId, studentId }: { classroomId: number; studentId: number }) {
  const { data: assignments = [] } = useQuery<ClassroomAssignment[]>({
    queryKey: ["/api/classrooms", classroomId, "assignments"],
    queryFn: () => apiRequest(`/api/classrooms/${classroomId}/assignments`),
  });
  const { data: submissions = [] } = useQuery<ClassroomSubmission[]>({
    queryKey: ["/api/classrooms", classroomId, "my-submissions", studentId],
    queryFn: () => apiRequest(`/api/classrooms/${classroomId}/my-submissions?studentId=${studentId}`),
  });

  const subMap = Object.fromEntries(submissions.map((s) => [s.assignmentId, s]));
  const totalPoints = assignments.reduce((s, a) => s + a.points, 0);
  const earned = submissions.reduce((s, sub) => s + (sub.grade ?? 0), 0);

  if (assignments.length === 0) return <div className="text-center py-12 text-gray-400 text-sm">No assignments yet.</div>;

  return (
    <div className="space-y-4">
      <div className="bg-green-50 border border-green-100 rounded-lg px-4 py-3 flex items-center gap-3">
        <BarChart2 className="h-4 w-4 text-green-600" />
        <span className="text-sm font-medium text-green-800">Total: {earned} / {totalPoints} pts ({totalPoints > 0 ? Math.round((earned / totalPoints) * 100) : 0}%)</span>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Assignment</th>
              <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Due</th>
              <th className="text-center px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Status</th>
              <th className="text-center px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Grade</th>
              <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Feedback</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {assignments.map((a) => {
              const sub = subMap[a.id];
              return (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium text-gray-800">{a.title}</td>
                  <td className="px-3 py-2 text-gray-500">{a.dueDate}</td>
                  <td className="px-3 py-2 text-center">{sub ? <StatusBadge status={sub.status} /> : <StatusBadge status="pending" />}</td>
                  <td className="px-3 py-2 text-center">
                    {sub?.grade !== null && sub?.grade !== undefined ? (
                      <span className="font-semibold text-green-700">{sub.grade}/{a.points}</span>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-500 italic">{sub?.feedback ?? "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Main ClassroomDetail page ─────────────────────────────────────────────────
export default function ClassroomDetail() {
  const [, params] = useRoute("/classrooms/:slug");
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const slugParam = params?.slug ?? "";

  // Parent: studentId from query string
  const searchParams = new URLSearchParams(window.location.search);
  const parentStudentId = parseInt(searchParams.get("studentId") ?? "0");

  const { data: classroom, isLoading } = useQuery<Classroom>({
    queryKey: ["/api/classrooms", slugParam],
    queryFn: () => apiRequest(`/api/classrooms/${slugParam}`),
    enabled: !!slugParam,
  });

  const classroomId = classroom?.id ?? 0;

  // Student: resolve own studentId
  const { data: studentData } = useQuery<{ id: number }>({
    queryKey: ["/api/students/me"],
    queryFn: () => apiRequest("/api/students/me"),
    enabled: user?.role === "student",
  });

  const archiveMutation = useMutation({
    mutationFn: (status: "active" | "archived") =>
      apiRequest(`/api/classrooms/${classroomId}`, { method: "PATCH", body: JSON.stringify({ status }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/classrooms", slugParam] });
      queryClient.invalidateQueries({ queryKey: ["/api/classrooms"] });
      toast({ title: classroom?.status === "active" ? "Classroom archived" : "Classroom reactivated", type: "success" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, type: "error" }),
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen">
        <ModernSidebar />
        <div className="flex-1 md:ml-[228px] flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  if (!classroom) {
    return (
      <div className="flex min-h-screen">
        <ModernSidebar />
        <div className="flex-1 md:ml-[228px] flex items-center justify-center text-gray-400">Classroom not found.</div>
      </div>
    );
  }

  const isTeacher = user?.role === "teacher" && classroom.teacherId === user.id;
  const isStudent = user?.role === "student";
  const isParent = user?.role === "parent";
  const isArchived = classroom.status === "archived";

  return (
    <div className="flex min-h-screen bg-gray-50">
      <ModernSidebar />
      <div className="flex-1 md:ml-[228px] overflow-auto">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-20 pb-8 md:pt-8 space-y-6">
          {/* Header */}
          <div>
            <button
              onClick={() => navigate("/dashboard#classrooms")}
              className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 mb-4 transition-colors"
            >
              <ChevronLeft className="h-3.5 w-3.5" />Back to Classrooms
            </button>

            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl font-bold text-gray-900">{classroom.name}</h1>
                  {isArchived && (
                    <Badge variant="secondary" className="text-xs">Archived</Badge>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-0.5">{classroom.subject}</p>
                {classroom.description && <p className="text-sm text-gray-600 mt-1">{classroom.description}</p>}
              </div>

              {isTeacher && (
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 gap-1.5"
                  onClick={() => archiveMutation.mutate(isArchived ? "active" : "archived")}
                  disabled={archiveMutation.isPending}
                >
                  {archiveMutation.isPending
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : isArchived
                      ? <><ArchiveRestore className="h-3.5 w-3.5" />Reactivate</>
                      : <><Archive className="h-3.5 w-3.5" />Archive</>
                  }
                </Button>
              )}
            </div>
          </div>

          {/* Tabs — role-adaptive */}
          {isTeacher && (
            <Tabs defaultValue="feed">
              <div className="overflow-x-auto -mx-1 px-1 mb-4">
                <TabsList className="w-max min-w-full">
                  <TabsTrigger value="feed" className="gap-1.5 whitespace-nowrap"><Megaphone className="h-3.5 w-3.5" />Feed</TabsTrigger>
                  <TabsTrigger value="assignments" className="gap-1.5 whitespace-nowrap"><BookOpen className="h-3.5 w-3.5" />Assignments</TabsTrigger>
                  <TabsTrigger value="grades" className="gap-1.5 whitespace-nowrap"><BarChart2 className="h-3.5 w-3.5" />Grades</TabsTrigger>
                  <TabsTrigger value="classwork" className="gap-1.5 whitespace-nowrap"><LibraryBig className="h-3.5 w-3.5" />Classwork</TabsTrigger>
                  <TabsTrigger value="students" className="gap-1.5 whitespace-nowrap"><Users className="h-3.5 w-3.5" />Students</TabsTrigger>
                </TabsList>
              </div>
              <TabsContent value="feed"><FeedTab classroomId={classroomId} isTeacher={true} isArchived={isArchived} /></TabsContent>
              <TabsContent value="assignments"><TeacherAssignmentsTab classroomId={classroomId} classroomSlug={classroom.slug ?? classroom.id} isArchived={isArchived} /></TabsContent>
              <TabsContent value="grades"><TeacherGradesTab classroomId={classroomId} /></TabsContent>
              <TabsContent value="classwork"><ClassworkTab classroomId={classroomId} classroomSlug={classroom.slug ?? classroom.id} isTeacher={true} isArchived={isArchived} /></TabsContent>
              <TabsContent value="students"><StudentsTab classroomId={classroomId} teacherId={classroom.teacherId} isArchived={isArchived} /></TabsContent>
            </Tabs>
          )}

          {isStudent && (
            <Tabs defaultValue="feed">
              <div className="overflow-x-auto -mx-1 px-1 mb-4">
                <TabsList className="w-max min-w-full">
                  <TabsTrigger value="feed" className="gap-1.5 whitespace-nowrap"><Megaphone className="h-3.5 w-3.5" />Feed</TabsTrigger>
                  <TabsTrigger value="assignments" className="gap-1.5 whitespace-nowrap"><BookOpen className="h-3.5 w-3.5" />Assignments</TabsTrigger>
                  <TabsTrigger value="classwork" className="gap-1.5 whitespace-nowrap"><LibraryBig className="h-3.5 w-3.5" />Classwork</TabsTrigger>
                </TabsList>
              </div>
              <TabsContent value="feed"><FeedTab classroomId={classroomId} isTeacher={false} isArchived={isArchived} /></TabsContent>
              <TabsContent value="assignments">
                <StudentAssignmentsTab classroomId={classroomId} classroomSlug={classroom.slug ?? classroom.id} studentId={studentData?.id ?? 0} isArchived={isArchived} />
              </TabsContent>
              <TabsContent value="classwork"><ClassworkTab classroomId={classroomId} classroomSlug={classroom.slug ?? classroom.id} isTeacher={false} isArchived={isArchived} /></TabsContent>
            </Tabs>
          )}

          {isParent && (
            <Tabs defaultValue="feed">
              <div className="overflow-x-auto -mx-1 px-1 mb-4">
                <TabsList className="w-max min-w-full">
                  <TabsTrigger value="feed" className="gap-1.5 whitespace-nowrap"><Megaphone className="h-3.5 w-3.5" />Feed</TabsTrigger>
                  <TabsTrigger value="grades" className="gap-1.5 whitespace-nowrap"><BarChart2 className="h-3.5 w-3.5" />Grades</TabsTrigger>
                </TabsList>
              </div>
              <TabsContent value="feed"><FeedTab classroomId={classroomId} isTeacher={false} isArchived={isArchived} /></TabsContent>
              <TabsContent value="grades"><ParentGradesTab classroomId={classroomId} studentId={parentStudentId} /></TabsContent>
            </Tabs>
          )}
        </div>
      </div>
    </div>
  );
}

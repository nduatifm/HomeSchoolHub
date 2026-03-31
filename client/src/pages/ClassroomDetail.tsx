import { useState } from "react";
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
  Archive,
  ArchiveRestore,
  Send,
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
function TeacherAssignmentsTab({ classroomId, isArchived }: { classroomId: number; isArchived: boolean }) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [gradingId, setGradingId] = useState<number | null>(null);
  const [gradeVal, setGradeVal] = useState("");
  const [feedbackVal, setFeedbackVal] = useState("");
  const [form, setForm] = useState({ title: "", description: "", dueDate: "", points: "100" });

  const { data: assignments = [], isLoading } = useQuery<ClassroomAssignment[]>({
    queryKey: ["/api/classrooms", classroomId, "assignments"],
    queryFn: () => apiRequest(`/api/classrooms/${classroomId}/assignments`),
  });

  const { data: expandedSubs = [], isLoading: loadingSubs } = useQuery<SubmissionWithName[]>({
    queryKey: ["/api/classrooms", classroomId, "assignments", expanded, "submissions"],
    queryFn: () => apiRequest(`/api/classrooms/${classroomId}/assignments/${expanded}/submissions`),
    enabled: expanded !== null,
  });

  const createMutation = useMutation({
    mutationFn: () => apiRequest(`/api/classrooms/${classroomId}/assignments`, {
      method: "POST",
      body: JSON.stringify({ ...form, points: parseInt(form.points) }),
    }),
    onSuccess: () => {
      setOpen(false);
      setForm({ title: "", description: "", dueDate: "", points: "100" });
      queryClient.invalidateQueries({ queryKey: ["/api/classrooms", classroomId, "assignments"] });
      toast({ title: "Assignment created", type: "success" });
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
                <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Due Date</Label><Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></div>
                  <div><Label>Points</Label><Input type="number" min={1} value={form.points} onChange={(e) => setForm({ ...form, points: e.target.value })} /></div>
                </div>
                <Button className="w-full" disabled={!form.title || !form.description || !form.dueDate || createMutation.isPending} onClick={() => createMutation.mutate()}>
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

      {assignments.map((a) => (
        <Card key={a.id} className="overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-base">{a.title}</CardTitle>
                <p className="text-xs text-gray-500 mt-0.5">Due {a.dueDate} · {a.points} pts</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setExpanded(expanded === a.id ? null : a.id)}>
                {expanded === a.id ? "Collapse" : "View Submissions"}
              </Button>
            </div>
            <p className="text-sm text-gray-600">{a.description}</p>
          </CardHeader>

          {expanded === a.id && (
            <CardContent className="pt-0">
              <div className="border-t pt-3 space-y-2">
                {loadingSubs && <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-gray-400" /></div>}
                {expandedSubs.map((sub) => (
                  <div key={sub.id} className="rounded-lg border p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{sub.studentName}</span>
                      <StatusBadge status={sub.status} />
                    </div>
                    {sub.content && <p className="text-sm text-gray-600 bg-gray-50 rounded p-2">{sub.content}</p>}
                    {sub.grade !== null && (
                      <p className="text-xs text-green-700 font-medium">Grade: {sub.grade}/{a.points}</p>
                    )}
                    {sub.feedback && <p className="text-xs text-gray-500 italic">"{sub.feedback}"</p>}
                    {(sub.status === "submitted" || sub.status === "late") && gradingId !== sub.id && (
                      <Button size="sm" variant="outline" onClick={() => { setGradingId(sub.id); setGradeVal(""); setFeedbackVal(""); }}>
                        Grade
                      </Button>
                    )}
                    {gradingId === sub.id && (
                      <div className="space-y-2 border-t pt-2">
                        <div className="flex gap-2">
                          <Input type="number" min={0} max={a.points} placeholder={`0–${a.points}`} value={gradeVal} onChange={(e) => setGradeVal(e.target.value)} className="w-24" />
                          <Input placeholder="Feedback (optional)" value={feedbackVal} onChange={(e) => setFeedbackVal(e.target.value)} />
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" disabled={gradeVal === "" || gradeMutation.isPending} onClick={() => gradeMutation.mutate({ submissionId: sub.id })}>
                            {gradeMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save Grade"}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setGradingId(null)}>Cancel</Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      ))}
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

// ── Materials tab ─────────────────────────────────────────────────────────────
function MaterialsTab({ classroomId, isTeacher, isArchived }: { classroomId: number; isTeacher: boolean; isArchived: boolean }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", url: "" });

  const { data: materials = [], isLoading } = useQuery<ClassroomMaterial[]>({
    queryKey: ["/api/classrooms", classroomId, "materials"],
    queryFn: () => apiRequest(`/api/classrooms/${classroomId}/materials`),
  });

  const addMutation = useMutation({
    mutationFn: () => apiRequest(`/api/classrooms/${classroomId}/materials`, { method: "POST", body: JSON.stringify(form) }),
    onSuccess: () => {
      setOpen(false);
      setForm({ title: "", description: "", url: "" });
      queryClient.invalidateQueries({ queryKey: ["/api/classrooms", classroomId, "materials"] });
      toast({ title: "Material added", type: "success" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, type: "error" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/classrooms/${classroomId}/materials/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/classrooms", classroomId, "materials"] });
      toast({ title: "Removed", type: "success" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, type: "error" }),
  });

  return (
    <div className="space-y-4">
      {isTeacher && !isArchived && (
        <div className="flex justify-end">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5"><Plus className="h-3.5 w-3.5" />Add Resource</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Study Resource</DialogTitle></DialogHeader>
              <div className="space-y-3 pt-2">
                <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
                <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} /></div>
                <div><Label>URL</Label><Input type="url" placeholder="https://…" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} /></div>
                <Button className="w-full" disabled={!form.title || !form.url || addMutation.isPending} onClick={() => addMutation.mutate()}>
                  {addMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Add Resource
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {isLoading && <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-gray-400" /></div>}
      {!isLoading && materials.length === 0 && <div className="text-center py-12 text-gray-400 text-sm">No materials yet.</div>}

      <div className="space-y-3">
        {materials.map((m) => (
          <Card key={m.id}>
            <CardContent className="pt-4 flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <a href={m.url} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline flex items-center gap-1.5 text-sm">
                  {m.title}<ExternalLink className="h-3 w-3 shrink-0" />
                </a>
                {m.description && <p className="text-xs text-gray-500 mt-0.5">{m.description}</p>}
                <p className="text-xs text-gray-400 mt-1">{new Date(m.uploadedAt).toLocaleDateString()}</p>
              </div>
              {isTeacher && (
                <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-600 shrink-0" onClick={() => deleteMutation.mutate(m.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ── Members tab ───────────────────────────────────────────────────────────────
function MembersTab({ classroomId, teacherId, isArchived }: { classroomId: number; teacherId: number; isArchived: boolean }) {
  const { data: enrollments = [], isLoading } = useQuery<EnrollmentWithStudent[]>({
    queryKey: ["/api/classrooms", classroomId, "enrollments"],
    queryFn: () => apiRequest(`/api/classrooms/${classroomId}/enrollments`),
  });
  const { data: myStudents = [] } = useQuery<(Student & { email?: string })[]>({
    queryKey: ["/api/students"],
  });
  const { data: assignments = [] } = useQuery<ClassroomAssignment[]>({
    queryKey: ["/api/classrooms", classroomId, "assignments"],
    queryFn: () => apiRequest(`/api/classrooms/${classroomId}/assignments`),
  });

  const enrolledIds = new Set(enrollments.map((e) => e.studentId));
  const unenrolledStudents = myStudents.filter((s) => !enrolledIds.has(s.id));
  const totalPoints = assignments.reduce((s, a) => s + a.points, 0);

  // Per-student submission data (for grade summary) — useQueries avoids hooks-in-map
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
      {!isArchived && unenrolledStudents.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Add Students</CardTitle></CardHeader>
          <CardContent className="pt-0 space-y-2">
            {unenrolledStudents.map((s) => (
              <div key={s.id} className="flex items-center justify-between py-1">
                <span className="text-sm text-gray-700">{s.name}</span>
                <Button size="sm" variant="outline" onClick={() => enrollMutation.mutate(s.id)} disabled={enrollMutation.isPending}>
                  + Enroll
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {isLoading && <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-gray-400" /></div>}
      {!isLoading && enrollments.length === 0 && <div className="text-center py-12 text-gray-400 text-sm">No students enrolled yet.</div>}

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
    </div>
  );
}

// ── Student Assignments tab ───────────────────────────────────────────────────
function StudentAssignmentsTab({ classroomId, studentId, isArchived }: { classroomId: number; studentId: number; isArchived: boolean }) {
  const [submitting, setSubmitting] = useState<number | null>(null);
  const [submissionText, setSubmissionText] = useState("");

  const { data: assignments = [], isLoading: loadingA } = useQuery<ClassroomAssignment[]>({
    queryKey: ["/api/classrooms", classroomId, "assignments"],
    queryFn: () => apiRequest(`/api/classrooms/${classroomId}/assignments`),
  });

  const { data: mySubmissions = [], isLoading: loadingS } = useQuery<ClassroomSubmission[]>({
    queryKey: ["/api/classrooms", classroomId, "my-submissions"],
    queryFn: () => apiRequest(`/api/classrooms/${classroomId}/my-submissions`),
  });

  const submitMutation = useMutation({
    mutationFn: (assignmentId: number) =>
      apiRequest(`/api/classrooms/${classroomId}/assignments/${assignmentId}/submit`, {
        method: "POST",
        body: JSON.stringify({ content: submissionText }),
      }),
    onSuccess: () => {
      setSubmitting(null);
      setSubmissionText("");
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
          <span className="text-sm font-medium text-green-800">Your total: {earned} / {totalPoints} pts ({Math.round((earned / totalPoints) * 100)}%)</span>
        </div>
      )}

      {assignments.length === 0 && <div className="text-center py-12 text-gray-400 text-sm">No assignments yet.</div>}

      {assignments.map((a) => {
        const sub = subMap[a.id];
        return (
          <Card key={a.id}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-base">{a.title}</CardTitle>
                {sub && <StatusBadge status={sub.status} />}
              </div>
              <p className="text-xs text-gray-500">Due {a.dueDate} · {a.points} pts</p>
              <p className="text-sm text-gray-600">{a.description}</p>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              {sub?.grade !== null && sub?.grade !== undefined && (
                <div className="bg-green-50 rounded-lg p-3 space-y-1">
                  <p className="text-sm font-semibold text-green-800">Grade: {sub.grade} / {a.points}</p>
                  {sub.feedback && <p className="text-sm text-green-700 italic">"{sub.feedback}"</p>}
                </div>
              )}
              {sub?.content && sub.status !== "pending" && (
                <div className="bg-gray-50 rounded p-2 text-sm text-gray-600">
                  <span className="text-xs font-medium text-gray-400 block mb-1">Your submission:</span>
                  {sub.content}
                </div>
              )}
              {(!sub || sub.status === "pending") && !isArchived && (
                submitting === a.id ? (
                  <div className="space-y-2">
                    <Textarea placeholder="Write your answer or paste a link…" value={submissionText} onChange={(e) => setSubmissionText(e.target.value)} rows={3} />
                    <div className="flex gap-2">
                      <Button size="sm" disabled={!submissionText.trim() || submitMutation.isPending} onClick={() => submitMutation.mutate(a.id)}>
                        {submitMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Submit"}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => { setSubmitting(null); setSubmissionText(""); }}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => setSubmitting(a.id)}>Submit Work</Button>
                )
              )}
            </CardContent>
          </Card>
        );
      })}
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
  const [, params] = useRoute("/classrooms/:id");
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const classroomId = parseInt(params?.id ?? "0");

  // Parent: studentId from query string
  const searchParams = new URLSearchParams(window.location.search);
  const parentStudentId = parseInt(searchParams.get("studentId") ?? "0");

  const { data: classroom, isLoading } = useQuery<Classroom>({
    queryKey: ["/api/classrooms", classroomId],
    queryFn: () => apiRequest(`/api/classrooms/${classroomId}`),
    enabled: !!classroomId,
  });

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
      queryClient.invalidateQueries({ queryKey: ["/api/classrooms", classroomId] });
      queryClient.invalidateQueries({ queryKey: ["/api/classrooms"] });
      toast({ title: classroom?.status === "active" ? "Classroom archived" : "Classroom reactivated", type: "success" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, type: "error" }),
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen">
        <ModernSidebar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  if (!classroom) {
    return (
      <div className="flex min-h-screen">
        <ModernSidebar />
        <div className="flex-1 flex items-center justify-center text-gray-400">Classroom not found.</div>
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
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
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
              <TabsList className="mb-4">
                <TabsTrigger value="feed" className="gap-1.5"><Megaphone className="h-3.5 w-3.5" />Feed</TabsTrigger>
                <TabsTrigger value="assignments" className="gap-1.5"><BookOpen className="h-3.5 w-3.5" />Assignments</TabsTrigger>
                <TabsTrigger value="grades" className="gap-1.5"><BarChart2 className="h-3.5 w-3.5" />Grades</TabsTrigger>
                <TabsTrigger value="materials" className="gap-1.5"><LibraryBig className="h-3.5 w-3.5" />Materials</TabsTrigger>
                <TabsTrigger value="members" className="gap-1.5"><Users className="h-3.5 w-3.5" />Members</TabsTrigger>
              </TabsList>
              <TabsContent value="feed"><FeedTab classroomId={classroomId} isTeacher={true} isArchived={isArchived} /></TabsContent>
              <TabsContent value="assignments"><TeacherAssignmentsTab classroomId={classroomId} isArchived={isArchived} /></TabsContent>
              <TabsContent value="grades"><TeacherGradesTab classroomId={classroomId} /></TabsContent>
              <TabsContent value="materials"><MaterialsTab classroomId={classroomId} isTeacher={true} isArchived={isArchived} /></TabsContent>
              <TabsContent value="members"><MembersTab classroomId={classroomId} teacherId={classroom.teacherId} isArchived={isArchived} /></TabsContent>
            </Tabs>
          )}

          {isStudent && (
            <Tabs defaultValue="feed">
              <TabsList className="mb-4">
                <TabsTrigger value="feed" className="gap-1.5"><Megaphone className="h-3.5 w-3.5" />Feed</TabsTrigger>
                <TabsTrigger value="assignments" className="gap-1.5"><BookOpen className="h-3.5 w-3.5" />Assignments</TabsTrigger>
                <TabsTrigger value="materials" className="gap-1.5"><LibraryBig className="h-3.5 w-3.5" />Materials</TabsTrigger>
              </TabsList>
              <TabsContent value="feed"><FeedTab classroomId={classroomId} isTeacher={false} isArchived={isArchived} /></TabsContent>
              <TabsContent value="assignments">
                <StudentAssignmentsTab classroomId={classroomId} studentId={studentData?.id ?? 0} isArchived={isArchived} />
              </TabsContent>
              <TabsContent value="materials"><MaterialsTab classroomId={classroomId} isTeacher={false} isArchived={isArchived} /></TabsContent>
            </Tabs>
          )}

          {isParent && (
            <Tabs defaultValue="feed">
              <TabsList className="mb-4">
                <TabsTrigger value="feed" className="gap-1.5"><Megaphone className="h-3.5 w-3.5" />Feed</TabsTrigger>
                <TabsTrigger value="grades" className="gap-1.5"><BarChart2 className="h-3.5 w-3.5" />Grades</TabsTrigger>
              </TabsList>
              <TabsContent value="feed"><FeedTab classroomId={classroomId} isTeacher={false} isArchived={isArchived} /></TabsContent>
              <TabsContent value="grades"><ParentGradesTab classroomId={classroomId} studentId={parentStudentId} /></TabsContent>
            </Tabs>
          )}
        </div>
      </div>
    </div>
  );
}

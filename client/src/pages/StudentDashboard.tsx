import { useState } from "react";
import { useParams, useLocation } from "wouter";
import MessageThread from "@/components/MessageThread";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueries, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  MessageSquare,
  School,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ModernSidebar from "@/components/ModernSidebar";
import ClassroomCard from "@/components/ClassroomCard";
import type { Assignment, StudentAssignment, Session, Classroom, ClassroomAssignment, ClassroomSubmission } from "@shared/schema";

type AssignmentWithStatus = Assignment & {
  studentAssignment: StudentAssignment | null;
};

type ClassworkItem = {
  id: number;
  title: string;
  slug: string;
  classroomName: string;
  classroomSlug: string;
  dueDate: string;
  status: "pending" | "submitted" | "graded" | "late";
};

function formatPreviewTime(ts: string): string {
  const date = new Date(ts);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

const STUDENT_TABS = ["classrooms", "feedback", "messages"];

export default function StudentDashboard() {
  const { user, student, logout } = useAuth();
  const { toast } = useToast();
  const params = useParams<{ tab?: string }>();
  const [, navigate] = useLocation();
  const activeTab = STUDENT_TABS.includes(params.tab ?? "") ? params.tab! : "classrooms";
  const setActiveTab = (tab: string) => navigate("/dashboard/" + tab);

  const [submitDialogAssignmentId, setSubmitDialogAssignmentId] = useState<number | null>(null);

  const { data: assignments = [], isLoading: assignmentsLoading } = useQuery<AssignmentWithStatus[]>({
    queryKey: ["/api/assignments/student", student?.id],
    enabled: !!student,
  });
  const { data: materials = [] } = useQuery({
    queryKey: ["/api/materials/student", student?.id],
    enabled: !!student,
  });
  type AssignedTeacher = { id: number; name: string; email: string };
  const { data: assignedTeacher = null } = useQuery<AssignedTeacher | null>({
    queryKey: ["/api/teachers/student", student?.id],
    enabled: !!student,
  });
  type ConversationSummary = {
    studentId: number;
    teacherUserId: number;
    studentName: string;
    teacherName: string;
    parentName: string | null;
    lastMessage: string | null;
    lastMessageTimestamp: string | null;
    unreadCount: number;
    customName: string | null;
  };

  const { data: conversationSummaries = [] } = useQuery<ConversationSummary[]>({
    queryKey: ["/api/messages/conversations"],
    enabled: !!student,
    staleTime: 30000,
  });
  const teacherSummary = conversationSummaries[0] ?? null;

  const { data: feedback = [] } = useQuery({
    queryKey: ["/api/feedback/student", student?.id],
    enabled: !!student,
  });

  const { data: classrooms = [] } = useQuery<Classroom[]>({ queryKey: ["/api/classrooms"] });

  const classroomAssignmentQueries = useQueries({
    queries: classrooms.map(c => ({
      queryKey: ["/api/classrooms", c.id, "assignments"],
      queryFn: () => apiRequest(`/api/classrooms/${c.id}/assignments`),
      enabled: classrooms.length > 0,
    })),
  });

  const classroomSubmissionQueries = useQueries({
    queries: classrooms.map(c => ({
      queryKey: ["/api/classrooms", c.id, "my-submissions"],
      queryFn: () => apiRequest(`/api/classrooms/${c.id}/my-submissions`),
      enabled: classrooms.length > 0,
    })),
  });

  const pendingClassworkItems: ClassworkItem[] = classrooms.flatMap((c, i) => {
    const cwAssignments: ClassroomAssignment[] = (classroomAssignmentQueries[i]?.data as ClassroomAssignment[]) ?? [];
    const cwSubmissions: ClassroomSubmission[] = (classroomSubmissionQueries[i]?.data as ClassroomSubmission[]) ?? [];
    return cwAssignments
      .map(a => {
        const sub = cwSubmissions.find(s => s.assignmentId === a.id);
        const status = sub?.status ?? "pending";
        return {
          id: a.id,
          title: a.title,
          slug: a.slug ?? String(a.id),
          classroomName: c.name,
          classroomSlug: c.slug ?? String(c.id),
          dueDate: a.dueDate,
          status,
        };
      })
      .filter(item => item.status === "pending");
  }).sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  const [submissionForm, setSubmissionForm] = useState({
    assignmentId: 0,
    studentAssignmentId: 0,
    submission: "",
    notes: "",
    hasStudentAssignment: false,
  });
  const [submissionFile, setSubmissionFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitAssignmentMutation = useMutation({
    mutationFn: async ({
      assignmentId,
      studentAssignmentId,
      submission,
      notes,
      hasStudentAssignment,
      file,
    }: {
      assignmentId: number;
      studentAssignmentId: number;
      submission: string;
      notes: string;
      hasStudentAssignment: boolean;
      file: File | null;
    }) => {
      setIsSubmitting(true);
      const formData = new FormData();
      formData.append("submission", submission);
      if (notes) formData.append("notes", notes);
      if (file) formData.append("file", file);

      if (hasStudentAssignment) {
        const response = await fetch(
          `/api/student-assignments/${studentAssignmentId}/submit`,
          {
            method: "PATCH",
            headers: { Authorization: `Bearer ${localStorage.getItem("sessionId")}` },
            body: formData,
          },
        );
        if (!response.ok) throw new Error("Failed to submit");
        return response.json();
      } else {
        formData.append("studentId", String(student?.id));
        const response = await fetch(
          `/api/assignments/${assignmentId}/submit`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${localStorage.getItem("sessionId")}` },
            body: formData,
          },
        );
        if (!response.ok) throw new Error("Failed to submit");
        return response.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assignments/student", student?.id] });
      toast({ title: "Assignment submitted!", type: "success" });
      setSubmissionForm({ assignmentId: 0, studentAssignmentId: 0, submission: "", notes: "", hasStudentAssignment: false });
      setSubmissionFile(null);
      setSubmitDialogAssignmentId(null);
      setIsSubmitting(false);
    },
    onError: () => {
      setIsSubmitting(false);
      toast({ title: "Failed to submit assignment", description: "Please try again" });
    },
  });

  const pendingAssignments = assignments.filter(
    (a) => a.studentAssignment?.status === "pending" || !a.studentAssignment,
  );
  const gradedAssignments = assignments.filter(
    (a) => a.studentAssignment?.status === "graded",
  );

  type PendingTask = {
    key: string;
    title: string;
    subtitle: string;
    dueDate: string;
    type: "classwork" | "legacy";
    classroomSlug?: string;
    assignmentSlug?: string;
    assignmentId?: number;
    studentAssignmentId?: number;
    hasStudentAssignment?: boolean;
  };

  const allPendingItems: PendingTask[] = [
    ...pendingClassworkItems.map(a => ({
      key: `cw-${a.id}`,
      title: a.title,
      subtitle: a.classroomName,
      dueDate: a.dueDate,
      type: "classwork" as const,
      classroomSlug: a.classroomSlug,
      assignmentSlug: a.slug,
    })),
    ...pendingAssignments.map(a => ({
      key: `legacy-${a.id}`,
      title: a.title,
      subtitle: a.subject,
      dueDate: a.dueDate,
      type: "legacy" as const,
      assignmentId: a.id,
      studentAssignmentId: a.studentAssignment?.id ?? 0,
      hasStudentAssignment: !!a.studentAssignment,
    })),
  ].sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  const isHomeTab = activeTab === "classrooms";

  return (
    <div className="min-h-screen bg-background">
      <ModernSidebar />

      <div className="md:ml-[228px] flex">
        <main className="flex-1 p-4 sm:p-6 pt-20 md:pt-6">

          {/* GREETING — Change 5: date replaced with task count nudge */}
          {(() => {
            const hour = new Date().getHours();
            const g = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
            const firstName = user?.name?.split(" ")[0] || "there";
            return (
              <div className="mb-5">
                <h1 className="text-xl font-semibold text-foreground">{g}, {firstName} 👋</h1>
                <p className="text-sm text-muted-foreground">
                  {allPendingItems.length > 0
                    ? `You have ${allPendingItems.length} thing${allPendingItems.length === 1 ? "" : "s"} to do today.`
                    : "Nothing due today — you're ahead of the game!"}
                </p>
              </div>
            );
          })()}

          {/* Only show home content when on classrooms/home tab */}
          {isHomeTab && (
            <>
              {/* Change 2: Hero banner — solid primary, one CTA */}
              {pendingClassworkItems[0] ? (
                <div className="mb-6 rounded-2xl bg-primary p-6 text-primary-foreground flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium opacity-80 mb-1">Up next</p>
                    <h2 className="text-xl font-bold leading-snug">{pendingClassworkItems[0].title}</h2>
                    <p className="text-sm opacity-70 mt-0.5">{pendingClassworkItems[0].classroomName}</p>
                  </div>
                  <Button
                    size="lg"
                    variant="secondary"
                    className="h-12 px-8 text-base font-semibold shrink-0 w-full sm:w-auto"
                    onClick={() => {
                      window.location.href = `/classrooms/${pendingClassworkItems[0].classroomSlug}/classwork/${pendingClassworkItems[0].slug}`;
                    }}
                  >
                    Start →
                  </Button>
                </div>
              ) : (
                <div className="mb-6 rounded-2xl bg-green-50 border border-green-200 p-6 text-center">
                  <p className="text-2xl mb-1">🎉</p>
                  <p className="font-semibold text-green-800">You're all caught up!</p>
                  <p className="text-sm text-green-600 mt-0.5">Nothing due right now. Great work.</p>
                </div>
              )}

              {/* Today's Tasks — kid-friendly tappable cards */}
              <div className="mb-6">
                <h2 className="text-base font-semibold text-foreground mb-3">Today's Tasks</h2>
                {allPendingItems.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border p-6 text-center">
                    <p className="text-sm text-muted-foreground">You're all caught up 🎉</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {allPendingItems.slice(0, 5).map((task, index) => {
                      const isOverdue = new Date(task.dueDate) < new Date();
                      const taskEmojis = ["📖", "✏️", "🔬", "🎨", "🧮"];
                      const accentColors = [
                        "border-l-violet-400",
                        "border-l-sky-400",
                        "border-l-emerald-400",
                        "border-l-amber-400",
                        "border-l-pink-400",
                      ];
                      const bgHovers = [
                        "hover:bg-violet-50/60",
                        "hover:bg-sky-50/60",
                        "hover:bg-emerald-50/60",
                        "hover:bg-amber-50/60",
                        "hover:bg-pink-50/60",
                      ];
                      const emoji = taskEmojis[index % taskEmojis.length];
                      const accent = accentColors[index % accentColors.length];
                      const bgHover = bgHovers[index % bgHovers.length];
                      return (
                        <button
                          key={task.key}
                          className={`w-full text-left flex items-center gap-4 p-4 rounded-2xl border border-border border-l-4 ${accent} ${bgHover} bg-card transition-all duration-150 active:scale-[0.985] cursor-pointer group`}
                          onClick={() => {
                            if (task.type === "classwork") {
                              window.location.href = `/classrooms/${task.classroomSlug}/classwork/${task.assignmentSlug}`;
                            } else {
                              setSubmitDialogAssignmentId(task.assignmentId!);
                              setSubmissionForm({
                                assignmentId: task.assignmentId!,
                                studentAssignmentId: task.studentAssignmentId!,
                                submission: "",
                                notes: "",
                                hasStudentAssignment: task.hasStudentAssignment!,
                              });
                            }
                          }}
                        >
                          <span className="text-2xl select-none shrink-0 leading-none">{emoji}</span>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-foreground truncate leading-snug">{task.title}</p>
                            <p className={`text-xs mt-0.5 ${isOverdue ? "text-red-500 font-semibold" : "text-muted-foreground"}`}>
                              {task.subtitle}{isOverdue ? " · Overdue" : ` · Due ${task.dueDate}`}
                            </p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0 group-hover:text-muted-foreground transition-colors" />
                        </button>
                      );
                    })}
                    {allPendingItems.length > 5 && (
                      <p className="text-xs text-muted-foreground text-center pt-1">
                        +{allPendingItems.length - 5} more tasks
                      </p>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Change 4: Tab content rendered conditionally, no Tabs wrapper */}

          {activeTab === "feedback" && (
            <Card>
              <CardHeader>
                <CardTitle>Feedback</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {feedback.map((f: any) => (
                    <div
                      key={f.id}
                      className="p-4 border rounded-lg"
                      data-testid={`card-feedback-${f.id}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium" data-testid={`text-feedback-message-${f.id}`}>
                            {f.message}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {new Date(f.date).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge variant={f.type === "positive" ? "default" : "secondary"}>
                          {f.type}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === "classrooms" && (
            <div>
              <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
                <School className="h-4 w-4 text-primary" /> All Classes
              </h2>
              {classrooms.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground text-sm rounded-2xl border border-dashed border-border">
                  You have not been enrolled in any classrooms yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {classrooms.map(c => (
                    <ClassroomCard
                      key={c.id}
                      classroom={c}
                      href={`/classrooms/${c.slug ?? c.id}`}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "messages" && (
            <div className="overflow-hidden bg-background">
              <div className="flex flex-col md:flex-row h-auto md:h-screen">
                {/* Left conversation sidebar */}
                <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-border/40 flex flex-col shrink-0 max-h-48 md:max-h-none">
                  <div className="px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Conversations</p>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    {!assignedTeacher ? (
                      <div className="flex flex-col items-center justify-center h-full px-4 py-8 text-center gap-2">
                        <MessageSquare className="w-7 h-7 text-muted-foreground/30" />
                        <p className="text-xs text-muted-foreground">No teacher assigned yet</p>
                      </div>
                    ) : (
                      <button
                        className="w-full flex items-center gap-3 px-3 py-3 text-left transition-colors"
                        style={{ background: "hsl(var(--primary) / 0.1)", borderLeft: "3px solid hsl(var(--primary))" }}
                      >
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <span className="text-xs font-bold text-primary">
                            {assignedTeacher.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-0.5">
                            <p className="text-sm font-medium truncate text-foreground">
                              {teacherSummary?.customName ?? assignedTeacher.name}
                            </p>
                            {teacherSummary?.lastMessageTimestamp && (
                              <span className="text-[11px] text-muted-foreground shrink-0">
                                {formatPreviewTime(teacherSummary.lastMessageTimestamp)}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {teacherSummary?.lastMessage
                              ? teacherSummary.lastMessage.length > 42
                                ? teacherSummary.lastMessage.slice(0, 42) + "…"
                                : teacherSummary.lastMessage
                              : "No messages yet"}
                          </p>
                        </div>
                      </button>
                    )}
                  </div>
                </div>

                {/* Right thread panel */}
                <div className="flex-1 min-w-0 flex flex-col min-h-[360px] md:min-h-0">
                  {assignedTeacher ? (
                    <MessageThread
                      teacherId={assignedTeacher.id}
                      studentId={student!.id}
                      myUserId={user!.id}
                      title={`Thread: ${assignedTeacher.name}`}
                      customName={teacherSummary?.customName ?? null}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
                      <MessageSquare className="w-10 h-10 opacity-20" />
                      <p className="text-sm">Your teacher thread will appear here once assigned</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Submit assignment dialog */}
          <Dialog open={submitDialogAssignmentId !== null} onOpenChange={(open) => { if (!open) setSubmitDialogAssignmentId(null); }}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Submit Assignment</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Textarea
                  placeholder="Your answer or response..."
                  value={submissionForm.submission}
                  onChange={(e) => setSubmissionForm({ ...submissionForm, submission: e.target.value })}
                  rows={5}
                />
                <Textarea
                  placeholder="Notes for your teacher (optional)"
                  value={submissionForm.notes}
                  onChange={(e) => setSubmissionForm({ ...submissionForm, notes: e.target.value })}
                  rows={2}
                />
                <div>
                  <label className="text-sm font-medium block mb-1">Attach file (optional)</label>
                  <input
                    type="file"
                    onChange={(e) => setSubmissionFile(e.target.files?.[0] ?? null)}
                    className="text-sm"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setSubmitDialogAssignmentId(null)}>Cancel</Button>
                <Button
                  disabled={!submissionForm.submission || isSubmitting}
                  onClick={() => submitAssignmentMutation.mutate({ ...submissionForm, file: submissionFile })}
                >
                  {isSubmitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Submitting...</> : "Submit"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

        </main>
      </div>
    </div>
  );
}
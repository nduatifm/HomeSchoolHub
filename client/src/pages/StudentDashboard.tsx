import { useState, useEffect } from "react";
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
  const [activeTab, setActiveTab] = useState(() => {
    const hash = window.location.hash.replace("#", "");
    return STUDENT_TABS.includes(hash) ? hash : "classrooms";
  });

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace("#", "");
      if (hash && STUDENT_TABS.includes(hash)) setActiveTab(hash);
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

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

          {activeTab === "classrooms" && (() => {
            type SubjectTheme = {
              bg: string;
              banner: React.ReactNode;
              pill: string;
              pillText: string;
            };

            function getSubjectTheme(subject: string): SubjectTheme {
              const s = (subject || "").toLowerCase();

              if (/math|algebra|geometry|calculus|arithmetic|number/.test(s)) return {
                bg: "bg-violet-50",
                pill: "bg-violet-100 text-violet-700",
                pillText: "text-violet-700",
                banner: (
                  <svg viewBox="0 0 320 100" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                    <rect width="320" height="100" fill="#ede9fe"/>
                    <text x="26" y="62" fontSize="48" fill="#c4b5fd" fontFamily="serif" opacity="0.7">∑</text>
                    <text x="90" y="52" fontSize="36" fill="#a78bfa" fontFamily="serif" opacity="0.6">π</text>
                    <text x="148" y="68" fontSize="28" fill="#c4b5fd" fontFamily="monospace" opacity="0.7">x²</text>
                    <text x="198" y="48" fontSize="38" fill="#a78bfa" fontFamily="serif" opacity="0.5">∫</text>
                    <text x="248" y="66" fontSize="26" fill="#c4b5fd" fontFamily="monospace" opacity="0.6">÷</text>
                    <text x="280" y="44" fontSize="32" fill="#a78bfa" fontFamily="monospace" opacity="0.4">√</text>
                    <circle cx="72" cy="22" r="5" fill="#ddd6fe" opacity="0.6"/>
                    <circle cx="180" cy="18" r="4" fill="#c4b5fd" opacity="0.5"/>
                    <circle cx="290" cy="80" r="6" fill="#ddd6fe" opacity="0.5"/>
                  </svg>
                ),
              };

              if (/science|biology|chemistry|physics|lab|nature|earth/.test(s)) return {
                bg: "bg-emerald-50",
                pill: "bg-emerald-100 text-emerald-700",
                pillText: "text-emerald-700",
                banner: (
                  <svg viewBox="0 0 320 100" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                    <rect width="320" height="100" fill="#ecfdf5"/>
                    {/* Flask */}
                    <path d="M60 20 L60 52 L42 80 L78 80 Z" fill="none" stroke="#6ee7b7" strokeWidth="3" strokeLinejoin="round"/>
                    <path d="M50 62 L70 62 L78 80 L42 80 Z" fill="#a7f3d0" opacity="0.7"/>
                    <line x1="54" y1="20" x2="66" y2="20" stroke="#6ee7b7" strokeWidth="2.5"/>
                    {/* DNA helix suggestion */}
                    <path d="M130 15 Q150 35 130 55 Q110 75 130 95" fill="none" stroke="#6ee7b7" strokeWidth="2.5" opacity="0.7"/>
                    <path d="M155 15 Q135 35 155 55 Q175 75 155 95" fill="none" stroke="#a7f3d0" strokeWidth="2.5" opacity="0.6"/>
                    <line x1="130" y1="35" x2="155" y2="35" stroke="#34d399" strokeWidth="1.5" opacity="0.5"/>
                    <line x1="130" y1="55" x2="155" y2="55" stroke="#34d399" strokeWidth="1.5" opacity="0.5"/>
                    {/* Atom */}
                    <circle cx="240" cy="50" r="6" fill="#6ee7b7"/>
                    <ellipse cx="240" cy="50" rx="28" ry="10" fill="none" stroke="#a7f3d0" strokeWidth="2" opacity="0.7"/>
                    <ellipse cx="240" cy="50" rx="28" ry="10" fill="none" stroke="#6ee7b7" strokeWidth="2" opacity="0.6" transform="rotate(60 240 50)"/>
                    <ellipse cx="240" cy="50" rx="28" ry="10" fill="none" stroke="#a7f3d0" strokeWidth="2" opacity="0.5" transform="rotate(120 240 50)"/>
                    {/* Stars */}
                    <circle cx="295" cy="20" r="3" fill="#d1fae5" opacity="0.7"/>
                    <circle cx="305" cy="75" r="4" fill="#a7f3d0" opacity="0.5"/>
                  </svg>
                ),
              };

              if (/art|draw|paint|music|creative|design|craft/.test(s)) return {
                bg: "bg-pink-50",
                pill: "bg-pink-100 text-pink-700",
                pillText: "text-pink-700",
                banner: (
                  <svg viewBox="0 0 320 100" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                    <rect width="320" height="100" fill="#fdf2f8"/>
                    {/* Palette */}
                    <ellipse cx="70" cy="52" rx="36" ry="28" fill="#fbcfe8" opacity="0.8"/>
                    <circle cx="52" cy="38" r="7" fill="#f9a8d4"/>
                    <circle cx="72" cy="30" r="7" fill="#c4b5fd"/>
                    <circle cx="92" cy="38" r="7" fill="#6ee7b7"/>
                    <circle cx="96" cy="58" r="7" fill="#fde68a"/>
                    <circle cx="64" cy="68" r="5" fill="#fff" opacity="0.9"/>
                    {/* Brush */}
                    <line x1="100" y1="75" x2="148" y2="28" stroke="#f9a8d4" strokeWidth="4" strokeLinecap="round"/>
                    <ellipse cx="148" cy="26" rx="5" ry="8" fill="#f472b6" transform="rotate(-45 148 26)"/>
                    {/* Stars / sparkles */}
                    <text x="175" y="45" fontSize="28" fill="#f9a8d4" opacity="0.7">✦</text>
                    <text x="218" y="72" fontSize="20" fill="#c4b5fd" opacity="0.6">✦</text>
                    <text x="255" y="38" fontSize="16" fill="#fbcfe8" opacity="0.8">✦</text>
                    {/* Color swatches */}
                    <rect x="268" y="50" width="14" height="14" rx="3" fill="#f9a8d4" opacity="0.7"/>
                    <rect x="286" y="50" width="14" height="14" rx="3" fill="#c4b5fd" opacity="0.7"/>
                    <rect x="268" y="68" width="14" height="14" rx="3" fill="#6ee7b7" opacity="0.7"/>
                    <rect x="286" y="68" width="14" height="14" rx="3" fill="#fde68a" opacity="0.7"/>
                  </svg>
                ),
              };

              if (/history|social|civics|geography|world|culture/.test(s)) return {
                bg: "bg-amber-50",
                pill: "bg-amber-100 text-amber-700",
                pillText: "text-amber-700",
                banner: (
                  <svg viewBox="0 0 320 100" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                    <rect width="320" height="100" fill="#fffbeb"/>
                    {/* Globe */}
                    <circle cx="65" cy="50" r="32" fill="none" stroke="#fcd34d" strokeWidth="2.5"/>
                    <ellipse cx="65" cy="50" rx="16" ry="32" fill="none" stroke="#fde68a" strokeWidth="2" opacity="0.8"/>
                    <line x1="33" y1="50" x2="97" y2="50" stroke="#fcd34d" strokeWidth="1.5" opacity="0.7"/>
                    <line x1="38" y1="32" x2="92" y2="32" stroke="#fde68a" strokeWidth="1.5" opacity="0.6"/>
                    <line x1="38" y1="68" x2="92" y2="68" stroke="#fde68a" strokeWidth="1.5" opacity="0.6"/>
                    {/* Scroll */}
                    <rect x="128" y="28" width="60" height="44" rx="4" fill="#fde68a" opacity="0.7"/>
                    <rect x="122" y="28" width="8" height="44" rx="4" fill="#fcd34d" opacity="0.8"/>
                    <rect x="188" y="28" width="8" height="44" rx="4" fill="#fcd34d" opacity="0.8"/>
                    <line x1="138" y1="42" x2="178" y2="42" stroke="#f59e0b" strokeWidth="1.5" opacity="0.6"/>
                    <line x1="138" y1="52" x2="178" y2="52" stroke="#f59e0b" strokeWidth="1.5" opacity="0.6"/>
                    <line x1="138" y1="62" x2="165" y2="62" stroke="#f59e0b" strokeWidth="1.5" opacity="0.5"/>
                    {/* Stars */}
                    <text x="220" y="42" fontSize="26" fill="#fcd34d" opacity="0.7">★</text>
                    <text x="258" y="68" fontSize="18" fill="#fde68a" opacity="0.6">★</text>
                    <text x="285" y="38" fontSize="14" fill="#fcd34d" opacity="0.5">★</text>
                  </svg>
                ),
              };

              if (/english|writing|reading|language|lit|grammar|spelling|phonics/.test(s)) return {
                bg: "bg-sky-50",
                pill: "bg-sky-100 text-sky-700",
                pillText: "text-sky-700",
                banner: (
                  <svg viewBox="0 0 320 100" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                    <rect width="320" height="100" fill="#f0f9ff"/>
                    {/* Open book */}
                    <path d="M40 70 L40 28 Q65 22 80 35 L80 70 Q65 60 40 70Z" fill="#bae6fd" opacity="0.8"/>
                    <path d="M80 35 Q95 22 120 28 L120 70 Q95 60 80 70 L80 35Z" fill="#7dd3fc" opacity="0.7"/>
                    <line x1="80" y1="35" x2="80" y2="70" stroke="#38bdf8" strokeWidth="1.5"/>
                    {/* Lines on pages */}
                    <line x1="50" y1="44" x2="73" y2="41" stroke="#38bdf8" strokeWidth="1.5" opacity="0.5"/>
                    <line x1="50" y1="52" x2="73" y2="50" stroke="#38bdf8" strokeWidth="1.5" opacity="0.5"/>
                    <line x1="50" y1="60" x2="73" y2="59" stroke="#38bdf8" strokeWidth="1.5" opacity="0.4"/>
                    <line x1="87" y1="41" x2="110" y2="44" stroke="#0ea5e9" strokeWidth="1.5" opacity="0.5"/>
                    <line x1="87" y1="50" x2="110" y2="52" stroke="#0ea5e9" strokeWidth="1.5" opacity="0.5"/>
                    <line x1="87" y1="59" x2="105" y2="60" stroke="#0ea5e9" strokeWidth="1.5" opacity="0.4"/>
                    {/* Floating letters */}
                    <text x="148" y="55" fontSize="38" fill="#7dd3fc" fontFamily="Georgia, serif" opacity="0.7">Aa</text>
                    <text x="220" y="42" fontSize="24" fill="#bae6fd" fontFamily="Georgia, serif" opacity="0.6">Bb</text>
                    <text x="262" y="68" fontSize="20" fill="#7dd3fc" fontFamily="Georgia, serif" opacity="0.5">Cc</text>
                    <text x="290" y="32" fontSize="16" fill="#bae6fd" fontFamily="Georgia, serif" opacity="0.5">Dd</text>
                  </svg>
                ),
              };

              // Default / generic
              return {
                bg: "bg-slate-50",
                pill: "bg-slate-100 text-slate-600",
                pillText: "text-slate-600",
                banner: (
                  <svg viewBox="0 0 320 100" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                    <rect width="320" height="100" fill="#f8fafc"/>
                    <circle cx="60" cy="50" r="28" fill="none" stroke="#cbd5e1" strokeWidth="2.5" strokeDasharray="6 4"/>
                    <circle cx="160" cy="50" r="22" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="2"/>
                    <circle cx="250" cy="50" r="18" fill="none" stroke="#e2e8f0" strokeWidth="2" strokeDasharray="4 3"/>
                    <text x="148" y="56" fontSize="18" fill="#94a3b8" textAnchor="middle" fontFamily="sans-serif">✦</text>
                  </svg>
                ),
              };
            }

            return (
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
                    {classrooms.map(c => {
                      const theme = getSubjectTheme(c.subject || "");
                      return (
                        <button
                          key={c.id}
                          className={`text-left rounded-2xl border border-border overflow-hidden flex flex-col cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 active:scale-[0.985] ${theme.bg} group w-full`}
                          onClick={() => { window.location.href = `/classrooms/${c.slug ?? c.id}`; }}
                        >
                          {/* Illustrated banner */}
                          <div className="w-full h-24 shrink-0 overflow-hidden">
                            {theme.banner}
                          </div>

                          {/* Card body */}
                          <div className="px-4 py-3 flex flex-col gap-1 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="font-bold text-sm text-foreground leading-snug">{c.name}</h3>
                              {c.status === "archived" && (
                                <span className="text-[10px] bg-white/70 text-muted-foreground px-1.5 py-0.5 rounded shrink-0 border border-border">Archived</span>
                              )}
                            </div>
                            <span className={`text-xs font-semibold ${theme.pillText}`}>{c.subject}</span>
                            {c.description && (
                              <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{c.description}</p>
                            )}
                            <div className="mt-auto pt-3 flex items-center justify-between">
                              <span className="text-xs font-semibold text-primary group-hover:underline">Go to Class</span>
                              <ChevronRight className="h-3.5 w-3.5 text-primary opacity-60 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}

          {activeTab === "messages" && (
            <Card className="overflow-hidden">
              <div className="flex flex-col md:flex-row h-auto md:h-[620px]">
                {/* Left conversation sidebar */}
                <div className="w-full md:w-72 border-b md:border-b-0 md:border-r flex flex-col shrink-0 bg-muted/20 max-h-48 md:max-h-none">
                  <div className="px-4 py-3 border-b bg-background">
                    <p className="text-sm font-semibold text-foreground">Conversations</p>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    {!assignedTeacher ? (
                      <div className="flex flex-col items-center justify-center h-full px-4 py-8 text-center gap-2">
                        <MessageSquare className="w-7 h-7 text-muted-foreground/30" />
                        <p className="text-xs text-muted-foreground">No teacher assigned yet</p>
                      </div>
                    ) : (
                      <button
                        className="w-full flex items-center gap-3 px-3 py-3 text-left transition-colors border-b border-border/30"
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
            </Card>
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
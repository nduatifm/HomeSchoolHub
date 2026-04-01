import { useState, useEffect } from "react";
import MessageThread from "@/components/MessageThread";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText,
  Award,
  BookOpen,
  Calendar,
  LogOut,
  Trophy,
  MessageSquare,
  Send,
  ClipboardCheck,
  CheckCircle,
  Video,
  Star,
  Flame,
  LibraryBig,
  Presentation,
  MessageSquareQuote,
  Upload,
  X,
  School,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ModernSidebar from "@/components/ModernSidebar";
import ColorfulStatCard from "@/components/ColorfulStatCard";
import type { Assignment, StudentAssignment, Session, Classroom } from "@shared/schema";

type AssignmentWithStatus = Assignment & {
  studentAssignment: StudentAssignment | null;
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

function computeStreak(graded: AssignmentWithStatus[]): number {
  const dates = graded
    .filter(a => a.studentAssignment?.submittedAt)
    .map(a => a.studentAssignment!.submittedAt!.split("T")[0])
    .sort()
    .reverse();
  if (dates.length === 0) return 0;
  const uniqueDates = Array.from(new Set(dates));
  let streak = 0;
  for (let i = 0; i < uniqueDates.length; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const expected = d.toISOString().split("T")[0];
    if (uniqueDates[i] === expected) streak++;
    else break;
  }
  return streak;
}

const STUDENT_TABS = ["classrooms", "feedback", "messages"];

export default function StudentDashboard() {
  const { user, student, logout } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState(() => {
    const hash = window.location.hash.replace("#", "");
    return STUDENT_TABS.includes(hash) ? hash : "classrooms";
  });

  // Listen to hash changes from sidebar navigation
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace("#", "");
      if (hash && STUDENT_TABS.includes(hash)) setActiveTab(hash);
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  // Dialog state
  const [submitDialogAssignmentId, setSubmitDialogAssignmentId] = useState<
    number | null
  >(null);
  const [requestClarificationOpen, setRequestClarificationOpen] =
    useState(false);
  // Fetch data
  const { data: assignments = [] } = useQuery<AssignmentWithStatus[]>({
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
  const sessionsQuery = useQuery<Session[]>({
    queryKey: ["/api/sessions/student", student?.id],
    enabled: !!student,
  });
  const scheduleQuery = useQuery({
    queryKey: ["/api/schedules/student", student?.id],
    enabled: !!student,
  });
  const { data: clarifications = [] } = useQuery({
    queryKey: ["/api/clarifications/student", student?.id],
    enabled: !!student,
  });
  const attendanceQuery = useQuery({
    queryKey: ["/api/attendance/student", student?.id],
    enabled: !!student,
  });
  const { data: classrooms = [] } = useQuery<Classroom[]>({ queryKey: ["/api/classrooms"] });

  const sessions = sessionsQuery.data || [];
  const schedule = scheduleQuery.data || [];
  const attendance = attendanceQuery.data || [];

  // Submit assignment
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
            headers: {
              Authorization: `Bearer ${localStorage.getItem("sessionId")}`,
            },
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
            headers: {
              Authorization: `Bearer ${localStorage.getItem("sessionId")}`,
            },
            body: formData,
          },
        );
        if (!response.ok) throw new Error("Failed to submit");
        return response.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/assignments/student", student?.id],
      });
      toast({ title: "Assignment submitted!", type: "success" });
      setSubmissionForm({
        assignmentId: 0,
        studentAssignmentId: 0,
        submission: "",
        notes: "",
        hasStudentAssignment: false,
      });
      setSubmissionFile(null);
      setSubmitDialogAssignmentId(null);
      setIsSubmitting(false);
    },
    onError: () => {
      setIsSubmitting(false);
      toast({
        title: "Failed to submit assignment",
        description: "Please try again",
      });
    },
  });

  // Request clarification
  const [clarificationForm, setClarificationForm] = useState({
    assignmentId: 0,
    question: "",
  });

  const requestClarificationMutation = useMutation({
    mutationFn: (data: any) =>
      apiRequest("/api/clarifications", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/clarifications/student", student?.id],
      });
      toast({ title: "Clarification requested!", type: "success" });
      setClarificationForm({ assignmentId: 0, question: "" });
      setRequestClarificationOpen(false);
    },
  });

  const pendingAssignments = assignments.filter(
    (a) => a.studentAssignment?.status === "pending" || !a.studentAssignment,
  );
  const submittedAssignments = assignments.filter(
    (a) => a.studentAssignment?.status === "submitted",
  );
  const gradedAssignments = assignments.filter(
    (a) => a.studentAssignment?.status === "graded",
  );
  const streak = computeStreak(gradedAssignments);

  return (
    <div className="min-h-screen bg-background">
      <ModernSidebar />

      <div className="md:ml-[228px] flex">
        <main className="flex-1 p-4 sm:p-6 pt-20 md:pt-6">

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 my-6">
            <ColorfulStatCard
              title="Completed"
              value={gradedAssignments.length}
              icon={CheckCircle}
              accent="green"
              subtitle={`${assignments.length} total assignments`}
            />
            <ColorfulStatCard
              title="Points Earned"
              value={student?.points || 0}
              icon={Trophy}
              accent="amber"
              subtitle="Keep learning!"
            />
            <ColorfulStatCard
              title="Day Streak"
              value={streak}
              icon={Flame}
              accent="purple"
              subtitle={streak === 1 ? "day in a row" : "days in a row"}
            />
            <ColorfulStatCard
              title="Pending"
              value={pendingAssignments.length}
              icon={BookOpen}
              accent="rose"
              subtitle="Need to submit"
            />
          </div>


          <Tabs value={activeTab} onValueChange={setActiveTab}>
            {/* <TabsList className="mb-4">
              <TabsTrigger value="assignments" data-testid="tab-assignments">
                Assignments
              </TabsTrigger>
              <TabsTrigger value="materials" data-testid="tab-materials">
                Study Materials
              </TabsTrigger>
              <TabsTrigger value="feedback" data-testid="tab-feedback">
                Feedback & Grades
              </TabsTrigger>
              <TabsTrigger value="schedule" data-testid="tab-schedule">
                Schedule
              </TabsTrigger>
              <TabsTrigger value="attendance" data-testid="tab-attendance">
                Attendance
              </TabsTrigger>
              <TabsTrigger value="sessions" data-testid="tab-sessions">
                Sessions
              </TabsTrigger>
              <TabsTrigger value="rewards" data-testid="tab-rewards">
                Rewards
              </TabsTrigger>
              <TabsTrigger
                value="clarifications"
                data-testid="tab-clarifications"
              >
                Ask Questions
              </TabsTrigger>
              <TabsTrigger value="messages" data-testid="tab-messages">
                Messages
              </TabsTrigger>
            </TabsList> */}

            <TabsContent value="feedback">
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
                            <p
                              className="font-medium"
                              data-testid={`text-feedback-message-${f.id}`}
                            >
                              {f.message}
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">
                              {new Date(f.date).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge
                            variant={
                              f.type === "positive" ? "default" : "secondary"
                            }
                          >
                            {f.type}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

{/*
            <TabsContent value="schedule">
              <Card>
                <CardHeader>
                  <CardTitle>My Schedule</CardTitle>
                </CardHeader>
                <CardContent>
                  {scheduleQuery.isLoading ? (
                    <div className="text-center py-8">Loading schedule...</div>
                  ) : scheduleQuery.isError ? (
                    <div className="text-center py-8 text-red-500">
                      Error loading schedule
                    </div>
                  ) : schedule.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No schedule items yet
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Day</TableHead>
                          <TableHead>Subject</TableHead>
                          <TableHead>Time</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {schedule.map((s: any) => (
                          <TableRow
                            key={s.id}
                            data-testid={`row-schedule-${s.id}`}
                          >
                            <TableCell>{s.dayOfWeek}</TableCell>
                            <TableCell>{s.subject}</TableCell>
                            <TableCell>
                              {s.startTime} - {s.endTime}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}

                  <div className="mt-6">
                    <h3 className="font-medium mb-4">Upcoming Sessions</h3>
                    {sessionsQuery.isLoading ? (
                      <div className="text-center py-8">
                        Loading sessions...
                      </div>
                    ) : sessionsQuery.isError ? (
                      <div className="text-center py-8 text-red-500">
                        Error loading sessions
                      </div>
                    ) : sessions.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">
                        No sessions yet
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {sessions.map((s: any) => (
                          <div
                            key={s.id}
                            className="p-4 border rounded-lg"
                            data-testid={`card-session-${s.id}`}
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-medium">{s.subject}</p>
                                <p className="text-sm text-muted-foreground">
                                  {new Date(s.date).toLocaleDateString()} at{" "}
                                  {s.startTime}
                                </p>
                              </div>
                              <Badge>{s.status}</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
*/}

{/*
            <TabsContent value="attendance">
              <Card>
                <CardHeader>
                  <CardTitle>My Attendance</CardTitle>
                </CardHeader>
                <CardContent>
                  {attendanceQuery.isLoading ? (
                    <div className="text-center py-8">
                      Loading attendance...
                    </div>
                  ) : attendanceQuery.isError ? (
                    <div className="text-center py-8 text-red-500">
                      Error loading attendance
                    </div>
                  ) : attendance.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No attendance records yet
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Notes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {attendance.map((a: any) => (
                          <TableRow
                            key={a.id}
                            data-testid={`row-attendance-${a.id}`}
                          >
                            <TableCell
                              data-testid={`text-attendance-date-${a.id}`}
                            >
                              {new Date(a.date).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  a.status === "present"
                                    ? "default"
                                    : a.status === "late"
                                      ? "secondary"
                                      : "destructive"
                                }
                                data-testid={`badge-attendance-status-${a.id}`}
                              >
                                {a.status}
                              </Badge>
                            </TableCell>
                            <TableCell
                              data-testid={`text-attendance-notes-${a.id}`}
                            >
                              {a.notes || "-"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
*/}

{/*
            <TabsContent value="sessions">
              <Card>
                <CardHeader>
                  <CardTitle>Tutoring Sessions</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>Scheduled By</TableHead>
                        <TableHead>Meeting Link</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sessions.map((s: any) => (
                        <TableRow
                          key={s.id}
                          data-testid={`row-session-${s.id}`}
                        >
                          <TableCell data-testid={`text-session-name-${s.id}`}>
                            {s.title}
                          </TableCell>
                          <TableCell>{s.description}</TableCell>
                          <TableCell>{s.subject}</TableCell>
                          <TableCell>
                            {new Date(s.sessionDate).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            {s.startTime} - {s.endTime}
                          </TableCell>
                          <TableCell>{s.teacherName}</TableCell>
                          <TableCell>
                            <a
                              href={s.meetingUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                              data-testid={`link-session-meeting-${s.id}`}
                            >
                              Join Session
                            </a>
                          </TableCell>
                          <TableCell>{s.notes || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
*/}

{/*
            <TabsContent value="rewards">
              <Card>
                <CardHeader>
                  <CardTitle>My Rewards & Achievements</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-center">
                            <Trophy className="h-12 w-12 text-yellow-500 mx-auto mb-2" />
                            <p className="text-sm text-muted-foreground">
                              Total Points
                            </p>
                            <p
                              className="text-4xl font-bold text-yellow-600"
                              data-testid="text-total-points"
                            >
                              {student?.points || 0}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-center">
                            <Award className="h-12 w-12 text-purple-500 mx-auto mb-2" />
                            <p className="text-sm text-muted-foreground">
                              Total Badges
                            </p>
                            <p
                              className="text-4xl font-bold text-purple-600"
                              data-testid="text-total-badges"
                            >
                              {student?.badges?.length || 0}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold mb-4">My Badges</h3>
                      {!student?.badges || student.badges.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">
                          No badges earned yet. Keep working hard!
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {student.badges.map(
                            (badge: string, index: number) => (
                              <Badge
                                key={index}
                                variant="outline"
                                className="text-lg py-2 px-4"
                                data-testid={`badge-reward-${index}`}
                              >
                                <Star className="h-4 w-4 mr-2 fill-yellow-400 text-yellow-400" />
                                {badge}
                              </Badge>
                            ),
                          )}
                        </div>
                      )}
                    </div>

                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg">
                      <h3 className="text-lg font-semibold mb-2">
                        Keep Going!
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Complete assignments, attend sessions, and participate
                        actively to earn more points and badges!
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
*/}

            {/* <TabsContent value="clarifications">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Ask Questions</CardTitle>
                  <Dialog
                    open={requestClarificationOpen}
                    onOpenChange={setRequestClarificationOpen}
                  >
                    <DialogTrigger asChild>
                      <Button data-testid="button-ask-question">
                        Ask Question
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Request Clarification</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium">
                            Select Assignment
                          </label>
                          <select
                            className="w-full mt-1 p-2 border rounded-md"
                            value={clarificationForm.assignmentId}
                            onChange={(e) =>
                              setClarificationForm({
                                ...clarificationForm,
                                assignmentId: parseInt(e.target.value),
                              })
                            }
                            data-testid="select-assignment"
                          >
                            <option value={0}>Select an assignment</option>
                            {assignments.map((a: any) => (
                              <option key={a.id} value={a.id}>
                                {a.title}
                              </option>
                            ))}
                          </select>
                        </div>
                        <Textarea
                          placeholder="What would you like to ask?"
                          value={clarificationForm.question}
                          onChange={(e) =>
                            setClarificationForm({
                              ...clarificationForm,
                              question: e.target.value,
                            })
                          }
                          data-testid="input-question"
                        />
                        <Button
                          onClick={() =>
                            requestClarificationMutation.mutate(
                              clarificationForm,
                            )
                          }
                          disabled={
                            !clarificationForm.assignmentId ||
                            requestClarificationMutation.isPending
                          }
                          className="w-full"
                          data-testid="button-submit-question"
                        >
                          {requestClarificationMutation.isPending
                            ? "Sending..."
                            : "Send Question"}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {clarifications.map((c: any) => (
                      <div
                        key={c.id}
                        className="p-4 border rounded-lg"
                        data-testid={`card-clarification-${c.id}`}
                      >
                        <div className="space-y-2">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">
                              Your Question:
                            </p>
                            <p
                              className="text-sm"
                              data-testid={`text-question-${c.id}`}
                            >
                              {c.question}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Asked:{" "}
                              {new Date(c.askedDate).toLocaleDateString()}
                            </p>
                          </div>
                          {c.answer ? (
                            <div className="bg-blue-50 p-3 rounded">
                              <p className="text-sm font-medium text-blue-900">
                                Teacher's Answer:
                              </p>
                              <p
                                className="text-sm text-blue-800"
                                data-testid={`text-answer-${c.id}`}
                              >
                                {c.answer}
                              </p>
                            </div>
                          ) : (
                            <Badge variant="secondary">Pending</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent> */}

            <TabsContent value="classrooms">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><School className="h-5 w-5 text-primary" />My Classrooms</CardTitle>
                </CardHeader>
                <CardContent>
                  {classrooms.length === 0 ? (
                    <div className="text-center py-10 text-gray-400 text-sm">You have not been enrolled in any classrooms yet.</div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {classrooms.map(c => (
                        <div key={c.id} className="rounded-lg border p-4 flex flex-col gap-2 hover:border-primary/40 transition-colors cursor-pointer" onClick={() => { window.location.href = `/classrooms/${c.id}`; }}>
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-semibold text-sm text-gray-900 leading-tight">{c.name}</h3>
                            {c.status === "archived" && <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded shrink-0">Archived</span>}
                          </div>
                          <p className="text-xs text-primary font-medium">{c.subject}</p>
                          {c.description && <p className="text-xs text-gray-400 line-clamp-2">{c.description}</p>}
                          <div className="mt-auto pt-2">
                            <Button size="sm" variant="outline" className="w-full gap-1.5 text-xs" onClick={e => { e.stopPropagation(); window.location.href = `/classrooms/${c.id}`; }}>
                              View Classroom <ChevronRight className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="messages">
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
                              <p className="text-sm font-medium truncate text-foreground">{teacherSummary?.customName ?? assignedTeacher.name}</p>
                              {teacherSummary?.lastMessageTimestamp && (
                                <span className="text-[11px] text-muted-foreground shrink-0">
                                  {formatPreviewTime(teacherSummary.lastMessageTimestamp)}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate">
                              {teacherSummary?.lastMessage
                                ? teacherSummary.lastMessage.length > 42 ? teacherSummary.lastMessage.slice(0, 42) + "…" : teacherSummary.lastMessage
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
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}

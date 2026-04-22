import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import MessageThread from "@/components/MessageThread";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  queryClient,
  apiRequest,
} from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import {
  BookOpen,
  Users,
  Calendar,
  DollarSign,
  FileText,
  LogOut,
  MessageSquare,
  Send,
  BarChart,
  Download,
  Edit,
  Trash2,
  Clock,
  Star,
  Presentation,
  Upload,
  Link,
  Eye,
  School,
  Plus,
  Loader2,
  Paperclip,
  ExternalLink,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import ModernSidebar from "@/components/ModernSidebar";
import ModernCombobox from "@/components/ModernCombobox";
import ClassroomCard from "@/components/ClassroomCard";
import type { ClassroomNotification } from "@/lib/classroomNotifications";
import type {
  StudentAssignment,
  Student,
  Earnings,
  TutorRequest,
  EnrichedTutorRequest,
  User,
  Classroom,
} from "@shared/schema";

type StudentWithParent = Student & {
  email?: string;
  parentName?: string;
  parentId?: number;
  classrooms?: { id: number; name: string }[];
};

type FeedbackWithStudent = {
  id: number;
  teacherId: number;
  studentId: number;
  sessionId?: number | null;
  type: string;
  content: string;
  createdAt?: string | null;
  studentName: string;
};

type PublicUser = Pick<User, "id" | "name" | "email" | "role" | "profilePicture">;

type StudentSubmissionWithRelations = StudentAssignment & {
  student?: { id: number; name: string };
  assignment?: { id: number; title: string; subject: string; fileUrl?: string | null };
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

const feedbackSchema = z.object({
  studentId: z.number().min(1, "Student required"),
  message: z.string().min(1, "Message required"),
  type: z.string().min(1, "Type required"),
});

const TEACHER_TABS = ["classrooms", "students", "requests", "feedback", "messages"];

function TeacherClassroomsTab() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", subject: "", description: "" });
  const { data: classrooms = [], isLoading } = useQuery<Classroom[]>({ queryKey: ["/api/classrooms"] });
  const { data: classroomStats = {} as Record<number, { toGradeCount: number }> } = useQuery<Record<number, { toGradeCount: number }>>({
    queryKey: ["/api/teacher/classroom-stats"],
  });
  const createMutation = useMutation({
    mutationFn: () => apiRequest("/api/classrooms", { method: "POST", body: JSON.stringify(form) }),
    onSuccess: () => {
      setOpen(false);
      setForm({ name: "", subject: "", description: "" });
      queryClient.invalidateQueries({ queryKey: ["/api/classrooms"] });
      queryClient.invalidateQueries({ queryKey: ["/api/teacher/classroom-stats"] });
      toast({ title: "Classroom created!", type: "success" });
    },
    onError: () => toast({ title: "Couldn't create classroom — try again.", type: "error" }),
  });
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <School className="h-5 w-5 text-primary" />Classrooms
        </CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" />New Classroom</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Classroom</DialogTitle></DialogHeader>
            <div className="space-y-3 pt-2">
              <div><p className="text-sm font-medium mb-1">Name</p><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Algebra II - Period 3" /></div>
              <div><p className="text-sm font-medium mb-1">Subject</p><Input value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} placeholder="e.g. Mathematics" /></div>
              <div><p className="text-sm font-medium mb-1">Description (optional)</p><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} placeholder="Brief description…" /></div>
              <Button className="w-full" disabled={!form.name || !form.subject || createMutation.isPending} onClick={() => createMutation.mutate()}>
                {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Create Classroom
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading && <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-gray-400" /></div>}
        {!isLoading && classrooms.length === 0 && (
          <div className="text-center py-10 text-gray-400 text-sm">No classrooms yet. Create your first classroom to get started.</div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {classrooms.map(c => {
            const stats = classroomStats[c.id];
            const teacherNotif: ClassroomNotification | null = stats && stats.toGradeCount > 0
              ? { pendingCount: stats.toGradeCount, newMaterialsCount: 0, newPostsCount: 0, newCount: 0, dueCount: 0, dueSoonCount: 0, total: stats.toGradeCount }
              : null;
            return (
              <ClassroomCard
                key={c.id}
                classroom={c}
                href={`/classrooms/${c.slug ?? c.id}`}
                ctaLabel="Open Classroom"
                notification={teacherNotif}
              />
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Grade-submission dialog (isolated so typing doesn't re-render parent) ─────
function TeacherGradeDialog({
  open,
  submission,
  onClose,
}: {
  open: boolean;
  submission: StudentSubmissionWithRelations | null;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [grade, setGrade] = useState("");
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    if (submission) {
      setGrade(submission.grade?.toString() ?? "");
      setFeedback(submission.feedback ?? "");
    }
  }, [submission?.id]);

  const mutation = useMutation({
    mutationFn: () =>
      apiRequest(`/api/student-assignments/${submission!.id}/grade`, {
        method: "PATCH",
        body: JSON.stringify({ grade: parseInt(grade), feedback }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/student-submissions/teacher"] });
      toast({ title: "Assignment graded!", type: "success" });
      onClose();
    },
    onError: (error: any) => {
      toast({ title: "Couldn't save the grade — try again.", type: "error" });
    },
  });

  const handleSave = () => {
    const gradeNum = parseInt(grade);
    if (isNaN(gradeNum) || gradeNum < 0 || gradeNum > 100) {
      toast({ title: "Grade must be between 0 and 100.", type: "warning" });
      return;
    }
    mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{submission?.assignment?.title ?? "Grade Submission"}</DialogTitle>
          {submission && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {submission.student?.name ?? "Student"}
              {submission.status === "late" && (
                <span className="ml-2 text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">Late</span>
              )}
            </p>
          )}
        </DialogHeader>
        {submission && (
          <div className="space-y-4 pt-1">
            {submission.submission ? (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Student Answer</p>
                <div className="rounded-lg border border-border bg-muted/30 px-3.5 py-3 text-sm text-foreground whitespace-pre-wrap leading-relaxed max-h-56 overflow-y-auto">
                  {submission.submission}
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">No text answer submitted.</p>
            )}
            {submission.fileUrl && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Submitted File</p>
                <a href={submission.fileUrl} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline font-medium">
                  <Paperclip className="h-4 w-4" />View submission file<ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            )}
            <div className="border-t border-border pt-4 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Grade Submission</p>
              <div className="flex gap-3 items-start">
                <div className="w-28 shrink-0">
                  <label className="text-xs font-medium text-foreground block mb-1">Score (0–100)</label>
                  <Input type="number" min={0} max={100} placeholder="0–100" value={grade}
                    onChange={(e) => setGrade(e.target.value)} className="h-8 text-sm" />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-medium text-foreground block mb-1">
                    Feedback <span className="font-normal text-muted-foreground">(optional)</span>
                  </label>
                  <Textarea placeholder="Leave feedback for the student…" value={feedback}
                    onChange={(e) => setFeedback(e.target.value)} rows={3} className="text-sm resize-none" />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
                <Button size="sm" disabled={grade === "" || mutation.isPending} onClick={handleSave}>
                  {mutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
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

// ── Give-feedback dialog (isolated so typing doesn't re-render parent) ─────
function TeacherGiveFeedbackDialog({
  open,
  onClose,
  students,
}: {
  open: boolean;
  onClose: () => void;
  students: any[];
}) {
  const { toast } = useToast();
  const form = useForm({
    resolver: zodResolver(feedbackSchema),
    defaultValues: { studentId: 0, message: "", type: "general" },
  });
  const mutation = useMutation({
    mutationFn: (data: any) =>
      apiRequest("/api/feedback", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/feedback/teacher"] });
      toast({ title: "Feedback sent!", type: "success" });
      form.reset();
      onClose();
    },
    onError: () => toast({ title: "Couldn't send feedback — try again.", type: "error" }),
  });
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Give Student Feedback</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((data) => mutation.mutate(data))}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="studentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Student</FormLabel>
                  <FormControl>
                    <Select
                      onValueChange={(v) => field.onChange(parseInt(v))}
                      value={field.value ? field.value.toString() : ""}
                    >
                      <SelectTrigger data-testid="select-feedback-student">
                        <SelectValue placeholder="Select a student" />
                      </SelectTrigger>
                      <SelectContent>
                        {students.map((s: any) => (
                          <SelectItem key={s.id} value={s.id.toString()}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Feedback Type</FormLabel>
                  <FormControl>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger data-testid="select-feedback-type">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="positive">Positive</SelectItem>
                        <SelectItem value="constructive">Constructive</SelectItem>
                        <SelectItem value="general">General</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Message</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter your feedback..."
                      rows={4}
                      {...field}
                      data-testid="input-feedback-message"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              disabled={mutation.isPending}
              className="w-full"
              data-testid="button-submit-feedback"
            >
              {mutation.isPending ? "Sending..." : "Send Feedback"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ── Send-message dialog (isolated so typing doesn't re-render parent) ──────
function TeacherSendMessageDialog({
  open,
  onClose,
  users,
  initialReceiverId,
  initialReceiverName,
}: {
  open: boolean;
  onClose: () => void;
  users: any[];
  initialReceiverId?: number;
  initialReceiverName?: string;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    receiverId: 0,
    receiverName: "",
    content: "",
  });

  useEffect(() => {
    if (open) {
      setForm({
        receiverId: initialReceiverId ?? 0,
        receiverName: initialReceiverName ?? "",
        content: "",
      });
    }
  }, [open, initialReceiverId, initialReceiverName]);

  const mutation = useMutation({
    mutationFn: (data: any) =>
      apiRequest("/api/messages", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages/conversations"] });
      toast({ title: "Message sent!", type: "success" });
      onClose();
    },
    onError: () => toast({ title: "Couldn't send message — try again.", type: "error" }),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send Message</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">To</label>
            {form.receiverId ? (
              <div className="flex items-center gap-2 px-3 py-2 rounded-md border bg-muted/40 text-sm">
                <span className="font-medium">
                  {form.receiverName || users.find((u) => u.id === form.receiverId)?.name || "Unknown user"}
                </span>
                <span className="text-xs text-muted-foreground ml-auto">
                  {users.find((u) => u.id === form.receiverId)?.email}
                </span>
              </div>
            ) : (
              <ModernCombobox
                users={users}
                selectedUserId={form.receiverId}
                onSelect={(userId) => setForm({ ...form, receiverId: userId })}
                placeholder="Search users..."
                testId="select-receiver-teacher"
              />
            )}
          </div>
          <div>
            <label className="text-sm font-medium">Message</label>
            <Textarea
              placeholder="Type your message..."
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              rows={4}
              data-testid="input-message-content"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={() => mutation.mutate(form)}
              disabled={mutation.isPending || !form.receiverId || !form.content}
              data-testid="button-send-message"
            >
              <Send className="w-4 h-4 mr-2" />
              {mutation.isPending ? "Sending..." : "Send"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function TeacherDashboard() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const params = useParams<{ tab?: string }>();
  const [, navigate] = useLocation();
  const activeTab = TEACHER_TABS.includes(params.tab ?? "") ? params.tab! : "classrooms";
  const setActiveTab = (tab: string) => navigate("/dashboard/" + tab);

  const [sendMessageOpen, setSendMessageOpen] = useState(false);
  const [giveFeedbackOpen, setGiveFeedbackOpen] = useState(false);

  // Check if tutor request mode is enabled (for showing/hiding tutor request UI)
  const { data: tutorRequestModeData } = useQuery<{ enabled: boolean }>({
    queryKey: ["/api/system-settings/tutor-request-mode"],
  });
  const isTutorRequestModeEnabled = tutorRequestModeData?.enabled ?? false;

  // Fetch data
  const { data: students = [] } = useQuery<StudentWithParent[]>({
    queryKey: ["/api/students/teacher"],
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
    staleTime: 30000,
  });

  const { data: tutorRequests = [] } = useQuery<EnrichedTutorRequest[]>({
    queryKey: ["/api/tutor-requests/teacher"],
  });
  const { data: earnings = [] } = useQuery<Earnings[]>({
    queryKey: ["/api/earnings/teacher"],
  });
  const { data: users = [] } = useQuery<PublicUser[]>({ queryKey: ["/api/users"] });
  const feedbacksQuery = useQuery<FeedbackWithStudent[]>({ queryKey: ["/api/feedback/teacher"] });
  const { data: classrooms = [] } = useQuery<Classroom[]>({ queryKey: ["/api/classrooms"] });

  const feedbacks = feedbacksQuery.data || [];

  // Fetch student submissions for grading
  const { data: studentSubmissions = [] } =
    useQuery<StudentSubmissionWithRelations[]>({
      queryKey: ["/api/student-submissions/teacher"],
    });

  // Grading state — only open/submission pointer; form state lives in TeacherGradeDialog
  const [gradeDialogOpen, setGradeDialogOpen] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<StudentSubmissionWithRelations | null>(null);

  const handleOpenGradeDialog = (submission: StudentSubmissionWithRelations) => {
    setSelectedSubmission(submission);
    setGradeDialogOpen(true);
  };

  // Approve tutor request
  const approveTutorRequestMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      apiRequest(`/api/tutor-requests/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/tutor-requests/teacher"],
      });
      toast({ title: "Request updated!", type: "success" });
    },
  });


  // Messages tab — selected student for thread view (auto-select first on load)
  const [selectedStudentForMessages, setSelectedStudentForMessages] = useState<StudentWithParent | null>(null);

  useEffect(() => {
    if (students.length > 0 && !selectedStudentForMessages) {
      setSelectedStudentForMessages(students[0]);
    }
  }, [students]);

  // Send message — state lives in TeacherSendMessageDialog; parent only tracks receiver for pre-fill
  const [sendMessageReceiverId, setSendMessageReceiverId] = useState(0);
  const [sendMessageReceiverName, setSendMessageReceiverName] = useState("");

  const totalEarnings = earnings.reduce(
    (sum: number, e: any) => sum + e.amount,
    0,
  );

  return (
    <div className="min-h-screen bg-background">
      <ModernSidebar />

      <div className="md:ml-[228px]">
        <main className="p-4 sm:p-5 pt-18 md:pt-5 max-w-4xl mx-auto">

          {(() => {
            const hour = new Date().getHours();
            const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
            const firstName = user?.name?.split(" ")[0] || "there";
            const dateLabel = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
            return (
              <>
                <div className="mb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <h1 className="text-xl font-semibold text-foreground">{greeting}, {firstName} 👋</h1>
                    <p className="text-sm text-muted-foreground">{dateLabel}</p>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full w-fit">
                    <DollarSign className="w-3.5 h-3.5 text-green-600" />
                    <span className="font-semibold text-green-700">${totalEarnings.toLocaleString()}</span>
                    <span>total earnings</span>
                  </div>
                </div>
              </>
            );
          })()}


          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsContent value="students">
              <Card>
                <CardHeader>
                  <CardTitle>Students</CardTitle>
                </CardHeader>
                <CardContent>
                  {students.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8 text-sm">
                      No students linked yet. Students join via a tutor request from their parent.
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Grade</TableHead>
                          <TableHead>Parent</TableHead>
                          <TableHead>Classrooms</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {students.map((s: any) => (
                          <TableRow key={s.id} data-testid={`row-student-${s.id}`}>
                            <TableCell data-testid={`text-student-name-${s.id}`}>
                              <div>
                                <p className="font-medium">{s.name}</p>
                                {s.email && <p className="text-xs text-muted-foreground">{s.email}</p>}
                              </div>
                            </TableCell>
                            <TableCell>{s.gradeLevel || <span className="text-muted-foreground/50">—</span>}</TableCell>
                            <TableCell>
                              {s.parentName ? (
                                <span className="text-sm text-muted-foreground">{s.parentName}</span>
                              ) : (
                                <span className="text-xs text-muted-foreground/50 italic">Unknown</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {s.classrooms && s.classrooms.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {s.classrooms.map((c: { id: number; name: string; slug?: string | null }) => (
                                    <a
                                      key={c.id}
                                      href={`/classrooms/${c.slug ?? c.id}`}
                                      onClick={(e) => {
                                        if (!e.ctrlKey && !e.metaKey && !e.shiftKey && e.button === 0) {
                                          e.preventDefault();
                                          navigate(`/classrooms/${c.slug ?? c.id}`);
                                        }
                                      }}
                                    >
                                      <Badge
                                        variant="secondary"
                                        className="text-xs font-normal cursor-pointer hover:bg-secondary/70 transition-colors"
                                      >
                                        {c.name}
                                      </Badge>
                                    </a>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-muted-foreground/50 text-xs">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {s.parentId && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 px-2 text-muted-foreground hover:text-primary"
                                  onClick={() => {
                                    setSendMessageReceiverId(s.parentId as number);
                                    setSendMessageReceiverName(s.parentName ?? "");
                                    setSendMessageOpen(true);
                                  }}
                                  data-testid={`button-message-parent-${s.id}`}
                                >
                                  <MessageSquare className="w-3.5 h-3.5 mr-1" />
                                  Message parent
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="feedback">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Student Feedback</CardTitle>
                  <Button
                    onClick={() => setGiveFeedbackOpen(true)}
                    data-testid="button-give-feedback"
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Give Feedback
                  </Button>
                </CardHeader>
                <CardContent>
                  {feedbacksQuery.isLoading ? (
                    <div className="text-center py-8">Loading feedback...</div>
                  ) : feedbacksQuery.isError ? (
                    <div className="text-center py-8 text-red-500">
                      Error loading feedback
                    </div>
                  ) : feedbacks.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No feedback given yet
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {feedbacks.map((f) => (
                        <div
                          key={f.id}
                          className="p-4 border rounded-lg"
                          data-testid={`card-feedback-${f.id}`}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <p
                                  className="font-medium"
                                  data-testid={`text-feedback-student-${f.id}`}
                                >
                                  {f.studentName || students.find((st) => st.id === f.studentId)?.name || "Unknown student"}
                                </p>
                                <Badge
                                  variant={
                                    f.type === "positive"
                                      ? "default"
                                      : f.type === "constructive"
                                        ? "secondary"
                                        : "outline"
                                  }
                                >
                                  {f.type}
                                </Badge>
                              </div>
                              <p
                                className="text-sm"
                                data-testid={`text-feedback-message-${f.id}`}
                              >
                                {f.message}
                              </p>
                              <p className="text-xs text-muted-foreground mt-2">
                                {new Date(f.date).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="requests">
              <Card>
                <CardHeader>
                  <CardTitle>Tutor Requests</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {tutorRequests.length === 0 ? (
                      <div className="text-center py-10">
                        <p className="text-sm text-muted-foreground">No tutor requests yet. When a parent sends you a request, it will appear here.</p>
                      </div>
                    ) : (
                      [...tutorRequests]
                        .sort((a: EnrichedTutorRequest, b: EnrichedTutorRequest) => {
                          if (a.status === "pending" && b.status !== "pending") return -1;
                          if (a.status !== "pending" && b.status === "pending") return 1;
                          return 0;
                        })
                        .map((r: EnrichedTutorRequest) => (
                          <div
                            key={r.id}
                            className="p-4 border rounded-lg"
                            data-testid={`card-request-${r.id}`}
                          >
                            <div className="flex justify-between items-start gap-4">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm">
                                  {r.parentName || "A parent"} is requesting tutoring
                                  {r.studentName ? ` for ${r.studentName}` : ""}
                                  {r.studentGrade ? ` (${r.studentGrade})` : ""}
                                </p>
                                {r.message && (
                                  <p
                                    className="text-sm text-muted-foreground mt-1 line-clamp-2"
                                    data-testid={`text-request-message-${r.id}`}
                                  >
                                    "{r.message}"
                                  </p>
                                )}
                                <p className="text-xs text-muted-foreground mt-1">
                                  {new Date(r.requestDate).toLocaleDateString()}
                                </p>
                                <Badge
                                  className="mt-1"
                                  variant={
                                    r.status === "approved"
                                      ? "default"
                                      : r.status === "rejected"
                                      ? "outline"
                                      : "secondary"
                                  }
                                >
                                  {r.status}
                                </Badge>
                              </div>
                              {r.status === "pending" && (
                                <div className="flex gap-2 shrink-0">
                                  <Button
                                    size="sm"
                                    onClick={() =>
                                      approveTutorRequestMutation.mutate({
                                        id: r.id,
                                        status: "approved",
                                      })
                                    }
                                    disabled={approveTutorRequestMutation.isPending}
                                    data-testid={`button-approve-${r.id}`}
                                  >
                                    Approve
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      approveTutorRequestMutation.mutate({
                                        id: r.id,
                                        status: "rejected",
                                      })
                                    }
                                    disabled={approveTutorRequestMutation.isPending}
                                    data-testid={`button-reject-${r.id}`}
                                  >
                                    Reject
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="classrooms">
              {/* Pending submissions section */}
              {studentSubmissions.filter(s => s.status === "submitted" || s.status === "late").length > 0 && (
                <div className="mb-5">
                  <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    Pending Submissions
                    <span className="ml-1 inline-flex items-center justify-center text-xs font-bold bg-primary/10 text-primary rounded-full px-2 py-0.5">
                      {studentSubmissions.filter(s => s.status === "submitted" || s.status === "late").length}
                    </span>
                  </h3>
                  <div className="space-y-2">
                    {studentSubmissions.filter(s => s.status === "submitted" || s.status === "late").map((sub) => (
                      <div key={sub.id} className="rounded-xl border border-border bg-card px-4 py-3 flex items-start gap-3 flex-wrap">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm text-foreground">{sub.student?.name ?? "Student"}</span>
                            <span className="text-xs text-muted-foreground">·</span>
                            <span className="text-sm text-foreground">{sub.assignment?.title ?? "Assignment"}</span>
                            {sub.status === "late" && (
                              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-medium">Late</span>
                            )}
                            {sub.fileUrl && (
                              <a href={sub.fileUrl} target="_blank" rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                                <Paperclip className="h-3 w-3" />View file
                              </a>
                            )}
                          </div>
                          {sub.submission && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{sub.submission}</p>
                          )}
                          {sub.submittedAt && (
                            <p className="text-xs text-muted-foreground/70 mt-0.5">
                              Submitted {new Date(sub.submittedAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                            </p>
                          )}
                        </div>
                        <Button size="sm" variant="outline" className="text-xs h-8 shrink-0"
                          onClick={() => handleOpenGradeDialog(sub)}>
                          Grade
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <TeacherClassroomsTab />
            </TabsContent>

            <TabsContent value="messages" className="flex flex-col h-[calc(100vh-140px)]">
              <div className="overflow-hidden bg-background flex flex-col flex-1">
                <div className="flex flex-col md:flex-row flex-1 h-full">
                  {/* Left conversation sidebar */}
                  <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-border/40 flex flex-col shrink-0 max-h-60 md:max-h-none">
                    <div className="px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Conversations</p>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                      {students.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full px-4 py-8 text-center gap-2">
                          <MessageSquare className="w-7 h-7 text-muted-foreground/30" />
                          <p className="text-xs text-muted-foreground">No students assigned yet</p>
                        </div>
                      ) : (
                        students.map((s) => {
                          const isActive = selectedStudentForMessages?.id === s.id;
                          const summary = conversationSummaries.find((c) => c.studentId === s.id) ?? null;
                          return (
                            <button
                              key={s.id}
                              onClick={() => setSelectedStudentForMessages(s)}
                              className="w-full flex items-center gap-3 px-3 py-3 text-left transition-colors"
                              style={isActive ? { background: "hsl(var(--primary) / 0.1)", borderLeft: "3px solid hsl(var(--primary))" } : { paddingLeft: "13px" }}
                              onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = "hsl(var(--muted))"; }}
                              onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = ""; }}
                            >
                              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                <span className="text-xs font-bold text-primary">
                                  {s.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2 mb-0.5">
                                  <p className="text-sm font-medium truncate text-foreground">{summary?.customName ?? s.name}</p>
                                  {summary?.lastMessageTimestamp && (
                                    <span className="text-[11px] text-muted-foreground shrink-0">
                                      {formatPreviewTime(summary.lastMessageTimestamp)}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground truncate">
                                  {summary?.lastMessage
                                    ? summary.lastMessage.length > 42 ? summary.lastMessage.slice(0, 42) + "…" : summary.lastMessage
                                    : "No messages yet"}
                                </p>
                                {(summary?.parentName ?? s.parentName) && (
                                  <p className="text-[11px] text-muted-foreground/70 truncate mt-0.5">
                                    Parent: {summary?.parentName ?? s.parentName}
                                  </p>
                                )}
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Right thread panel */}
                  <div className="flex-1 min-w-0 flex flex-col min-h-[360px] md:min-h-0">
                    {selectedStudentForMessages ? (
                      <MessageThread
                        teacherId={user!.id}
                        studentId={selectedStudentForMessages.id}
                        myUserId={user!.id}
                        title={`Thread: ${selectedStudentForMessages.name}${selectedStudentForMessages.parentName ? ` & ${selectedStudentForMessages.parentName}` : ""}`}
                        customName={conversationSummaries.find((c) => c.studentId === selectedStudentForMessages.id)?.customName ?? null}
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
                        <MessageSquare className="w-10 h-10 opacity-20" />
                        <p className="text-sm">Select a student to view the thread</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </main>
      </div>

      <TeacherGradeDialog
        open={gradeDialogOpen}
        submission={selectedSubmission}
        onClose={() => { setGradeDialogOpen(false); setSelectedSubmission(null); }}
      />

      <TeacherGiveFeedbackDialog
        open={giveFeedbackOpen}
        onClose={() => setGiveFeedbackOpen(false)}
        students={students}
      />

      {/* Standalone send-message dialog — opened by "Message parent" button in students tab */}
      <TeacherSendMessageDialog
        open={sendMessageOpen}
        onClose={() => setSendMessageOpen(false)}
        users={users}
        initialReceiverId={sendMessageReceiverId}
        initialReceiverName={sendMessageReceiverName}
      />

    </div>
  );
}

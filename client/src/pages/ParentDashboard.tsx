import { useState, useEffect } from "react";
import MessageThread from "@/components/MessageThread";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueries, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
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
  Users,
  FileText,
  UserPlus,
  MessageSquare,
  Download,
  DollarSign,
  Star,
  Trash2,
  GraduationCap,
  ChevronRight,
  School,
  Plus,
  Loader2,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import ModernSidebar from "@/components/ModernSidebar";
import ColorfulStatCard from "@/components/ColorfulStatCard";
import ModernCombobox from "@/components/ModernCombobox";
import ClassroomCard from "@/components/ClassroomCard";
import type {
  Student,
  Assignment,
  StudentAssignment,
  StudentInvite,
  TutorRequest,
  EnrichedTutorRequest,
  User,
  ProgressReport,
  Classroom,
  ClassroomAssignment,
  ClassroomSubmission,
} from "@shared/schema";

type PublicUser = Pick<User, "id" | "name" | "email" | "role" | "profilePicture">;
type PublicTeacher = Pick<User, "id" | "name" | "email" | "teachingSubjects" | "yearsExperience">;
type ProgressReportEnriched = ProgressReport & { studentName?: string; teacherName?: string };
type AssignedTeacherRef = { id: number; name: string; email: string } | null;

type AssignmentWithStatus = Assignment & {
  studentAssignment: StudentAssignment | null;
};

type ChildStat = Student & {
  pct: number | null;
  completed: number;
  total: number;
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

const paymentSchema = z.object({
  teacherId: z.number().min(1, "Teacher required"),
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  description: z.string().min(1, "Description required"),
  subscriptionType: z.string(),
});

const ratingSchema = z.object({
  teacherId: z.number().min(1, "Teacher required"),
  rating: z
    .number()
    .min(1, "Rating required")
    .max(5, "Rating must be between 1 and 5"),
  comment: z.string(),
});

const PARENT_TABS = ["children", "classrooms", "tutors", "invites", "reports", "messages"];

export default function ParentDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState(() => {
    const hash = window.location.hash.replace("#", "");
    return PARENT_TABS.includes(hash) ? hash : "children";
  });

  // Listen to hash changes from sidebar navigation
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace("#", "");
      if (hash && PARENT_TABS.includes(hash)) setActiveTab(hash);
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  // Check if tutor request mode is enabled (for showing/hiding tutor request UI)
  const { data: tutorRequestModeData } = useQuery<{ enabled: boolean }>({
    queryKey: ["/api/system-settings/tutor-request-mode"],
  });
  const isTutorRequestModeEnabled = tutorRequestModeData?.enabled ?? false;

  // Fetch data
  const { data: students = [], isLoading: studentsLoading } = useQuery<Student[]>({
    queryKey: ["/api/students/parent"],
  });

  // Dialog state
  const [inviteStudentOpen, setInviteStudentOpen] = useState(false);
  const [requestTutorOpen, setRequestTutorOpen] = useState(false);
  const [sendMessageOpen, setSendMessageOpen] = useState(false);
  const [createPaymentOpen, setCreatePaymentOpen] = useState(false);
  const [selectedChildForMessages, setSelectedChildForMessages] = useState<Student | null>(null);

  useEffect(() => {
    if (students.length > 0 && !selectedChildForMessages) {
      setSelectedChildForMessages(students[0]);
    }
  }, [students]);

  const [rateTutorOpen, setRateTutorOpen] = useState(false);
  const { data: invites = [], isLoading: invitesLoading } = useQuery<StudentInvite[]>({
    queryKey: ["/api/invites/student/parent"],
  });
  const { data: tutorRequests = [] } = useQuery<EnrichedTutorRequest[]>({
    queryKey: ["/api/tutor-requests/parent"],
  });
  const paymentsQuery = useQuery({ queryKey: ["/api/payments/parent"] });
  const { data: users = [] } = useQuery<PublicUser[]>({ queryKey: ["/api/users"] });
  const { data: teachers = [] } = useQuery<PublicTeacher[]>({ queryKey: ["/api/teachers"] });
  const { data: progressReports = [] } = useQuery<ProgressReportEnriched[]>({
    queryKey: ["/api/progress-reports/parent"],
  });
  const ratingsQuery = useQuery({ queryKey: ["/api/tutor-ratings/parent"] });

  const [selectedStudentForAttendance, setSelectedStudentForAttendance] =
    useState<number | null>(null);
  const attendanceQuery = useQuery({
    queryKey: ["/api/attendance/student", selectedStudentForAttendance],
    enabled: !!selectedStudentForAttendance,
  });

  const payments = paymentsQuery.data || [];
  const tutorRatings = ratingsQuery.data || [];
  const studentAttendance = attendanceQuery.data || [];

  const childAssignmentQueries = useQueries({
    queries: students.map((child) => ({
      queryKey: ["/api/assignments/student", child.id],
      enabled: students.length > 0,
    })),
  });

  const childTeacherQueries = useQueries({
    queries: students.map((child) => ({
      queryKey: ["/api/teachers/student", child.id],
      enabled: students.length > 0,
    })),
  });

  const childClassroomQueries = useQueries({
    queries: students.map((child) => ({
      queryKey: ["/api/classrooms/parent", child.id],
      queryFn: () => apiRequest(`/api/classrooms/parent/${child.id}`) as Promise<Classroom[]>,
      enabled: students.length > 0,
    })),
  });

  // Flat (child, classroom) pairs — recalculated each render as classrooms load
  const childClassroomPairs = students.flatMap((child, ci) => {
    const childClassrooms = (childClassroomQueries[ci]?.data as Classroom[]) ?? [];
    return childClassrooms.map(c => ({ child, classroom: c }));
  });

  // Per-child per-classroom submission queries (parents use ?studentId= param)
  const childClassworkSubmissionQueries = useQueries({
    queries: childClassroomPairs.map(({ child, classroom }) => ({
      queryKey: ["/api/classrooms", classroom.id, "my-submissions", child.id],
      queryFn: () => apiRequest(`/api/classrooms/${classroom.id}/my-submissions?studentId=${child.id}`),
      enabled: childClassroomPairs.length > 0,
    })),
  });

  // Per-child per-classroom assignment queries (to know the total count)
  const childClassroomAssignmentQueries = useQueries({
    queries: childClassroomPairs.map(({ classroom }) => ({
      queryKey: ["/api/classrooms", classroom.id, "assignments"],
      queryFn: () => apiRequest(`/api/classrooms/${classroom.id}/assignments`),
      enabled: childClassroomPairs.length > 0,
    })),
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

  const childStats: (ChildStat & { classroomCount: number })[] = students.map((child, ci) => {
    // Legacy assignment stats
    const legacyData = (childAssignmentQueries[ci]?.data as AssignmentWithStatus[]) || [];
    const legacyCompleted = legacyData.filter(a => a.studentAssignment?.status === "graded").length;
    const legacyTotal = legacyData.length;

    // Compute offset into flat arrays for this child
    let offset = 0;
    for (let j = 0; j < ci; j++) {
      offset += ((childClassroomQueries[j]?.data as Classroom[]) ?? []).length;
    }
    const childClassrooms = (childClassroomQueries[ci]?.data as Classroom[]) ?? [];
    const classroomCount = childClassrooms.length;

    // Classwork stats from per-classroom queries
    const classworkCompleted = childClassrooms.reduce((sum, _, ki) => {
      const subs = (childClassworkSubmissionQueries[offset + ki]?.data as ClassroomSubmission[]) ?? [];
      return sum + subs.filter(s => s.status === "graded").length;
    }, 0);
    const classworkTotal = childClassrooms.reduce((sum, _, ki) => {
      const assigns = (childClassroomAssignmentQueries[offset + ki]?.data as ClassroomAssignment[]) ?? [];
      return sum + assigns.length;
    }, 0);

    const completed = legacyCompleted + classworkCompleted;
    const total = legacyTotal + classworkTotal;
    const pct = total > 0 ? Math.round((completed / total) * 100) : null;
    return { ...child, pct, completed, total, classroomCount };
  });

  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const { data: studentAssignments = [] } = useQuery({
    queryKey: ["/api/assignments/student", selectedStudent?.id],
    enabled: !!selectedStudent,
  });

  // Invite student form
  const [inviteForm, setInviteForm] = useState({
    email: "",
    studentName: "",
    gradeLevel: "",
  });

  const inviteStudentMutation = useMutation({
    mutationFn: (data: any) =>
      apiRequest("/api/invites/student", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({
        queryKey: ["/api/invites/student/parent"],
      });
      toast({
        title: "Invite sent!",
        description: "Your child will receive an email with a direct signup link.",
        type: "success",
      });
      setInviteForm({ email: "", studentName: "", gradeLevel: "" });
      setInviteStudentOpen(false);
    },
  });

  const revokeInviteMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest(`/api/invites/student/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invites/student/parent"] });
      toast({ title: "Invite revoked", type: "success" });
    },
  });

  // Request tutor form
  const [tutorRequestForm, setTutorRequestForm] = useState({
    teacherId: 0,
    message: "",
    studentId: null as number | null,
  });

  const requestTutorMutation = useMutation({
    mutationFn: (data: any) =>
      apiRequest("/api/tutor-requests", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tutor-requests/parent"] });
      queryClient.invalidateQueries({ queryKey: ["/api/teachers/student"] });
      const approved = data?.status === "approved";
      toast({
        title: approved ? "Teacher assigned!" : "Request sent!",
        description: approved
          ? "Your child has been linked to the selected teacher."
          : "Your request has been sent. The teacher will review and approve it shortly.",
        type: "success",
      });
      setTutorRequestForm({ teacherId: 0, message: "", studentId: null });
      setRequestTutorOpen(false);
    },
    onError: (err: any) => {
      const message = err?.message || "Failed to send request. Please try again.";
      toast({ title: "Could not send request", description: message, type: "error" });
    },
  });

  // Set parental controls
  const [controlsForm, setControlsForm] = useState({
    studentId: 0,
    screenTimeLimit: 120,
    allowedDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    allowedTimes: { start: "08:00", end: "18:00" },
    blockedFeatures: [] as string[],
  });

  const setControlsMutation = useMutation({
    mutationFn: (data: any) =>
      apiRequest("/api/parental-controls", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      toast({ title: "Controls updated!", type: "success" });
    },
  });

  // Send message
  const [messageForm, setMessageForm] = useState({
    receiverId: 0,
    content: "",
  });

  const sendMessageMutation = useMutation({
    mutationFn: (data: any) =>
      apiRequest("/api/messages", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages/conversations"] });
      toast({ title: "Message sent!", type: "success" });
      setMessageForm({ receiverId: 0, content: "" });
      setSendMessageOpen(false);
    },
  });

  // Progress reports for selected student
  const { data: studentProgressReports = [] } = useQuery({
    queryKey: ["/api/progress-reports/student", selectedStudent?.id],
    enabled: !!selectedStudent,
  });

  // Download report as JSON
  const downloadReport = (report: any) => {
    const dataStr = JSON.stringify(report, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `progress-report-${report.id}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Create payment
  const paymentForm = useForm({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      teacherId: 0,
      amount: 0,
      description: "",
      subscriptionType: "",
    },
  });

  const createPaymentMutation = useMutation({
    mutationFn: (data: any) =>
      apiRequest("/api/payments", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payments/parent"] });
      toast({ title: "Payment created!", type: "success" });
      paymentForm.reset();
      setCreatePaymentOpen(false);
    },
  });

  // Rate tutor
  const ratingForm = useForm({
    resolver: zodResolver(ratingSchema),
    defaultValues: { teacherId: 0, rating: 5, comment: "" },
  });

  const rateTutorMutation = useMutation({
    mutationFn: (data: any) =>
      apiRequest("/api/tutor-ratings", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/tutor-ratings/parent"],
      });
      toast({ title: "Rating submitted!", type: "success" });
      ratingForm.reset();
      setRateTutorOpen(false);
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <ModernSidebar />

      <div className="md:ml-[228px] flex">
        <main className="flex-1 p-4 sm:p-6 pt-20 md:pt-6">

          {/* GREETING */}
          {(() => {
            const hour = new Date().getHours();
            const g = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
            const firstName = user?.name?.split(" ")[0] || "there";
            return (
              <div className="mb-5">
                <h1 className="text-xl font-semibold text-foreground">{g}, {firstName} 👋</h1>
                <p className="text-sm text-muted-foreground">{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p>
              </div>
            );
          })()}

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsContent value="children">
              {childStats.length > 0 && (
                <div className="mb-6">
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Your Children</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {childStats.map((child, index) => {
                      const assignedTeacher = (childTeacherQueries[index]?.data ?? null) as AssignedTeacherRef;
                      return (
                        <div
                          key={child.id}
                          className="p-4 rounded-lg border border-border bg-card hover:border-primary/40 hover:shadow-sm transition-all"
                        >
                          <div className="flex items-start gap-3 mb-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                              <span className="text-sm font-semibold text-primary">
                                {child.name?.charAt(0).toUpperCase() || "?"}
                              </span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-foreground text-sm truncate">{child.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {child.gradeLevel ? `Grade ${child.gradeLevel}` : "Student"}
                              </p>
                            </div>
                            <button
                              onClick={() => { setActiveTab("children"); window.location.hash = "children"; }}
                              className="text-muted-foreground hover:text-primary shrink-0"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Assigned teacher */}
                          <div className="flex items-center justify-between mb-3 py-2 border-y border-border/50">
                            <div className="flex items-center gap-1.5">
                              <GraduationCap className="w-3.5 h-3.5 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">
                                {assignedTeacher
                                  ? <span className="text-foreground font-medium">{assignedTeacher.name}</span>
                                  : <span className="italic">No teacher assigned yet</span>
                                }
                              </span>
                            </div>
                            {assignedTeacher && (
                              <button
                                onClick={() => {
                                  setMessageForm({ receiverId: assignedTeacher.id, content: "" });
                                  setSendMessageOpen(true);
                                }}
                                className="text-xs text-primary hover:underline flex items-center gap-1"
                              >
                                <MessageSquare className="w-3 h-3" />
                                Message
                              </button>
                            )}
                          </div>

                          {child.classroomCount > 0 && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                              <School className="w-3 h-3" />
                              <span>{child.classroomCount} {child.classroomCount === 1 ? "classroom" : "classrooms"}</span>
                            </div>
                          )}
                          {child.pct !== null ? (
                            <div>
                              <div className="flex items-center justify-between text-xs mb-1">
                                <span className="text-muted-foreground">{child.completed}/{child.total} assignments done</span>
                                <span className="font-medium text-foreground">{child.pct}%</span>
                              </div>
                              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-primary rounded-full transition-all"
                                  style={{ width: `${child.pct}%` }}
                                />
                              </div>
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground">No assignments yet</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {(studentsLoading || invitesLoading || childAssignmentQueries.some(q => q.isLoading) || childClassroomQueries.some(q => q.isLoading)) ? (
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <Skeleton className="h-20 rounded-xl" />
                  <Skeleton className="h-20 rounded-xl" />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <ColorfulStatCard
                    title="Children"
                    value={students.length}
                    icon={Users}
                    accent="blue"
                    subtitle="Registered"
                  />
                  <ColorfulStatCard
                    title="Invites"
                    value={invites.length}
                    icon={UserPlus}
                    accent="green"
                    subtitle="Pending invites"
                  />
                </div>
              )}

              <Card>
                <CardHeader>
                  <CardTitle>My Students</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Grade Level</TableHead>
                        {/* <TableHead>Select</TableHead> */}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {students.map((s: any) => (
                        <TableRow
                          key={s.id}
                          data-testid={`row-student-${s.id}`}
                        >
                          <TableCell data-testid={`text-student-name-${s.id}`}>
                            {s.name}
                          </TableCell>
                          <TableCell>{s.email}</TableCell>
                          <TableCell>{s.gradeLevel}</TableCell>
                          {/* <TableCell>
                            <button onClick={() => setSelectedStudent(s)}>
                              <Unlink2 />
                            </button>
                          </TableCell> */}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="invites">
              <Card>
                <CardHeader>
                  <CardTitle>Invite Student</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 mb-6">
                    <Input
                      placeholder="Student Email"
                      type="email"
                      value={inviteForm.email}
                      onChange={(e) =>
                        setInviteForm({ ...inviteForm, email: e.target.value })
                      }
                      data-testid="input-invite-email"
                    />
                    <Input
                      placeholder="Student Name"
                      value={inviteForm.studentName}
                      onChange={(e) =>
                        setInviteForm({
                          ...inviteForm,
                          studentName: e.target.value,
                        })
                      }
                      data-testid="input-invite-name"
                    />
                    <Input
                      placeholder="Grade Level"
                      value={inviteForm.gradeLevel}
                      onChange={(e) =>
                        setInviteForm({
                          ...inviteForm,
                          gradeLevel: e.target.value,
                        })
                      }
                      data-testid="input-invite-grade"
                    />
                    <Button
                      onClick={() => inviteStudentMutation.mutate(inviteForm)}
                      disabled={inviteStudentMutation.isPending}
                      className="w-full"
                      data-testid="button-send-invite"
                    >
                      {inviteStudentMutation.isPending
                        ? "Sending..."
                        : "Send Invite"}
                    </Button>
                  </div>

                  <div className="border-t pt-4">
                    <h3 className="font-medium mb-4">Sent Invites</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Student Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Invite Code</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invites.map((i: any) => (
                          <TableRow
                            key={i.id}
                            data-testid={`row-invite-${i.id}`}
                          >
                            <TableCell>{i.studentName}</TableCell>
                            <TableCell>{i.email}</TableCell>
                            <TableCell>
                              {i.code ? (
                                <span className="font-mono font-semibold text-sm tracking-widest text-primary">{i.code}</span>
                              ) : (
                                <span className="text-muted-foreground text-xs italic">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant={i.status === "accepted" ? "default" : i.status === "pending" ? "outline" : "secondary"}>
                                {i.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {i.status === "pending" && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-destructive hover:text-destructive h-7 px-2"
                                  onClick={() => revokeInviteMutation.mutate(i.id)}
                                  disabled={revokeInviteMutation.isPending}
                                  data-testid={`button-revoke-invite-${i.id}`}
                                >
                                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                                  Revoke
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

         

            <TabsContent value="tutors">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Tutor Requests</CardTitle>
                    <Dialog
                      open={requestTutorOpen}
                      onOpenChange={setRequestTutorOpen}
                    >
                      <DialogTrigger asChild>
                        <Button data-testid="button-request-tutor">
                          Request Tutor
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Request a Tutor</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="space-y-1.5">
                            <label className="text-sm font-medium">Which child needs a tutor?</label>
                            <Select
                              value={tutorRequestForm.studentId?.toString() || ""}
                              onValueChange={(val) =>
                                setTutorRequestForm({ ...tutorRequestForm, studentId: parseInt(val) })
                              }
                            >
                              <SelectTrigger data-testid="select-student-tutor-request">
                                <SelectValue placeholder="Select a child" />
                              </SelectTrigger>
                              <SelectContent>
                                {students.map((s: any) => (
                                  <SelectItem key={s.id} value={s.id.toString()}>
                                    {s.name} {s.gradeLevel ? `(Grade ${s.gradeLevel})` : ""}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-sm font-medium">Which teacher would you like?</label>
                            <Select
                              value={tutorRequestForm.teacherId?.toString() || ""}
                              onValueChange={(val) =>
                                setTutorRequestForm({ ...tutorRequestForm, teacherId: parseInt(val) })
                              }
                            >
                              <SelectTrigger data-testid="select-teacher-tutor-request">
                                <SelectValue placeholder="Select a teacher" />
                              </SelectTrigger>
                              <SelectContent>
                                {teachers.map((t: any) => (
                                  <SelectItem key={t.id} value={t.id.toString()}>
                                    <span className="font-medium">{t.name}</span>
                                    {(t.teachingSubjects?.length > 0 || t.yearsExperience) && (
                                      <span className="text-xs text-muted-foreground ml-1.5">
                                        {[
                                          t.teachingSubjects?.slice(0, 2).join(", "),
                                          t.yearsExperience && `${t.yearsExperience}y exp`,
                                        ].filter(Boolean).join(" · ")}
                                      </span>
                                    )}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-sm font-medium">Message (optional)</label>
                            <Textarea
                              placeholder="Any details about your child's needs, schedule, or subject..."
                              value={tutorRequestForm.message}
                              onChange={(e) =>
                                setTutorRequestForm({
                                  ...tutorRequestForm,
                                  message: e.target.value,
                                })
                              }
                              rows={3}
                              data-testid="input-tutor-request-message"
                            />
                          </div>
                          <Button
                            onClick={() =>
                              requestTutorMutation.mutate(tutorRequestForm)
                            }
                            disabled={
                              requestTutorMutation.isPending ||
                              !tutorRequestForm.studentId ||
                              !tutorRequestForm.teacherId
                            }
                            className="w-full"
                            data-testid="button-submit-tutor-request"
                          >
                            {requestTutorMutation.isPending
                              ? "Sending..."
                              : "Send Request"}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {tutorRequests.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          No tutor requests yet. Click "Request Tutor" to get
                          started.
                        </p>
                      ) : (
                        tutorRequests.map((r: any) => (
                          <div
                            key={r.id}
                            className="p-4 border rounded-lg"
                            data-testid={`card-tutor-request-${r.id}`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm">
                                  {r.studentName || "Your child"} → {r.teacherName || "Teacher"}
                                </p>
                                {r.studentGrade && (
                                  <p className="text-xs text-muted-foreground">{r.studentGrade}</p>
                                )}
                                {r.message ? (
                                  <p
                                    className="text-sm text-muted-foreground mt-1 line-clamp-2"
                                    data-testid={`text-tutor-request-message-${r.id}`}
                                  >
                                    "{r.message}"
                                  </p>
                                ) : null}
                                <p className="text-xs text-muted-foreground mt-1">
                                  Requested: {new Date(r.requestDate).toLocaleDateString()}
                                </p>
                              </div>
                              <Badge
                                variant={
                                  r.status === "approved" ? "default" : r.status === "rejected" ? "outline" : "secondary"
                                }
                              >
                                {r.status}
                              </Badge>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="reports">
              <Card>
                <CardHeader>
                  <CardTitle>Progress Reports</CardTitle>
                </CardHeader>
                <CardContent>
                  {progressReports.length === 0 ? (
                    <div className="text-center py-12">
                      <FileText className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">No progress reports yet. Reports written by teachers will appear here.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {progressReports.map((report: any) => (
                        <div
                          key={report.id}
                          className="p-4 border rounded-lg hover:border-primary/30 transition-colors"
                          data-testid={`card-report-${report.id}`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-sm">{report.studentName || "Student"}</span>
                                <span className="text-xs text-muted-foreground font-medium">{report.period}</span>
                                {report.grades?.Overall !== undefined && (
                                  <Badge variant="secondary">{report.grades.Overall}%</Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mb-2">
                                By {report.teacherName || "Teacher"} · {report.date ? new Date(report.date).toLocaleDateString() : ""}
                              </p>
                              {report.content && (
                                <p className="text-sm text-foreground line-clamp-2">{report.content}</p>
                              )}
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => downloadReport(report)}
                              data-testid={`button-download-${report.id}`}
                              className="shrink-0"
                            >
                              <Download className="h-3.5 w-3.5 mr-1.5" />
                              Save
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            

            <TabsContent value="classrooms">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><School className="h-5 w-5 text-primary" />Classrooms</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {students.length === 0 && (
                    <div className="text-center py-10 text-gray-400 text-sm">Add a student to see their classrooms.</div>
                  )}
                  {students.map((child, i) => {
                    const childClassrooms = (childClassroomQueries[i]?.data ?? []) as Classroom[];
                    return (
                      <div key={child.id} className="space-y-3">
                        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                          <GraduationCap className="h-4 w-4 text-gray-400" />{child.name}
                        </h3>
                        {childClassrooms.length === 0 ? (
                          <p className="text-xs text-gray-400 pl-5">No classrooms yet for this student.</p>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {childClassrooms.map(c => (
                              <ClassroomCard
                                key={c.id}
                                classroom={c}
                                href={`/classrooms/${c.slug ?? c.id}?studentId=${child.id}`}
                                ctaLabel="View Grades"
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="messages">
              <Card className="overflow-hidden">
                <div className="flex flex-col md:flex-row h-auto md:h-[620px]">
                  {/* Left conversation sidebar */}
                  <div className="w-full md:w-72 border-b md:border-b-0 md:border-r flex flex-col shrink-0 bg-muted/20 max-h-60 md:max-h-none">
                    <div className="px-4 py-3 border-b bg-background">
                      <p className="text-sm font-semibold text-foreground">Conversations</p>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                      {students.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full px-4 py-8 text-center gap-2">
                          <MessageSquare className="w-7 h-7 text-muted-foreground/30" />
                          <p className="text-xs text-muted-foreground">No children registered yet</p>
                        </div>
                      ) : (
                        students.map((child) => {
                          const isActive = selectedChildForMessages?.id === child.id;
                          const summary = conversationSummaries.find((c) => c.studentId === child.id) ?? null;
                          return (
                            <button
                              key={child.id}
                              onClick={() => setSelectedChildForMessages(child)}
                              className="w-full flex items-center gap-3 px-3 py-3 text-left transition-colors border-b border-border/30"
                              style={isActive ? { background: "hsl(var(--primary) / 0.1)", borderLeft: "3px solid hsl(var(--primary))" } : { paddingLeft: "13px" }}
                              onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = "hsl(var(--muted))"; }}
                              onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = ""; }}
                            >
                              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                <span className="text-xs font-bold text-primary">
                                  {child.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2 mb-0.5">
                                  <p className="text-sm font-medium truncate text-foreground">{summary?.customName ?? child.name}</p>
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
                                {summary?.teacherName && (
                                  <p className="text-[11px] text-muted-foreground/70 truncate mt-0.5">
                                    Teacher: {summary.teacherName}
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
                    {(() => {
                      if (!selectedChildForMessages) {
                        return (
                          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
                            <MessageSquare className="w-10 h-10 opacity-20" />
                            <p className="text-sm">Select a child to view their thread</p>
                          </div>
                        );
                      }
                      const selectedIndex = students.findIndex((s) => s.id === selectedChildForMessages.id);
                      const selectedTeacher = selectedIndex >= 0
                        ? (childTeacherQueries[selectedIndex]?.data ?? null) as AssignedTeacherRef
                        : null;
                      if (!selectedTeacher) {
                        return (
                          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
                            <MessageSquare className="w-10 h-10 opacity-20" />
                            <p className="text-sm">No teacher assigned to {selectedChildForMessages.name} yet</p>
                          </div>
                        );
                      }
                      return (
                        <MessageThread
                          teacherId={selectedTeacher.id}
                          studentId={selectedChildForMessages.id}
                          myUserId={user!.id}
                          title={`Thread: ${selectedChildForMessages.name} & ${selectedTeacher.name}`}
                          customName={conversationSummaries.find((c) => c.studentId === selectedChildForMessages.id)?.customName ?? null}
                        />
                      );
                    })()}
                  </div>
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>

      {/* Standalone message dialog — can be triggered from child cards */}
      <Dialog open={sendMessageOpen} onOpenChange={(open) => {
        setSendMessageOpen(open);
        if (!open) setMessageForm({ receiverId: 0, content: "" });
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Message</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">To</label>
              <ModernCombobox
                users={users}
                selectedUserId={messageForm.receiverId}
                onSelect={(userId) => setMessageForm({ ...messageForm, receiverId: userId })}
                placeholder="Search users..."
                testId="select-receiver"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Message</label>
              <Textarea
                placeholder="Type your message..."
                value={messageForm.content}
                onChange={(e) => setMessageForm({ ...messageForm, content: e.target.value })}
                rows={4}
                data-testid="input-message-content"
              />
            </div>
            <Button
              onClick={() => sendMessageMutation.mutate(messageForm)}
              disabled={sendMessageMutation.isPending || !messageForm.receiverId || !messageForm.content}
              className="w-full"
              data-testid="button-send-message"
            >
              {sendMessageMutation.isPending ? "Sending..." : "Send"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

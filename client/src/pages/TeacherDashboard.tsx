import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import MessageThread from "@/components/MessageThread";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  queryClient,
  apiRequest,
  apiUploadWithProgress,
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
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import ModernSidebar from "@/components/ModernSidebar";
import ModernCombobox from "@/components/ModernCombobox";
import ClassroomCard from "@/components/ClassroomCard";
import type {
  Session,
  StudentAssignment,
  Student,
  Assignment,
  Material,
  Earnings,
  TutorRequest,
  EnrichedTutorRequest,
  User,
  ProgressReport,
  Classroom,
} from "@shared/schema";

type StudentWithParent = Student & {
  email?: string;
  parentName?: string;
  parentId?: number;
};

type PublicUser = Pick<User, "id" | "name" | "email" | "role" | "profilePicture">;
type ProgressReportEnriched = ProgressReport & { studentName?: string; teacherName?: string };

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

const scheduleSchema = z.object({
  studentId: z.number().min(1, "Student required"),
  dayOfWeek: z.string().min(1, "Day required"),
  startTime: z.string().min(1, "Start time required"),
  endTime: z.string().min(1, "End time required"),
  subject: z.string().min(1, "Subject required"),
});

const feedbackSchema = z.object({
  studentId: z.number().min(1, "Student required"),
  message: z.string().min(1, "Message required"),
  type: z.string().min(1, "Type required"),
});

const attendanceSchema = z.object({
  studentId: z.number().min(1, "Student required"),
  date: z.string().min(1, "Date required"),
  status: z.string().min(1, "Status required"),
  notes: z.string(),
});

const sessionFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  subject: z.string().min(1, "Subject is required"),
  sessionDate: z.string().min(1, "Session date is required"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  meetingUrl: z.string().min(1, "Meeting URL is required"),
  notes: z.string().optional(),
  studentIds: z.array(z.number()),
  status: z.string(),
});

const TEACHER_TABS = ["classrooms", "students", "requests", "feedback", "messages"];

function TeacherClassroomsTab() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", subject: "", description: "" });
  const { data: classrooms = [], isLoading } = useQuery<Classroom[]>({ queryKey: ["/api/classrooms"] });
  const createMutation = useMutation({
    mutationFn: () => apiRequest("/api/classrooms", { method: "POST", body: JSON.stringify(form) }),
    onSuccess: () => {
      setOpen(false);
      setForm({ name: "", subject: "", description: "" });
      queryClient.invalidateQueries({ queryKey: ["/api/classrooms"] });
      toast({ title: "Classroom created!" });
    },
    onError: (e: any) => toast({ title: "Failed to create classroom", description: e.message, variant: "destructive" }),
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
          {classrooms.map(c => (
            <ClassroomCard
              key={c.id}
              classroom={c}
              href={`/classrooms/${c.slug ?? c.id}`}
              ctaLabel="Open Classroom"
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function TeacherDashboard() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const params = useParams<{ tab?: string }>();
  const [, navigate] = useLocation();
  const activeTab = TEACHER_TABS.includes(params.tab ?? "") ? params.tab! : "classrooms";
  const setActiveTab = (tab: string) => navigate("/dashboard/" + tab);

  // Dialog state
  const [createAssignmentOpen, setCreateAssignmentOpen] = useState(false);
  const [editAssignmentOpen, setEditAssignmentOpen] = useState(false);
  const [uploadMaterialOpen, setUploadMaterialOpen] = useState(false);
  const [editMaterialOpen, setEditMaterialOpen] = useState(false);
  const [createSessionOpen, setCreateSessionOpen] = useState(false);
  const [editSessionOpen, setEditSessionOpen] = useState(false);
  const [createReportOpen, setCreateReportOpen] = useState(false);
  const [sendMessageOpen, setSendMessageOpen] = useState(false);
  const [createScheduleOpen, setCreateScheduleOpen] = useState(false);
  const [editScheduleOpen, setEditScheduleOpen] = useState(false);
  const [giveFeedbackOpen, setGiveFeedbackOpen] = useState(false);
  const [markAttendanceOpen, setMarkAttendanceOpen] = useState(false);

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

  const { data: assignments = [] } = useQuery<Assignment[]>({
    queryKey: ["/api/assignments/teacher"],
  });
  const { data: materials = [] } = useQuery<Material[]>({
    queryKey: ["/api/materials/teacher"],
  });
  const { data: sessions = [] } = useQuery<Session[]>({
    queryKey: ["/api/sessions/teacher"],
  });
  const { data: tutorRequests = [] } = useQuery<EnrichedTutorRequest[]>({
    queryKey: ["/api/tutor-requests/teacher"],
  });
  const { data: earnings = [] } = useQuery<Earnings[]>({
    queryKey: ["/api/earnings/teacher"],
  });
  const { data: progressReports = [] } = useQuery<ProgressReportEnriched[]>({
    queryKey: ["/api/progress-reports/teacher"],
  });
  const { data: users = [] } = useQuery<PublicUser[]>({ queryKey: ["/api/users"] });
  const schedulesQuery = useQuery({ queryKey: ["/api/schedules/teacher"] });
  const feedbacksQuery = useQuery({ queryKey: ["/api/feedback/teacher"] });
  const { data: classrooms = [] } = useQuery<Classroom[]>({ queryKey: ["/api/classrooms"] });

  const [selectedStudentForAttendance, setSelectedStudentForAttendance] =
    useState<number | null>(null);
  const attendanceQuery = useQuery({
    queryKey: ["/api/attendance/student", selectedStudentForAttendance],
    enabled: !!selectedStudentForAttendance,
  });

  const schedules = schedulesQuery.data || [];
  const feedbacks = feedbacksQuery.data || [];
  const attendanceRecords = attendanceQuery.data || [];

  // Fetch student submissions for grading
  const { data: studentSubmissions = [] } =
    useQuery<StudentSubmissionWithRelations[]>({
      queryKey: ["/api/student-submissions/teacher"],
    });

  // Grading state
  const [gradeDialogOpen, setGradeDialogOpen] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
  const [gradeForm, setGradeForm] = useState({
    grade: "",
    feedback: "",
  });

  // Grade submission mutation
  const gradeSubmissionMutation = useMutation({
    mutationFn: ({
      id,
      grade,
      feedback,
    }: {
      id: number;
      grade: number;
      feedback: string;
    }) =>
      apiRequest(`/api/student-assignments/${id}/grade`, {
        method: "PATCH",
        body: JSON.stringify({ grade, feedback }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/student-submissions/teacher"],
      });
      toast({ title: "Assignment graded successfully!" });
      setGradeDialogOpen(false);
      setSelectedSubmission(null);
      setGradeForm({ grade: "", feedback: "" });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to grade assignment",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleOpenGradeDialog = (submission: any) => {
    setSelectedSubmission(submission);
    setGradeForm({
      grade: submission.grade?.toString() || "",
      feedback: submission.feedback || "",
    });
    setGradeDialogOpen(true);
  };

  const handleSubmitGrade = () => {
    if (!selectedSubmission) return;
    const gradeNum = parseInt(gradeForm.grade);
    if (isNaN(gradeNum) || gradeNum < 0 || gradeNum > 100) {
      toast({
        title: "Please enter a valid grade between 0 and 100",
        variant: "destructive",
      });
      return;
    }
    gradeSubmissionMutation.mutate({
      id: selectedSubmission.id,
      grade: gradeNum,
      feedback: gradeForm.feedback,
    });
  };

  // Create assignment
  const [assignmentForm, setAssignmentForm] = useState({
    title: "",
    description: "",
    subject: "",
    dueDate: "",
    gradeLevel: "",
  });
  const [assignmentFile, setAssignmentFile] = useState<File | null>(null);
  const [assignmentFileUrl, setAssignmentFileUrl] = useState("");
  const [assignmentInputType, setAssignmentInputType] = useState<
    "file" | "url"
  >("file");
  const [assignmentUploadProgress, setAssignmentUploadProgress] = useState(0);
  const [isAssignmentUploading, setIsAssignmentUploading] = useState(false);

  const createAssignmentMutation = useMutation({
    mutationFn: async (data: any) => {
      if (assignmentInputType === "file" && assignmentFile) {
        setIsAssignmentUploading(true);
        setAssignmentUploadProgress(0);

        const formData = new FormData();
        formData.append("file", assignmentFile);
        formData.append("title", data.title);
        formData.append("description", data.description);
        formData.append("subject", data.subject);
        formData.append("dueDate", data.dueDate);
        formData.append("gradeLevel", data.gradeLevel);

        return apiUploadWithProgress(
          "/api/assignments/with-file",
          formData,
          (progress) => setAssignmentUploadProgress(progress),
        );
      } else if (assignmentInputType === "url" && assignmentFileUrl) {
        return apiRequest("/api/assignments", {
          method: "POST",
          body: JSON.stringify({ ...data, fileUrl: assignmentFileUrl }),
        });
      } else {
        return apiRequest("/api/assignments", {
          method: "POST",
          body: JSON.stringify({ ...data, fileUrl: null }),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assignments/teacher"] });
      toast({ title: "Assignment created!", description: "success" });
      setAssignmentForm({
        title: "",
        description: "",
        subject: "",
        dueDate: "",
        gradeLevel: "",
      });
      setAssignmentFile(null);
      setAssignmentFileUrl("");
      setAssignmentUploadProgress(0);
      setIsAssignmentUploading(false);
      setCreateAssignmentOpen(false);
    },
    onError: () => {
      setAssignmentUploadProgress(0);
      setIsAssignmentUploading(false);
    },
  });

  // Edit assignment
  const [editAssignmentForm, setEditAssignmentForm] = useState({
    id: 0,
    title: "",
    description: "",
    subject: "",
    dueDate: "",
    gradeLevel: "",
    fileUrl: "",
  });

  const updateAssignmentMutation = useMutation({
    mutationFn: ({ id, ...data }: any) =>
      apiRequest(`/api/assignments/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assignments/teacher"] });
      toast({ title: "Assignment updated!", description: "success" });
      setEditAssignmentForm({
        id: 0,
        title: "",
        description: "",
        subject: "",
        dueDate: "",
        gradeLevel: "",
        fileUrl: "",
      });
      setEditAssignmentOpen(false);
    },
  });

  // Delete assignment
  const deleteAssignmentMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest(`/api/assignments/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assignments/teacher"] });
      toast({ title: "Assignment deleted!", type: "success" });
    },
  });

  // Upload material
  const [materialForm, setMaterialForm] = useState({
    title: "",
    description: "",
    subject: "",
    gradeLevel: "",
  });
  const [materialFile, setMaterialFile] = useState<File | null>(null);
  const [materialLink, setMaterialLink] = useState("");
  const [materialInputType, setMaterialInputType] = useState<"file" | "link">(
    "file",
  );
  const [materialUploadProgress, setMaterialUploadProgress] = useState(0);
  const [isMaterialUploading, setIsMaterialUploading] = useState(false);

  const uploadMaterialMutation = useMutation({
    mutationFn: async (data: any) => {
      if (materialInputType === "file" && materialFile) {
        setIsMaterialUploading(true);
        setMaterialUploadProgress(0);

        const formData = new FormData();
        formData.append("file", materialFile);
        formData.append("title", data.title);
        formData.append("description", data.description || "");
        formData.append("subject", data.subject);
        formData.append("gradeLevel", data.gradeLevel);

        return apiUploadWithProgress(
          "/api/materials/with-file",
          formData,
          (progress) => setMaterialUploadProgress(progress),
        );
      } else if (materialInputType === "link" && materialLink) {
        return apiRequest("/api/materials", {
          method: "POST",
          body: JSON.stringify({
            ...data,
            fileUrl: materialLink,
            uploadDate: new Date().toISOString(),
          }),
        });
      } else {
        throw new Error("Please provide a file or link");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/materials/teacher"] });
      toast({ title: "Material uploaded!", description: "success" });
      setMaterialForm({
        title: "",
        description: "",
        subject: "",
        gradeLevel: "",
      });
      setMaterialFile(null);
      setMaterialLink("");
      setMaterialUploadProgress(0);
      setIsMaterialUploading(false);
      setUploadMaterialOpen(false);
    },
    onError: () => {
      setMaterialUploadProgress(0);
      setIsMaterialUploading(false);
    },
  });

  // Edit material
  const [editMaterialForm, setEditMaterialForm] = useState({
    id: 0,
    title: "",
    description: "",
    fileUrl: "",
    subject: "",
    gradeLevel: "",
  });

  const updateMaterialMutation = useMutation({
    mutationFn: ({ id, ...data }: any) =>
      apiRequest(`/api/materials/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/materials/teacher"] });
      toast({ title: "Material updated!", type: "success" });
      setEditMaterialForm({
        id: 0,
        title: "",
        description: "",
        fileUrl: "",
        subject: "",
        gradeLevel: "",
      });
      setEditMaterialOpen(false);
    },
  });

  // Delete material
  const deleteMaterialMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest(`/api/materials/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/materials/teacher"] });
      toast({ title: "Material deleted!", type: "success" });
    },
  });

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

  // Create session
  const [sessionForm, setSessionForm] = useState({
    subject: "",
    sessionDate: "",
    startTime: "",
    endTime: "",
    studentIds: [] as number[],
    title: "",
    description: "",
    meetingUrl: "",
    notes: "",
    status: "scheduled",
  });
  const [sessionFormErrors, setSessionFormErrors] = useState<
    Record<string, string>
  >({});

  const createSessionMutation = useMutation({
    mutationFn: (data: any) =>
      apiRequest("/api/sessions", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions/teacher"] });
      toast({ title: "Session created!", type: "success" });
      setSessionForm({
        subject: "",
        sessionDate: "",
        startTime: "",
        endTime: "",
        studentIds: [],
        title: "",
        description: "",
        meetingUrl: "",
        notes: "",
        status: "scheduled",
      });
      setSessionFormErrors({});
      setCreateSessionOpen(false);
    },
  });

  // Edit session
  const [editSessionForm, setEditSessionForm] = useState({
    id: 0,
    subject: "",
    sessionDate: "",
    startTime: "",
    endTime: "",
    studentIds: [] as number[],
    title: "",
    description: "",
    meetingUrl: "",
    notes: "",
    status: "scheduled",
  });
  const [editSessionFormErrors, setEditSessionFormErrors] = useState<
    Record<string, string>
  >({});

  const validateSessionForm = (
    form: typeof sessionForm,
  ): Record<string, string> => {
    const result = sessionFormSchema.safeParse(form);
    if (result.success) return {};
    const errors: Record<string, string> = {};
    result.error.errors.forEach((err) => {
      if (err.path[0]) {
        errors[err.path[0] as string] = err.message;
      }
    });
    return errors;
  };

  const handleCreateSession = () => {
    const errors = validateSessionForm(sessionForm);
    setSessionFormErrors(errors);
    if (Object.keys(errors).length > 0) return;
    createSessionMutation.mutate(sessionForm);
  };

  const handleUpdateSession = () => {
    const { id, ...formWithoutId } = editSessionForm;
    const errors = validateSessionForm(formWithoutId);
    setEditSessionFormErrors(errors);
    if (Object.keys(errors).length > 0) return;
    updateSessionMutation.mutate(editSessionForm);
  };

  const updateSessionMutation = useMutation({
    mutationFn: ({ id, ...data }: any) =>
      apiRequest(`/api/sessions/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions/teacher"] });
      toast({ title: "Session updated!", type: "success" });
      setEditSessionForm({
        id: 0,
        subject: "",
        sessionDate: "",
        startTime: "",
        endTime: "",
        studentIds: [],
        title: "",
        description: "",
        meetingUrl: "",
        notes: "",
        status: "scheduled",
      });
      setEditSessionFormErrors({});
      setEditSessionOpen(false);
    },
  });

  // Delete session
  const deleteSessionMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest(`/api/sessions/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions/teacher"] });
      toast({ title: "Session deleted!", type: "success" });
    },
  });

  // Messages tab — selected student for thread view (auto-select first on load)
  const [selectedStudentForMessages, setSelectedStudentForMessages] = useState<StudentWithParent | null>(null);

  useEffect(() => {
    if (students.length > 0 && !selectedStudentForMessages) {
      setSelectedStudentForMessages(students[0]);
    }
  }, [students]);

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

  // Generate progress report
  const [reportForm, setReportForm] = useState({
    studentId: 0,
    period: new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" }),
    overallGrade: "",
    comments: "",
    strengths: "",
    improvements: "",
  });

  const generateReportMutation = useMutation({
    mutationFn: (data: any) =>
      apiRequest("/api/progress-reports", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/progress-reports/teacher"],
      });
      toast({ title: "Progress report created!", type: "success" });
      setReportForm({
        studentId: 0,
        period: new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" }),
        overallGrade: "",
        comments: "",
        strengths: "",
        improvements: "",
      });
      setCreateReportOpen(false);
    },
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

  // Create schedule
  const scheduleForm = useForm({
    resolver: zodResolver(scheduleSchema),
    defaultValues: {
      studentId: 0,
      dayOfWeek: "",
      startTime: "",
      endTime: "",
      subject: "",
    },
  });

  const createScheduleMutation = useMutation({
    mutationFn: (data: any) =>
      apiRequest("/api/schedules", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedules/teacher"] });
      toast({ title: "Schedule created!", type: "success" });
      scheduleForm.reset();
      setCreateScheduleOpen(false);
    },
  });

  // Edit schedule
  const [editScheduleForm, setEditScheduleForm] = useState({
    id: 0,
    studentId: 0,
    dayOfWeek: "",
    startTime: "",
    endTime: "",
    subject: "",
  });

  const updateScheduleMutation = useMutation({
    mutationFn: ({ id, ...data }: any) =>
      apiRequest(`/api/schedules/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedules/teacher"] });
      toast({ title: "Schedule updated!", type: "success" });
      setEditScheduleForm({
        id: 0,
        studentId: 0,
        dayOfWeek: "",
        startTime: "",
        endTime: "",
        subject: "",
      });
      setEditScheduleOpen(false);
    },
  });

  // Delete schedule
  const deleteScheduleMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest(`/api/schedules/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedules/teacher"] });
      toast({ title: "Schedule deleted!", type: "success" });
    },
  });

  // Give feedback
  const feedbackForm = useForm({
    resolver: zodResolver(feedbackSchema),
    defaultValues: { studentId: 0, message: "", type: "general" },
  });

  const giveFeedbackMutation = useMutation({
    mutationFn: (data: any) =>
      apiRequest("/api/feedback", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/feedback/teacher"] });
      toast({ title: "Feedback sent!", type: "success" });
      feedbackForm.reset();
      setGiveFeedbackOpen(false);
    },
  });

  // Mark attendance
  const attendanceForm = useForm({
    resolver: zodResolver(attendanceSchema),
    defaultValues: {
      studentId: 0,
      date: new Date().toISOString().split("T")[0],
      status: "present",
      notes: "",
    },
  });

  const markAttendanceMutation = useMutation({
    mutationFn: (data: any) =>
      apiRequest("/api/attendance", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["/api/attendance/student", variables.studentId],
      });
      toast({ title: "Attendance marked!", type: "success" });
      attendanceForm.reset();
      setMarkAttendanceOpen(false);
    },
  });

  const totalEarnings = earnings.reduce(
    (sum: number, e: any) => sum + e.amount,
    0,
  );

  return (
    <div className="min-h-screen bg-background">
      <ModernSidebar />

      <div className="md:ml-[228px] flex">
        <main className="flex-1 p-4 sm:p-6 pt-20 md:pt-6">

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
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Grade</TableHead>
                        <TableHead>Parent</TableHead>
                        <TableHead></TableHead>
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
                          <TableCell>{s.gradeLevel || "-"}</TableCell>
                          <TableCell>
                            {s.parentName ? (
                              <span className="text-sm text-muted-foreground">{s.parentName}</span>
                            ) : (
                              <span className="text-xs text-muted-foreground/50 italic">Unknown</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {s.parentId && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-muted-foreground hover:text-primary"
                                onClick={() => {
                                  setMessageForm({ receiverId: s.parentId, content: "" });
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
                </CardContent>
              </Card>
            </TabsContent>

{/*
            <TabsContent value="sessions">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Sessions</CardTitle>
                  <Dialog
                    open={createSessionOpen}
                    onOpenChange={setCreateSessionOpen}
                  >
                    <DialogTrigger asChild>
                      <Button data-testid="button-create-session">
                        Create Session
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create Session</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Input
                            placeholder="Title *"
                            value={sessionForm.title}
                            onChange={(e) =>
                              setSessionForm({
                                ...sessionForm,
                                title: e.target.value,
                              })
                            }
                            data-testid="input-session-title"
                            className={
                              sessionFormErrors.title ? "border-red-500" : ""
                            }
                          />
                          {sessionFormErrors.title && (
                            <p className="text-sm text-red-500 mt-1">
                              {sessionFormErrors.title}
                            </p>
                          )}
                        </div>
                        <div>
                          <Textarea
                            placeholder="Description *"
                            value={sessionForm.description}
                            onChange={(e) =>
                              setSessionForm({
                                ...sessionForm,
                                description: e.target.value,
                              })
                            }
                            data-testid="input-session-description"
                            className={
                              sessionFormErrors.description
                                ? "border-red-500"
                                : ""
                            }
                          />
                          {sessionFormErrors.description && (
                            <p className="text-sm text-red-500 mt-1">
                              {sessionFormErrors.description}
                            </p>
                          )}
                        </div>
                        <div>
                          <Input
                            placeholder="Subject *"
                            value={sessionForm.subject}
                            onChange={(e) =>
                              setSessionForm({
                                ...sessionForm,
                                subject: e.target.value,
                              })
                            }
                            data-testid="input-session-subject"
                            className={
                              sessionFormErrors.subject ? "border-red-500" : ""
                            }
                          />
                          {sessionFormErrors.subject && (
                            <p className="text-sm text-red-500 mt-1">
                              {sessionFormErrors.subject}
                            </p>
                          )}
                        </div>
                        <div>
                          <Input
                            type="date"
                            value={sessionForm.sessionDate}
                            onChange={(e) =>
                              setSessionForm({
                                ...sessionForm,
                                sessionDate: e.target.value,
                              })
                            }
                            data-testid="input-session-date"
                            className={
                              sessionFormErrors.sessionDate
                                ? "border-red-500"
                                : ""
                            }
                          />
                          {sessionFormErrors.sessionDate && (
                            <p className="text-sm text-red-500 mt-1">
                              {sessionFormErrors.sessionDate}
                            </p>
                          )}
                        </div>
                        <div>
                          <Input
                            type="time"
                            placeholder="Start Time *"
                            value={sessionForm.startTime}
                            onChange={(e) =>
                              setSessionForm({
                                ...sessionForm,
                                startTime: e.target.value,
                              })
                            }
                            data-testid="input-session-start-time"
                            className={
                              sessionFormErrors.startTime
                                ? "border-red-500"
                                : ""
                            }
                          />
                          {sessionFormErrors.startTime && (
                            <p className="text-sm text-red-500 mt-1">
                              {sessionFormErrors.startTime}
                            </p>
                          )}
                        </div>
                        <div>
                          <Input
                            type="time"
                            placeholder="End Time *"
                            value={sessionForm.endTime}
                            onChange={(e) =>
                              setSessionForm({
                                ...sessionForm,
                                endTime: e.target.value,
                              })
                            }
                            data-testid="input-session-end-time"
                            className={
                              sessionFormErrors.endTime ? "border-red-500" : ""
                            }
                          />
                          {sessionFormErrors.endTime && (
                            <p className="text-sm text-red-500 mt-1">
                              {sessionFormErrors.endTime}
                            </p>
                          )}
                        </div>
                        <div>
                          <Input
                            placeholder="Meeting URL *"
                            value={sessionForm.meetingUrl}
                            onChange={(e) =>
                              setSessionForm({
                                ...sessionForm,
                                meetingUrl: e.target.value,
                              })
                            }
                            data-testid="input-session-meeting-url"
                            className={
                              sessionFormErrors.meetingUrl
                                ? "border-red-500"
                                : ""
                            }
                          />
                          {sessionFormErrors.meetingUrl && (
                            <p className="text-sm text-red-500 mt-1">
                              {sessionFormErrors.meetingUrl}
                            </p>
                          )}
                        </div>
                        <div>
                          <Textarea
                            placeholder="Notes (optional)"
                            value={sessionForm.notes}
                            onChange={(e) =>
                              setSessionForm({
                                ...sessionForm,
                                notes: e.target.value,
                              })
                            }
                            data-testid="input-session-notes"
                          />
                        </div>
                        <Button
                          onClick={handleCreateSession}
                          disabled={createSessionMutation.isPending}
                          className="w-full"
                          data-testid="button-submit-session"
                        >
                          {createSessionMutation.isPending
                            ? "Creating..."
                            : "Create"}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Subject</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>Meeting URL</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sessions.map((s: any) => (
                        <TableRow
                          key={s.id}
                          data-testid={`row-session-${s.id}`}
                        >
                          <TableCell>{s.subject}</TableCell>
                          <TableCell>
                            {s.sessionDate
                              ? new Date(s.sessionDate).toLocaleDateString()
                              : "N/A"}
                          </TableCell>
                          <TableCell>
                            {s.startTime} - {s.endTime}
                          </TableCell>
                          <TableCell>
                            {s.meetingUrl ? (
                              <a
                                href={s.meetingUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline"
                                data-testid={`link-meeting-url-${s.id}`}
                              >
                                Join Meeting
                              </a>
                            ) : (
                              <span className="text-gray-400">No URL</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge>{s.status}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setEditSessionForm({
                                    id: s.id,
                                    subject: s.subject,
                                    sessionDate: s.sessionDate || "",
                                    startTime: s.startTime,
                                    endTime: s.endTime,
                                    studentIds: s.studentIds || [],
                                    title: s.title || "",
                                    description: s.description || "",
                                    meetingUrl: s.meetingUrl || "",
                                    notes: s.notes || "",
                                    status: s.status,
                                  });
                                  setEditSessionOpen(true);
                                }}
                                data-testid={`button-edit-session-${s.id}`}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => {
                                  if (
                                    confirm(
                                      "Are you sure you want to delete this session?",
                                    )
                                  ) {
                                    deleteSessionMutation.mutate(s.id);
                                  }
                                }}
                                data-testid={`button-delete-session-${s.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  <Dialog
                    open={editSessionOpen}
                    onOpenChange={setEditSessionOpen}
                  >
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Edit Session</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Input
                            placeholder="Title *"
                            value={editSessionForm.title}
                            onChange={(e) =>
                              setEditSessionForm({
                                ...editSessionForm,
                                title: e.target.value,
                              })
                            }
                            data-testid="input-edit-session-title"
                            className={
                              editSessionFormErrors.title
                                ? "border-red-500"
                                : ""
                            }
                          />
                          {editSessionFormErrors.title && (
                            <p className="text-sm text-red-500 mt-1">
                              {editSessionFormErrors.title}
                            </p>
                          )}
                        </div>
                        <div>
                          <Textarea
                            placeholder="Description *"
                            value={editSessionForm.description}
                            onChange={(e) =>
                              setEditSessionForm({
                                ...editSessionForm,
                                description: e.target.value,
                              })
                            }
                            data-testid="input-edit-session-description"
                            className={
                              editSessionFormErrors.description
                                ? "border-red-500"
                                : ""
                            }
                          />
                          {editSessionFormErrors.description && (
                            <p className="text-sm text-red-500 mt-1">
                              {editSessionFormErrors.description}
                            </p>
                          )}
                        </div>
                        <div>
                          <Input
                            placeholder="Subject *"
                            value={editSessionForm.subject}
                            onChange={(e) =>
                              setEditSessionForm({
                                ...editSessionForm,
                                subject: e.target.value,
                              })
                            }
                            data-testid="input-edit-session-subject"
                            className={
                              editSessionFormErrors.subject
                                ? "border-red-500"
                                : ""
                            }
                          />
                          {editSessionFormErrors.subject && (
                            <p className="text-sm text-red-500 mt-1">
                              {editSessionFormErrors.subject}
                            </p>
                          )}
                        </div>
                        <div>
                          <Input
                            type="date"
                            placeholder="Session Date *"
                            value={editSessionForm.sessionDate}
                            onChange={(e) =>
                              setEditSessionForm({
                                ...editSessionForm,
                                sessionDate: e.target.value,
                              })
                            }
                            data-testid="input-edit-session-date"
                            className={
                              editSessionFormErrors.sessionDate
                                ? "border-red-500"
                                : ""
                            }
                          />
                          {editSessionFormErrors.sessionDate && (
                            <p className="text-sm text-red-500 mt-1">
                              {editSessionFormErrors.sessionDate}
                            </p>
                          )}
                        </div>
                        <div>
                          <Input
                            type="time"
                            placeholder="Start Time *"
                            value={editSessionForm.startTime}
                            onChange={(e) =>
                              setEditSessionForm({
                                ...editSessionForm,
                                startTime: e.target.value,
                              })
                            }
                            data-testid="input-edit-session-start-time"
                            className={
                              editSessionFormErrors.startTime
                                ? "border-red-500"
                                : ""
                            }
                          />
                          {editSessionFormErrors.startTime && (
                            <p className="text-sm text-red-500 mt-1">
                              {editSessionFormErrors.startTime}
                            </p>
                          )}
                        </div>
                        <div>
                          <Input
                            type="time"
                            placeholder="End Time *"
                            value={editSessionForm.endTime}
                            onChange={(e) =>
                              setEditSessionForm({
                                ...editSessionForm,
                                endTime: e.target.value,
                              })
                            }
                            data-testid="input-edit-session-end-time"
                            className={
                              editSessionFormErrors.endTime
                                ? "border-red-500"
                                : ""
                            }
                          />
                          {editSessionFormErrors.endTime && (
                            <p className="text-sm text-red-500 mt-1">
                              {editSessionFormErrors.endTime}
                            </p>
                          )}
                        </div>
                        <div>
                          <Input
                            placeholder="Meeting URL *"
                            value={editSessionForm.meetingUrl}
                            onChange={(e) =>
                              setEditSessionForm({
                                ...editSessionForm,
                                meetingUrl: e.target.value,
                              })
                            }
                            data-testid="input-edit-session-meeting-url"
                            className={
                              editSessionFormErrors.meetingUrl
                                ? "border-red-500"
                                : ""
                            }
                          />
                          {editSessionFormErrors.meetingUrl && (
                            <p className="text-sm text-red-500 mt-1">
                              {editSessionFormErrors.meetingUrl}
                            </p>
                          )}
                        </div>
                        <div>
                          <Textarea
                            placeholder="Notes (optional)"
                            value={editSessionForm.notes}
                            onChange={(e) =>
                              setEditSessionForm({
                                ...editSessionForm,
                                notes: e.target.value,
                              })
                            }
                            data-testid="input-edit-session-notes"
                          />
                        </div>
                        <Button
                          onClick={handleUpdateSession}
                          disabled={updateSessionMutation.isPending}
                          className="w-full"
                          data-testid="button-update-session"
                        >
                          {updateSessionMutation.isPending
                            ? "Updating..."
                            : "Update"}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            </TabsContent>
*/}

{/*
            <TabsContent value="schedule">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Student Schedules</CardTitle>
                  <Dialog
                    open={createScheduleOpen}
                    onOpenChange={setCreateScheduleOpen}
                  >
                    <DialogTrigger asChild>
                      <Button data-testid="button-create-schedule">
                        <Clock className="h-4 w-4 mr-2" />
                        Create Schedule
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create New Schedule</DialogTitle>
                      </DialogHeader>
                      <Form {...scheduleForm}>
                        <form
                          onSubmit={scheduleForm.handleSubmit((data) =>
                            createScheduleMutation.mutate(data),
                          )}
                          className="space-y-4"
                        >
                          <FormField
                            control={scheduleForm.control}
                            name="studentId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Student</FormLabel>
                                <FormControl>
                                  <Select
                                    onValueChange={(v) =>
                                      field.onChange(parseInt(v))
                                    }
                                    value={field.value.toString()}
                                  >
                                    <SelectTrigger data-testid="select-schedule-student">
                                      <SelectValue placeholder="Select a student" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {students.map((s: any) => (
                                        <SelectItem
                                          key={s.id}
                                          value={s.id.toString()}
                                        >
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
                            control={scheduleForm.control}
                            name="dayOfWeek"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Day of Week</FormLabel>
                                <FormControl>
                                  <Select
                                    onValueChange={field.onChange}
                                    value={field.value}
                                  >
                                    <SelectTrigger data-testid="select-day-of-week">
                                      <SelectValue placeholder="Select a day" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="Monday">
                                        Monday
                                      </SelectItem>
                                      <SelectItem value="Tuesday">
                                        Tuesday
                                      </SelectItem>
                                      <SelectItem value="Wednesday">
                                        Wednesday
                                      </SelectItem>
                                      <SelectItem value="Thursday">
                                        Thursday
                                      </SelectItem>
                                      <SelectItem value="Friday">
                                        Friday
                                      </SelectItem>
                                      <SelectItem value="Saturday">
                                        Saturday
                                      </SelectItem>
                                      <SelectItem value="Sunday">
                                        Sunday
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={scheduleForm.control}
                            name="startTime"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Start Time</FormLabel>
                                <FormControl>
                                  <Input
                                    type="time"
                                    {...field}
                                    data-testid="input-schedule-start-time"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={scheduleForm.control}
                            name="endTime"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>End Time</FormLabel>
                                <FormControl>
                                  <Input
                                    type="time"
                                    {...field}
                                    data-testid="input-schedule-end-time"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={scheduleForm.control}
                            name="subject"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Subject</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="Subject"
                                    {...field}
                                    data-testid="input-schedule-subject"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <Button
                            type="submit"
                            disabled={createScheduleMutation.isPending}
                            className="w-full"
                            data-testid="button-submit-schedule"
                          >
                            {createScheduleMutation.isPending
                              ? "Creating..."
                              : "Create Schedule"}
                          </Button>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent>
                  {schedulesQuery.isLoading ? (
                    <div className="text-center py-8">Loading schedules...</div>
                  ) : schedulesQuery.isError ? (
                    <div className="text-center py-8 text-red-500">
                      Error loading schedules
                    </div>
                  ) : schedules.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No schedules created yet
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Student</TableHead>
                          <TableHead>Day</TableHead>
                          <TableHead>Time</TableHead>
                          <TableHead>Subject</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {schedules.map((s: any) => (
                          <TableRow
                            key={s.id}
                            data-testid={`row-schedule-${s.id}`}
                          >
                            <TableCell
                              data-testid={`text-schedule-student-${s.id}`}
                            >
                              {students.find((st: any) => st.id === s.studentId)
                                ?.name || `Student #${s.studentId}`}
                            </TableCell>
                            <TableCell>{s.dayOfWeek}</TableCell>
                            <TableCell>
                              {s.startTime} - {s.endTime}
                            </TableCell>
                            <TableCell>{s.subject}</TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setEditScheduleForm({
                                      id: s.id,
                                      studentId: s.studentId,
                                      dayOfWeek: s.dayOfWeek,
                                      startTime: s.startTime,
                                      endTime: s.endTime,
                                      subject: s.subject,
                                    });
                                    setEditScheduleOpen(true);
                                  }}
                                  data-testid={`button-edit-schedule-${s.id}`}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => {
                                    if (
                                      confirm(
                                        "Are you sure you want to delete this schedule?",
                                      )
                                    ) {
                                      deleteScheduleMutation.mutate(s.id);
                                    }
                                  }}
                                  data-testid={`button-delete-schedule-${s.id}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}

                  <Dialog
                    open={editScheduleOpen}
                    onOpenChange={setEditScheduleOpen}
                  >
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Edit Schedule</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium">Student</label>
                          <Select
                            value={editScheduleForm.studentId.toString()}
                            onValueChange={(value) =>
                              setEditScheduleForm({
                                ...editScheduleForm,
                                studentId: parseInt(value),
                              })
                            }
                          >
                            <SelectTrigger data-testid="select-edit-schedule-student">
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
                        </div>
                        <div>
                          <label className="text-sm font-medium">
                            Day of Week
                          </label>
                          <Select
                            value={editScheduleForm.dayOfWeek}
                            onValueChange={(value) =>
                              setEditScheduleForm({
                                ...editScheduleForm,
                                dayOfWeek: value,
                              })
                            }
                          >
                            <SelectTrigger data-testid="select-edit-day-of-week">
                              <SelectValue placeholder="Select a day" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Monday">Monday</SelectItem>
                              <SelectItem value="Tuesday">Tuesday</SelectItem>
                              <SelectItem value="Wednesday">
                                Wednesday
                              </SelectItem>
                              <SelectItem value="Thursday">Thursday</SelectItem>
                              <SelectItem value="Friday">Friday</SelectItem>
                              <SelectItem value="Saturday">Saturday</SelectItem>
                              <SelectItem value="Sunday">Sunday</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-sm font-medium">
                            Start Time
                          </label>
                          <Input
                            type="time"
                            value={editScheduleForm.startTime}
                            onChange={(e) =>
                              setEditScheduleForm({
                                ...editScheduleForm,
                                startTime: e.target.value,
                              })
                            }
                            data-testid="input-edit-schedule-start-time"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">
                            End Time
                          </label>
                          <Input
                            type="time"
                            value={editScheduleForm.endTime}
                            onChange={(e) =>
                              setEditScheduleForm({
                                ...editScheduleForm,
                                endTime: e.target.value,
                              })
                            }
                            data-testid="input-edit-schedule-end-time"
                          />
                        </div>
                        <Input
                          placeholder="Subject"
                          value={editScheduleForm.subject}
                          onChange={(e) =>
                            setEditScheduleForm({
                              ...editScheduleForm,
                              subject: e.target.value,
                            })
                          }
                          data-testid="input-edit-schedule-subject"
                        />
                        <Button
                          onClick={() =>
                            updateScheduleMutation.mutate(editScheduleForm)
                          }
                          disabled={updateScheduleMutation.isPending}
                          className="w-full"
                          data-testid="button-update-schedule"
                        >
                          {updateScheduleMutation.isPending
                            ? "Updating..."
                            : "Update Schedule"}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            </TabsContent>
*/}

            <TabsContent value="feedback">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Student Feedback</CardTitle>
                  <Dialog
                    open={giveFeedbackOpen}
                    onOpenChange={setGiveFeedbackOpen}
                  >
                    <DialogTrigger asChild>
                      <Button data-testid="button-give-feedback">
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Give Feedback
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Give Student Feedback</DialogTitle>
                      </DialogHeader>
                      <Form {...feedbackForm}>
                        <form
                          onSubmit={feedbackForm.handleSubmit((data) =>
                            giveFeedbackMutation.mutate(data),
                          )}
                          className="space-y-4"
                        >
                          <FormField
                            control={feedbackForm.control}
                            name="studentId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Student</FormLabel>
                                <FormControl>
                                  <Select
                                    onValueChange={(v) =>
                                      field.onChange(parseInt(v))
                                    }
                                    value={field.value.toString()}
                                  >
                                    <SelectTrigger data-testid="select-feedback-student">
                                      <SelectValue placeholder="Select a student" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {students.map((s: any) => (
                                        <SelectItem
                                          key={s.id}
                                          value={s.id.toString()}
                                        >
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
                            control={feedbackForm.control}
                            name="type"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Feedback Type</FormLabel>
                                <FormControl>
                                  <Select
                                    onValueChange={field.onChange}
                                    value={field.value}
                                  >
                                    <SelectTrigger data-testid="select-feedback-type">
                                      <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="positive">
                                        Positive
                                      </SelectItem>
                                      <SelectItem value="constructive">
                                        Constructive
                                      </SelectItem>
                                      <SelectItem value="general">
                                        General
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={feedbackForm.control}
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
                            disabled={giveFeedbackMutation.isPending}
                            className="w-full"
                            data-testid="button-submit-feedback"
                          >
                            {giveFeedbackMutation.isPending
                              ? "Sending..."
                              : "Send Feedback"}
                          </Button>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
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
                      {feedbacks.map((f: any) => (
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
                                  {students.find(
                                    (st: any) => st.id === f.studentId,
                                  )?.name || `Student #${f.studentId}`}
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

{/*
            <TabsContent value="attendance">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Mark Student Attendance</CardTitle>
                  <Dialog
                    open={markAttendanceOpen}
                    onOpenChange={setMarkAttendanceOpen}
                  >
                    <DialogTrigger asChild>
                      <Button data-testid="button-mark-attendance">
                        <Calendar className="h-4 w-4 mr-2" />
                        Mark Attendance
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Mark Attendance</DialogTitle>
                      </DialogHeader>
                      <Form {...attendanceForm}>
                        <form
                          onSubmit={attendanceForm.handleSubmit((data) =>
                            markAttendanceMutation.mutate(data),
                          )}
                          className="space-y-4"
                        >
                          <FormField
                            control={attendanceForm.control}
                            name="studentId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Student</FormLabel>
                                <FormControl>
                                  <Select
                                    onValueChange={(v) =>
                                      field.onChange(parseInt(v))
                                    }
                                    value={field.value.toString()}
                                  >
                                    <SelectTrigger data-testid="select-attendance-student">
                                      <SelectValue placeholder="Select a student" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {students.map((s: any) => (
                                        <SelectItem
                                          key={s.id}
                                          value={s.id.toString()}
                                        >
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
                            control={attendanceForm.control}
                            name="date"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Date</FormLabel>
                                <FormControl>
                                  <Input
                                    type="date"
                                    {...field}
                                    data-testid="input-attendance-date"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={attendanceForm.control}
                            name="status"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Status</FormLabel>
                                <FormControl>
                                  <Select
                                    onValueChange={field.onChange}
                                    value={field.value}
                                  >
                                    <SelectTrigger data-testid="select-attendance-status">
                                      <SelectValue placeholder="Select status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="present">
                                        Present
                                      </SelectItem>
                                      <SelectItem value="absent">
                                        Absent
                                      </SelectItem>
                                      <SelectItem value="late">Late</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={attendanceForm.control}
                            name="notes"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Notes (Optional)</FormLabel>
                                <FormControl>
                                  <Textarea
                                    placeholder="Additional notes..."
                                    rows={3}
                                    {...field}
                                    data-testid="input-attendance-notes"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <Button
                            type="submit"
                            disabled={markAttendanceMutation.isPending}
                            className="w-full"
                            data-testid="button-submit-attendance"
                          >
                            {markAttendanceMutation.isPending
                              ? "Saving..."
                              : "Mark Attendance"}
                          </Button>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">
                        Select Student to View Attendance
                      </label>
                      <select
                        className="w-full mt-1 p-2 border rounded-md"
                        value={selectedStudentForAttendance || 0}
                        onChange={(e) =>
                          setSelectedStudentForAttendance(
                            parseInt(e.target.value) || null,
                          )
                        }
                        data-testid="select-view-attendance-student"
                      >
                        <option value={0}>Select a student</option>
                        {students.map((s: any) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {selectedStudentForAttendance && (
                      <div className="mt-6">
                        <h3 className="text-lg font-semibold mb-4">
                          Attendance Records for{" "}
                          {
                            students.find(
                              (s: any) => s.id === selectedStudentForAttendance,
                            )?.name
                          }
                        </h3>
                        {attendanceQuery.isLoading ? (
                          <div className="text-center py-8">
                            Loading attendance...
                          </div>
                        ) : attendanceQuery.isError ? (
                          <div className="text-center py-8 text-red-500">
                            Error loading attendance
                          </div>
                        ) : attendanceRecords.length === 0 ? (
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
                              {attendanceRecords.map((a: any) => (
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
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
*/}

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

{/*
            <TabsContent value="reports">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Progress Reports & Analytics</CardTitle>
                  <Dialog
                    open={createReportOpen}
                    onOpenChange={setCreateReportOpen}
                  >
                    <DialogTrigger asChild>
                      <Button data-testid="button-create-report">
                        <BarChart className="h-4 w-4 mr-2" />
                        Create Report
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Generate Progress Report</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium">
                            Select Student
                          </label>
                          <select
                            className="w-full mt-1 p-2 border rounded-md"
                            value={reportForm.studentId}
                            onChange={(e) =>
                              setReportForm({
                                ...reportForm,
                                studentId: parseInt(e.target.value),
                              })
                            }
                            data-testid="select-report-student"
                          >
                            <option value={0}>Select a student</option>
                            {students.map((s: any) => (
                              <option key={s.id} value={s.id}>
                                {s.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-sm font-medium">
                            Period
                          </label>
                          <Input
                            placeholder="e.g. March 2026, Q1 2026, Week 3"
                            value={reportForm.period}
                            onChange={(e) =>
                              setReportForm({
                                ...reportForm,
                                period: e.target.value,
                              })
                            }
                            data-testid="input-report-period"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">
                            Overall Grade
                          </label>
                          <Input
                            placeholder="e.g., A, B+, 85%"
                            value={reportForm.overallGrade}
                            onChange={(e) =>
                              setReportForm({
                                ...reportForm,
                                overallGrade: e.target.value,
                              })
                            }
                            data-testid="input-overall-grade"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">
                            Comments
                          </label>
                          <Textarea
                            placeholder="General comments about student performance..."
                            value={reportForm.comments}
                            onChange={(e) =>
                              setReportForm({
                                ...reportForm,
                                comments: e.target.value,
                              })
                            }
                            rows={3}
                            data-testid="input-report-comments"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">
                            Strengths
                          </label>
                          <Textarea
                            placeholder="List student's strengths..."
                            value={reportForm.strengths}
                            onChange={(e) =>
                              setReportForm({
                                ...reportForm,
                                strengths: e.target.value,
                              })
                            }
                            rows={2}
                            data-testid="input-report-strengths"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">
                            Areas for Improvement
                          </label>
                          <Textarea
                            placeholder="List areas where student can improve..."
                            value={reportForm.improvements}
                            onChange={(e) =>
                              setReportForm({
                                ...reportForm,
                                improvements: e.target.value,
                              })
                            }
                            rows={2}
                            data-testid="input-report-improvements"
                          />
                        </div>
                        <Button
                          onClick={() =>
                            generateReportMutation.mutate(reportForm)
                          }
                          disabled={
                            !reportForm.studentId ||
                            generateReportMutation.isPending
                          }
                          className="w-full"
                          data-testid="button-generate-report"
                        >
                          {generateReportMutation.isPending
                            ? "Generating..."
                            : "Generate Report"}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-center">
                            <p className="text-sm text-muted-foreground">
                              Total Reports
                            </p>
                            <p className="text-3xl font-bold">
                              {progressReports.length}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-center">
                            <p className="text-sm text-muted-foreground">
                              Students Tracked
                            </p>
                            <p className="text-3xl font-bold">
                              {students.length}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-center">
                            <p className="text-sm text-muted-foreground">
                              Total Earnings
                            </p>
                            <p className="text-3xl font-bold">
                              ${totalEarnings}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    <h3 className="text-lg font-semibold mb-3">
                      Recent Progress Reports
                    </h3>
                    {progressReports.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">
                        No reports generated yet
                      </p>
                    ) : (
                      progressReports.map((report: any) => (
                        <div
                          key={report.id}
                          className="p-4 border rounded-lg"
                          data-testid={`card-report-${report.id}`}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="font-medium">
                                  {report.period || `Report #${report.id}`}
                                </h4>
                                {report.grades?.Overall !== undefined && (
                                  <Badge>{report.grades.Overall}%</Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {report.date
                                  ? new Date(report.date).toLocaleDateString()
                                  : "Date unknown"}
                              </p>
                              {report.content && (
                                <p className="text-sm mt-2 text-foreground line-clamp-3">
                                  {report.content}
                                </p>
                              )}
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => downloadReport(report)}
                              data-testid={`button-download-${report.id}`}
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Download
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
*/}

            <TabsContent value="classrooms">
              <TeacherClassroomsTab />
            </TabsContent>

            <TabsContent value="messages">
              <div className="overflow-hidden bg-background">
                <div className="flex flex-col md:flex-row h-auto md:h-screen">
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

      {/* Standalone send-message dialog — opened by "Message parent" button in students tab */}
      <Dialog open={sendMessageOpen} onOpenChange={setSendMessageOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Message</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">To</label>
              {messageForm.receiverId ? (
                <div className="flex items-center gap-2 px-3 py-2 rounded-md border bg-muted/40 text-sm">
                  <span className="font-medium">
                    {users.find((u) => u.id === messageForm.receiverId)?.name || `User #${messageForm.receiverId}`}
                  </span>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {users.find((u) => u.id === messageForm.receiverId)?.email}
                  </span>
                </div>
              ) : (
                <ModernCombobox
                  users={users}
                  selectedUserId={messageForm.receiverId}
                  onSelect={(userId) => setMessageForm({ ...messageForm, receiverId: userId })}
                  placeholder="Search users..."
                  testId="select-receiver-teacher"
                />
              )}
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
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setSendMessageOpen(false);
                  setMessageForm({ receiverId: 0, content: "" });
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => sendMessageMutation.mutate(messageForm)}
                disabled={sendMessageMutation.isPending || !messageForm.receiverId || !messageForm.content}
                data-testid="button-send-message"
              >
                <Send className="w-4 h-4 mr-2" />
                {sendMessageMutation.isPending ? "Sending..." : "Send"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

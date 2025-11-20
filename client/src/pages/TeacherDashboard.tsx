import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { BookOpen, Users, Calendar, DollarSign, FileText, LogOut, MessageSquare, Send, BarChart, Download, Edit, Trash2, Clock, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ModernSidebar from "@/components/ModernSidebar";
import WelcomeCard from "@/components/WelcomeCard";
import ColorfulStatCard from "@/components/ColorfulStatCard";
import ModernCombobox from "@/components/ModernCombobox";

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

export default function TeacherDashboard() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState(() => {
    const hash = window.location.hash.replace('#', '');
    return hash || "overview";
  });

  // Listen to hash changes from sidebar navigation
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash) setActiveTab(hash);
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);
  
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

  // Fetch data
  const { data: students = [] } = useQuery({ queryKey: ["/api/students/teacher"] });
  const { data: assignments = [] } = useQuery({ queryKey: ["/api/assignments/teacher"] });
  const { data: materials = [] } = useQuery({ queryKey: ["/api/materials/teacher"] });
  const { data: sessions = [] } = useQuery({ queryKey: ["/api/sessions/teacher"] });
  const { data: tutorRequests = [] } = useQuery({ queryKey: ["/api/tutor-requests/teacher"] });
  const { data: earnings = [] } = useQuery({ queryKey: ["/api/earnings/teacher"] });
  const { data: messages = [] } = useQuery({ queryKey: ["/api/messages"] });
  const { data: progressReports = [] } = useQuery({ queryKey: ["/api/progress-reports/teacher"] });
  const { data: users = [] } = useQuery({ queryKey: ["/api/users"] });
  const schedulesQuery = useQuery({ queryKey: ["/api/schedules/teacher"] });
  const feedbacksQuery = useQuery({ queryKey: ["/api/feedback/teacher"] });
  
  const [selectedStudentForAttendance, setSelectedStudentForAttendance] = useState<number | null>(null);
  const attendanceQuery = useQuery({
    queryKey: ["/api/attendance/student", selectedStudentForAttendance],
    enabled: !!selectedStudentForAttendance,
  });
  
  const schedules = schedulesQuery.data || [];
  const feedbacks = feedbacksQuery.data || [];
  const attendanceRecords = attendanceQuery.data || [];

  // Create assignment
  const [assignmentForm, setAssignmentForm] = useState({
    title: "", description: "", subject: "", dueDate: "", gradeLevel: "", points: 100
  });

  const createAssignmentMutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/assignments", {
      method: "POST",
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assignments/teacher"] });
      toast({ title: "Assignment created!", type: "success" });
      setAssignmentForm({ title: "", description: "", subject: "", dueDate: "", gradeLevel: "", points: 100 });
      setCreateAssignmentOpen(false);
    },
  });

  // Edit assignment
  const [editAssignmentForm, setEditAssignmentForm] = useState({
    id: 0, title: "", description: "", subject: "", dueDate: "", gradeLevel: "", points: 100, fileUrl: ""
  });

  const updateAssignmentMutation = useMutation({
    mutationFn: ({ id, ...data }: any) => apiRequest(`/api/assignments/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assignments/teacher"] });
      toast({ title: "Assignment updated!", type: "success" });
      setEditAssignmentForm({ id: 0, title: "", description: "", subject: "", dueDate: "", gradeLevel: "", points: 100, fileUrl: "" });
      setEditAssignmentOpen(false);
    },
  });

  // Delete assignment
  const deleteAssignmentMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/assignments/${id}`, {
      method: "DELETE",
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assignments/teacher"] });
      toast({ title: "Assignment deleted!", type: "success" });
    },
  });

  // Upload material
  const [materialForm, setMaterialForm] = useState({
    title: "", description: "", fileUrl: "", subject: "", gradeLevel: ""
  });

  const uploadMaterialMutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/materials", {
      method: "POST",
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/materials/teacher"] });
      toast({ title: "Material uploaded!", type: "success" });
      setMaterialForm({ title: "", description: "", fileUrl: "", subject: "", gradeLevel: "" });
      setUploadMaterialOpen(false);
    },
  });

  // Edit material
  const [editMaterialForm, setEditMaterialForm] = useState({
    id: 0, title: "", description: "", fileUrl: "", subject: "", gradeLevel: ""
  });

  const updateMaterialMutation = useMutation({
    mutationFn: ({ id, ...data }: any) => apiRequest(`/api/materials/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/materials/teacher"] });
      toast({ title: "Material updated!", type: "success" });
      setEditMaterialForm({ id: 0, title: "", description: "", fileUrl: "", subject: "", gradeLevel: "" });
      setEditMaterialOpen(false);
    },
  });

  // Delete material
  const deleteMaterialMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/materials/${id}`, {
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
      queryClient.invalidateQueries({ queryKey: ["/api/tutor-requests/teacher"] });
      toast({ title: "Request updated!", type: "success" });
    },
  });

  // Create session
  const [sessionForm, setSessionForm] = useState({
    subject: "", sessionDate: "", startTime: "", endTime: "", studentIds: [] as number[], 
    title: "", description: "", meetingUrl: "", notes: "", status: "scheduled"
  });

  const createSessionMutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/sessions", {
      method: "POST",
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions/teacher"] });
      toast({ title: "Session created!", type: "success" });
      setSessionForm({ subject: "", sessionDate: "", startTime: "", endTime: "", studentIds: [], 
        title: "", description: "", meetingUrl: "", notes: "", status: "scheduled" });
      setCreateSessionOpen(false);
    },
  });

  // Edit session
  const [editSessionForm, setEditSessionForm] = useState({
    id: 0, subject: "", sessionDate: "", startTime: "", endTime: "", studentIds: [] as number[], 
    title: "", description: "", meetingUrl: "", notes: "", status: "scheduled"
  });

  const updateSessionMutation = useMutation({
    mutationFn: ({ id, ...data }: any) => apiRequest(`/api/sessions/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions/teacher"] });
      toast({ title: "Session updated!", type: "success" });
      setEditSessionForm({ id: 0, subject: "", sessionDate: "", startTime: "", endTime: "", studentIds: [], 
        title: "", description: "", meetingUrl: "", notes: "", status: "scheduled" });
      setEditSessionOpen(false);
    },
  });

  // Delete session
  const deleteSessionMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/sessions/${id}`, {
      method: "DELETE",
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions/teacher"] });
      toast({ title: "Session deleted!", type: "success" });
    },
  });

  // Send message
  const [messageForm, setMessageForm] = useState({
    receiverId: 0,
    content: ""
  });

  const sendMessageMutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/messages", {
      method: "POST",
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      toast({ title: "Message sent!", type: "success" });
      setMessageForm({ receiverId: 0, content: "" });
      setSendMessageOpen(false);
    },
  });

  // Generate progress report
  const [reportForm, setReportForm] = useState({
    studentId: 0,
    reportDate: new Date().toISOString().split('T')[0],
    overallGrade: "",
    comments: "",
    strengths: "",
    improvements: ""
  });

  const generateReportMutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/progress-reports", {
      method: "POST",
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/progress-reports/teacher"] });
      toast({ title: "Progress report created!", type: "success" });
      setReportForm({
        studentId: 0,
        reportDate: new Date().toISOString().split('T')[0],
        overallGrade: "",
        comments: "",
        strengths: "",
        improvements: ""
      });
      setCreateReportOpen(false);
    },
  });

  // Download report as JSON
  const downloadReport = (report: any) => {
    const dataStr = JSON.stringify(report, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `progress-report-${report.id}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Create schedule
  const scheduleForm = useForm({
    resolver: zodResolver(scheduleSchema),
    defaultValues: { studentId: 0, dayOfWeek: "", startTime: "", endTime: "", subject: "" },
  });

  const createScheduleMutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/schedules", {
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
    id: 0, studentId: 0, dayOfWeek: "", startTime: "", endTime: "", subject: ""
  });

  const updateScheduleMutation = useMutation({
    mutationFn: ({ id, ...data }: any) => apiRequest(`/api/schedules/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedules/teacher"] });
      toast({ title: "Schedule updated!", type: "success" });
      setEditScheduleForm({ id: 0, studentId: 0, dayOfWeek: "", startTime: "", endTime: "", subject: "" });
      setEditScheduleOpen(false);
    },
  });

  // Delete schedule
  const deleteScheduleMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/schedules/${id}`, {
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
    mutationFn: (data: any) => apiRequest("/api/feedback", {
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
    defaultValues: { studentId: 0, date: new Date().toISOString().split('T')[0], status: "present", notes: "" },
  });

  const markAttendanceMutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/attendance", {
      method: "POST",
      body: JSON.stringify(data),
    }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/student", variables.studentId] });
      toast({ title: "Attendance marked!", type: "success" });
      attendanceForm.reset();
      setMarkAttendanceOpen(false);
    },
  });

  const totalEarnings = earnings.reduce((sum: number, e: any) => sum + e.amount, 0);

  return (
    <div className="min-h-screen bg-background">
      <ModernSidebar />
      
      <div className="ml-24 flex">
        <main className="flex-1 p-8 max-w-6xl">
          <WelcomeCard
            name={user?.name || "Teacher"}
            message="Ready to inspire and educate! Let's help your students reach their full potential."
            buttonText="Today's Schedule"
            onButtonClick={() => setActiveTab("schedule")}
          />

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-8">
            <ColorfulStatCard
              title="Students"
              value={students.length}
              icon={Users}
              color="purple"
              lightColor="light-purple"
              subtitle="Active students"
            />
            <ColorfulStatCard
              title="Assignments"
              value={assignments.length}
              icon={FileText}
              color="green"
              lightColor="light-green"
              subtitle="Total created"
            />
            <ColorfulStatCard
              title="Sessions"
              value={sessions.length}
              icon={Calendar}
              color="coral"
              lightColor="light-coral"
              subtitle="Scheduled"
            />
            <ColorfulStatCard
              title="Earnings"
              value={`$${totalEarnings}`}
              icon={DollarSign}
              color="orange"
              lightColor="light-orange"
              subtitle="Total earned"
            />
          </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="assignments" data-testid="tab-assignments">Assignments</TabsTrigger>
            <TabsTrigger value="materials" data-testid="tab-materials">Materials</TabsTrigger>
            <TabsTrigger value="students" data-testid="tab-students">Students</TabsTrigger>
            <TabsTrigger value="sessions" data-testid="tab-sessions">Sessions</TabsTrigger>
            <TabsTrigger value="schedule" data-testid="tab-schedule">Schedule</TabsTrigger>
            <TabsTrigger value="feedback" data-testid="tab-feedback">Feedback</TabsTrigger>
            <TabsTrigger value="attendance" data-testid="tab-attendance">Attendance</TabsTrigger>
            <TabsTrigger value="requests" data-testid="tab-requests">Tutor Requests</TabsTrigger>
            <TabsTrigger value="reports" data-testid="tab-reports">Progress Reports</TabsTrigger>
            <TabsTrigger value="messages" data-testid="tab-messages">Messages</TabsTrigger>
          </TabsList>

          <TabsContent value="assignments">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Assignments</CardTitle>
                <Dialog open={createAssignmentOpen} onOpenChange={setCreateAssignmentOpen}>
                  <DialogTrigger asChild>
                    <Button data-testid="button-create-assignment">Create Assignment</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New Assignment</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Input
                        placeholder="Title"
                        value={assignmentForm.title}
                        onChange={(e) => setAssignmentForm({ ...assignmentForm, title: e.target.value })}
                        data-testid="input-assignment-title"
                      />
                      <Textarea
                        placeholder="Description"
                        value={assignmentForm.description}
                        onChange={(e) => setAssignmentForm({ ...assignmentForm, description: e.target.value })}
                        data-testid="input-assignment-description"
                      />
                      <Input
                        placeholder="Subject"
                        value={assignmentForm.subject}
                        onChange={(e) => setAssignmentForm({ ...assignmentForm, subject: e.target.value })}
                        data-testid="input-assignment-subject"
                      />
                      <Input
                        type="date"
                        value={assignmentForm.dueDate}
                        onChange={(e) => setAssignmentForm({ ...assignmentForm, dueDate: e.target.value })}
                        data-testid="input-assignment-due-date"
                      />
                      <Input
                        placeholder="Grade Level"
                        value={assignmentForm.gradeLevel}
                        onChange={(e) => setAssignmentForm({ ...assignmentForm, gradeLevel: e.target.value })}
                        data-testid="input-assignment-grade-level"
                      />
                      <Input
                        type="number"
                        placeholder="Points"
                        value={assignmentForm.points}
                        onChange={(e) => setAssignmentForm({ ...assignmentForm, points: parseInt(e.target.value) || 0 })}
                        data-testid="input-assignment-points"
                      />
                      <Button
                        onClick={() => createAssignmentMutation.mutate(assignmentForm)}
                        disabled={createAssignmentMutation.isPending}
                        className="w-full"
                        data-testid="button-submit-assignment"
                      >
                        {createAssignmentMutation.isPending ? "Creating..." : "Create"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Points</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assignments.map((a: any) => (
                      <TableRow key={a.id} data-testid={`row-assignment-${a.id}`}>
                        <TableCell data-testid={`text-assignment-title-${a.id}`}>{a.title}</TableCell>
                        <TableCell>{a.subject}</TableCell>
                        <TableCell>{new Date(a.dueDate).toLocaleDateString()}</TableCell>
                        <TableCell>{a.points}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                setEditAssignmentForm({
                                  id: a.id,
                                  title: a.title,
                                  description: a.description || "",
                                  subject: a.subject,
                                  dueDate: a.dueDate,
                                  gradeLevel: a.gradeLevel,
                                  points: a.points,
                                  fileUrl: a.fileUrl || ""
                                });
                                setEditAssignmentOpen(true);
                              }}
                              data-testid={`button-edit-assignment-${a.id}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="destructive" 
                              size="sm"
                              onClick={() => {
                                if (confirm('Are you sure you want to delete this assignment?')) {
                                  deleteAssignmentMutation.mutate(a.id);
                                }
                              }}
                              data-testid={`button-delete-assignment-${a.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <Dialog open={editAssignmentOpen} onOpenChange={setEditAssignmentOpen}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Edit Assignment</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Input
                        placeholder="Title"
                        value={editAssignmentForm.title}
                        onChange={(e) => setEditAssignmentForm({ ...editAssignmentForm, title: e.target.value })}
                        data-testid="input-edit-assignment-title"
                      />
                      <Textarea
                        placeholder="Description"
                        value={editAssignmentForm.description}
                        onChange={(e) => setEditAssignmentForm({ ...editAssignmentForm, description: e.target.value })}
                        data-testid="input-edit-assignment-description"
                      />
                      <Input
                        placeholder="Subject"
                        value={editAssignmentForm.subject}
                        onChange={(e) => setEditAssignmentForm({ ...editAssignmentForm, subject: e.target.value })}
                        data-testid="input-edit-assignment-subject"
                      />
                      <Input
                        type="date"
                        placeholder="Due Date"
                        value={editAssignmentForm.dueDate}
                        onChange={(e) => setEditAssignmentForm({ ...editAssignmentForm, dueDate: e.target.value })}
                        data-testid="input-edit-assignment-due-date"
                      />
                      <Input
                        placeholder="Grade Level"
                        value={editAssignmentForm.gradeLevel}
                        onChange={(e) => setEditAssignmentForm({ ...editAssignmentForm, gradeLevel: e.target.value })}
                        data-testid="input-edit-assignment-grade-level"
                      />
                      <Input
                        type="number"
                        placeholder="Points"
                        value={editAssignmentForm.points}
                        onChange={(e) => setEditAssignmentForm({ ...editAssignmentForm, points: parseInt(e.target.value) || 0 })}
                        data-testid="input-edit-assignment-points"
                      />
                      <Input
                        placeholder="File URL (optional)"
                        value={editAssignmentForm.fileUrl}
                        onChange={(e) => setEditAssignmentForm({ ...editAssignmentForm, fileUrl: e.target.value })}
                        data-testid="input-edit-assignment-file-url"
                      />
                      <Button
                        onClick={() => updateAssignmentMutation.mutate(editAssignmentForm)}
                        disabled={updateAssignmentMutation.isPending}
                        className="w-full"
                        data-testid="button-update-assignment"
                      >
                        {updateAssignmentMutation.isPending ? "Updating..." : "Update"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="materials">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Study Materials</CardTitle>
                <Dialog open={uploadMaterialOpen} onOpenChange={setUploadMaterialOpen}>
                  <DialogTrigger asChild>
                    <Button data-testid="button-upload-material">Upload Material</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Upload Study Material</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Input
                        placeholder="Title"
                        value={materialForm.title}
                        onChange={(e) => setMaterialForm({ ...materialForm, title: e.target.value })}
                        data-testid="input-material-title"
                      />
                      <Textarea
                        placeholder="Description"
                        value={materialForm.description}
                        onChange={(e) => setMaterialForm({ ...materialForm, description: e.target.value })}
                        data-testid="input-material-description"
                      />
                      <Input
                        placeholder="File URL"
                        value={materialForm.fileUrl}
                        onChange={(e) => setMaterialForm({ ...materialForm, fileUrl: e.target.value })}
                        data-testid="input-material-url"
                      />
                      <Input
                        placeholder="Subject"
                        value={materialForm.subject}
                        onChange={(e) => setMaterialForm({ ...materialForm, subject: e.target.value })}
                        data-testid="input-material-subject"
                      />
                      <Input
                        placeholder="Grade Level"
                        value={materialForm.gradeLevel}
                        onChange={(e) => setMaterialForm({ ...materialForm, gradeLevel: e.target.value })}
                        data-testid="input-material-grade-level"
                      />
                      <Button
                        onClick={() => uploadMaterialMutation.mutate(materialForm)}
                        disabled={uploadMaterialMutation.isPending}
                        className="w-full"
                        data-testid="button-submit-material"
                      >
                        {uploadMaterialMutation.isPending ? "Uploading..." : "Upload"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Grade Level</TableHead>
                      <TableHead>Upload Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {materials.map((m: any) => (
                      <TableRow key={m.id} data-testid={`row-material-${m.id}`}>
                        <TableCell data-testid={`text-material-title-${m.id}`}>{m.title}</TableCell>
                        <TableCell>{m.subject}</TableCell>
                        <TableCell>{m.gradeLevel}</TableCell>
                        <TableCell>{new Date(m.uploadDate).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                setEditMaterialForm({
                                  id: m.id,
                                  title: m.title,
                                  description: m.description || "",
                                  fileUrl: m.fileUrl || "",
                                  subject: m.subject,
                                  gradeLevel: m.gradeLevel
                                });
                                setEditMaterialOpen(true);
                              }}
                              data-testid={`button-edit-material-${m.id}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="destructive" 
                              size="sm"
                              onClick={() => {
                                if (confirm('Are you sure you want to delete this material?')) {
                                  deleteMaterialMutation.mutate(m.id);
                                }
                              }}
                              data-testid={`button-delete-material-${m.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <Dialog open={editMaterialOpen} onOpenChange={setEditMaterialOpen}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Edit Study Material</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Input
                        placeholder="Title"
                        value={editMaterialForm.title}
                        onChange={(e) => setEditMaterialForm({ ...editMaterialForm, title: e.target.value })}
                        data-testid="input-edit-material-title"
                      />
                      <Textarea
                        placeholder="Description"
                        value={editMaterialForm.description}
                        onChange={(e) => setEditMaterialForm({ ...editMaterialForm, description: e.target.value })}
                        data-testid="input-edit-material-description"
                      />
                      <Input
                        placeholder="File URL"
                        value={editMaterialForm.fileUrl}
                        onChange={(e) => setEditMaterialForm({ ...editMaterialForm, fileUrl: e.target.value })}
                        data-testid="input-edit-material-url"
                      />
                      <Input
                        placeholder="Subject"
                        value={editMaterialForm.subject}
                        onChange={(e) => setEditMaterialForm({ ...editMaterialForm, subject: e.target.value })}
                        data-testid="input-edit-material-subject"
                      />
                      <Input
                        placeholder="Grade Level"
                        value={editMaterialForm.gradeLevel}
                        onChange={(e) => setEditMaterialForm({ ...editMaterialForm, gradeLevel: e.target.value })}
                        data-testid="input-edit-material-grade-level"
                      />
                      <Button
                        onClick={() => updateMaterialMutation.mutate(editMaterialForm)}
                        disabled={updateMaterialMutation.isPending}
                        className="w-full"
                        data-testid="button-update-material"
                      >
                        {updateMaterialMutation.isPending ? "Updating..." : "Update"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="students">
            <Card>
              <CardHeader>
                <CardTitle>My Students</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Grade Level</TableHead>
                      <TableHead>Points</TableHead>
                      <TableHead>Badges</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((s: any) => (
                      <TableRow key={s.id} data-testid={`row-student-${s.id}`}>
                        <TableCell data-testid={`text-student-name-${s.id}`}>{s.name}</TableCell>
                        <TableCell>{s.gradeLevel}</TableCell>
                        <TableCell>{s.points}</TableCell>
                        <TableCell>{s.badges.length}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sessions">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Sessions</CardTitle>
                <Dialog open={createSessionOpen} onOpenChange={setCreateSessionOpen}>
                  <DialogTrigger asChild>
                    <Button data-testid="button-create-session">Create Session</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create Session</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Input
                        placeholder="Title (optional)"
                        value={sessionForm.title}
                        onChange={(e) => setSessionForm({ ...sessionForm, title: e.target.value })}
                        data-testid="input-session-title"
                      />
                      <Textarea
                        placeholder="Description (optional)"
                        value={sessionForm.description}
                        onChange={(e) => setSessionForm({ ...sessionForm, description: e.target.value })}
                        data-testid="input-session-description"
                      />
                      <Input
                        placeholder="Subject"
                        value={sessionForm.subject}
                        onChange={(e) => setSessionForm({ ...sessionForm, subject: e.target.value })}
                        data-testid="input-session-subject"
                      />
                      <Input
                        type="date"
                        value={sessionForm.sessionDate}
                        onChange={(e) => setSessionForm({ ...sessionForm, sessionDate: e.target.value })}
                        data-testid="input-session-date"
                      />
                      <Input
                        type="time"
                        placeholder="Start Time"
                        value={sessionForm.startTime}
                        onChange={(e) => setSessionForm({ ...sessionForm, startTime: e.target.value })}
                        data-testid="input-session-start-time"
                      />
                      <Input
                        type="time"
                        placeholder="End Time"
                        value={sessionForm.endTime}
                        onChange={(e) => setSessionForm({ ...sessionForm, endTime: e.target.value })}
                        data-testid="input-session-end-time"
                      />
                      <Input
                        placeholder="Meeting URL (optional)"
                        value={sessionForm.meetingUrl}
                        onChange={(e) => setSessionForm({ ...sessionForm, meetingUrl: e.target.value })}
                        data-testid="input-session-meeting-url"
                      />
                      <Textarea
                        placeholder="Notes (optional)"
                        value={sessionForm.notes}
                        onChange={(e) => setSessionForm({ ...sessionForm, notes: e.target.value })}
                        data-testid="input-session-notes"
                      />
                      <Button
                        onClick={() => createSessionMutation.mutate(sessionForm)}
                        disabled={createSessionMutation.isPending}
                        className="w-full"
                        data-testid="button-submit-session"
                      >
                        {createSessionMutation.isPending ? "Creating..." : "Create"}
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
                      <TableRow key={s.id} data-testid={`row-session-${s.id}`}>
                        <TableCell>{s.subject}</TableCell>
                        <TableCell>{s.sessionDate ? new Date(s.sessionDate).toLocaleDateString() : 'N/A'}</TableCell>
                        <TableCell>{s.startTime} - {s.endTime}</TableCell>
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
                        <TableCell><Badge>{s.status}</Badge></TableCell>
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
                                  status: s.status
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
                                if (confirm('Are you sure you want to delete this session?')) {
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

                <Dialog open={editSessionOpen} onOpenChange={setEditSessionOpen}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Edit Session</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Input
                        placeholder="Title (optional)"
                        value={editSessionForm.title}
                        onChange={(e) => setEditSessionForm({ ...editSessionForm, title: e.target.value })}
                        data-testid="input-edit-session-title"
                      />
                      <Textarea
                        placeholder="Description (optional)"
                        value={editSessionForm.description}
                        onChange={(e) => setEditSessionForm({ ...editSessionForm, description: e.target.value })}
                        data-testid="input-edit-session-description"
                      />
                      <Input
                        placeholder="Subject"
                        value={editSessionForm.subject}
                        onChange={(e) => setEditSessionForm({ ...editSessionForm, subject: e.target.value })}
                        data-testid="input-edit-session-subject"
                      />
                      <Input
                        type="date"
                        placeholder="Session Date"
                        value={editSessionForm.sessionDate}
                        onChange={(e) => setEditSessionForm({ ...editSessionForm, sessionDate: e.target.value })}
                        data-testid="input-edit-session-date"
                      />
                      <Input
                        type="time"
                        placeholder="Start Time"
                        value={editSessionForm.startTime}
                        onChange={(e) => setEditSessionForm({ ...editSessionForm, startTime: e.target.value })}
                        data-testid="input-edit-session-start-time"
                      />
                      <Input
                        type="time"
                        placeholder="End Time"
                        value={editSessionForm.endTime}
                        onChange={(e) => setEditSessionForm({ ...editSessionForm, endTime: e.target.value })}
                        data-testid="input-edit-session-end-time"
                      />
                      <Input
                        placeholder="Meeting URL (optional)"
                        value={editSessionForm.meetingUrl}
                        onChange={(e) => setEditSessionForm({ ...editSessionForm, meetingUrl: e.target.value })}
                        data-testid="input-edit-session-meeting-url"
                      />
                      <Textarea
                        placeholder="Notes (optional)"
                        value={editSessionForm.notes}
                        onChange={(e) => setEditSessionForm({ ...editSessionForm, notes: e.target.value })}
                        data-testid="input-edit-session-notes"
                      />
                      <Button
                        onClick={() => updateSessionMutation.mutate(editSessionForm)}
                        disabled={updateSessionMutation.isPending}
                        className="w-full"
                        data-testid="button-update-session"
                      >
                        {updateSessionMutation.isPending ? "Updating..." : "Update"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="schedule">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Student Schedules</CardTitle>
                <Dialog open={createScheduleOpen} onOpenChange={setCreateScheduleOpen}>
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
                      <form onSubmit={scheduleForm.handleSubmit((data) => createScheduleMutation.mutate(data))} className="space-y-4">
                        <FormField
                          control={scheduleForm.control}
                          name="studentId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Student</FormLabel>
                              <FormControl>
                                <Select onValueChange={(v) => field.onChange(parseInt(v))} value={field.value.toString()}>
                                  <SelectTrigger data-testid="select-schedule-student">
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
                          control={scheduleForm.control}
                          name="dayOfWeek"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Day of Week</FormLabel>
                              <FormControl>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <SelectTrigger data-testid="select-day-of-week">
                                    <SelectValue placeholder="Select a day" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Monday">Monday</SelectItem>
                                    <SelectItem value="Tuesday">Tuesday</SelectItem>
                                    <SelectItem value="Wednesday">Wednesday</SelectItem>
                                    <SelectItem value="Thursday">Thursday</SelectItem>
                                    <SelectItem value="Friday">Friday</SelectItem>
                                    <SelectItem value="Saturday">Saturday</SelectItem>
                                    <SelectItem value="Sunday">Sunday</SelectItem>
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
                                <Input type="time" {...field} data-testid="input-schedule-start-time" />
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
                                <Input type="time" {...field} data-testid="input-schedule-end-time" />
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
                                <Input placeholder="Subject" {...field} data-testid="input-schedule-subject" />
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
                          {createScheduleMutation.isPending ? "Creating..." : "Create Schedule"}
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
                  <div className="text-center py-8 text-red-500">Error loading schedules</div>
                ) : schedules.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No schedules created yet</p>
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
                        <TableRow key={s.id} data-testid={`row-schedule-${s.id}`}>
                          <TableCell data-testid={`text-schedule-student-${s.id}`}>
                            {students.find((st: any) => st.id === s.studentId)?.name || `Student #${s.studentId}`}
                          </TableCell>
                          <TableCell>{s.dayOfWeek}</TableCell>
                          <TableCell>{s.startTime} - {s.endTime}</TableCell>
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
                                    subject: s.subject
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
                                  if (confirm('Are you sure you want to delete this schedule?')) {
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

                <Dialog open={editScheduleOpen} onOpenChange={setEditScheduleOpen}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Edit Schedule</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium">Student</label>
                        <Select
                          value={editScheduleForm.studentId.toString()}
                          onValueChange={(value) => setEditScheduleForm({ ...editScheduleForm, studentId: parseInt(value) })}
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
                        <label className="text-sm font-medium">Day of Week</label>
                        <Select
                          value={editScheduleForm.dayOfWeek}
                          onValueChange={(value) => setEditScheduleForm({ ...editScheduleForm, dayOfWeek: value })}
                        >
                          <SelectTrigger data-testid="select-edit-day-of-week">
                            <SelectValue placeholder="Select a day" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Monday">Monday</SelectItem>
                            <SelectItem value="Tuesday">Tuesday</SelectItem>
                            <SelectItem value="Wednesday">Wednesday</SelectItem>
                            <SelectItem value="Thursday">Thursday</SelectItem>
                            <SelectItem value="Friday">Friday</SelectItem>
                            <SelectItem value="Saturday">Saturday</SelectItem>
                            <SelectItem value="Sunday">Sunday</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Start Time</label>
                        <Input
                          type="time"
                          value={editScheduleForm.startTime}
                          onChange={(e) => setEditScheduleForm({ ...editScheduleForm, startTime: e.target.value })}
                          data-testid="input-edit-schedule-start-time"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">End Time</label>
                        <Input
                          type="time"
                          value={editScheduleForm.endTime}
                          onChange={(e) => setEditScheduleForm({ ...editScheduleForm, endTime: e.target.value })}
                          data-testid="input-edit-schedule-end-time"
                        />
                      </div>
                      <Input
                        placeholder="Subject"
                        value={editScheduleForm.subject}
                        onChange={(e) => setEditScheduleForm({ ...editScheduleForm, subject: e.target.value })}
                        data-testid="input-edit-schedule-subject"
                      />
                      <Button
                        onClick={() => updateScheduleMutation.mutate(editScheduleForm)}
                        disabled={updateScheduleMutation.isPending}
                        className="w-full"
                        data-testid="button-update-schedule"
                      >
                        {updateScheduleMutation.isPending ? "Updating..." : "Update Schedule"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="feedback">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Student Feedback</CardTitle>
                <Dialog open={giveFeedbackOpen} onOpenChange={setGiveFeedbackOpen}>
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
                      <form onSubmit={feedbackForm.handleSubmit((data) => giveFeedbackMutation.mutate(data))} className="space-y-4">
                        <FormField
                          control={feedbackForm.control}
                          name="studentId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Student</FormLabel>
                              <FormControl>
                                <Select onValueChange={(v) => field.onChange(parseInt(v))} value={field.value.toString()}>
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
                          control={feedbackForm.control}
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
                          {giveFeedbackMutation.isPending ? "Sending..." : "Send Feedback"}
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
                  <div className="text-center py-8 text-red-500">Error loading feedback</div>
                ) : feedbacks.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No feedback given yet</p>
                ) : (
                  <div className="space-y-4">
                    {feedbacks.map((f: any) => (
                      <div key={f.id} className="p-4 border rounded-lg" data-testid={`card-feedback-${f.id}`}>
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <p className="font-medium" data-testid={`text-feedback-student-${f.id}`}>
                                {students.find((st: any) => st.id === f.studentId)?.name || `Student #${f.studentId}`}
                              </p>
                              <Badge variant={f.type === "positive" ? "default" : f.type === "constructive" ? "secondary" : "outline"}>
                                {f.type}
                              </Badge>
                            </div>
                            <p className="text-sm" data-testid={`text-feedback-message-${f.id}`}>{f.message}</p>
                            <p className="text-xs text-gray-500 mt-2">
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

          <TabsContent value="attendance">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Mark Student Attendance</CardTitle>
                <Dialog open={markAttendanceOpen} onOpenChange={setMarkAttendanceOpen}>
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
                      <form onSubmit={attendanceForm.handleSubmit((data) => markAttendanceMutation.mutate(data))} className="space-y-4">
                        <FormField
                          control={attendanceForm.control}
                          name="studentId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Student</FormLabel>
                              <FormControl>
                                <Select onValueChange={(v) => field.onChange(parseInt(v))} value={field.value.toString()}>
                                  <SelectTrigger data-testid="select-attendance-student">
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
                          control={attendanceForm.control}
                          name="date"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Date</FormLabel>
                              <FormControl>
                                <Input type="date" {...field} data-testid="input-attendance-date" />
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
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <SelectTrigger data-testid="select-attendance-status">
                                    <SelectValue placeholder="Select status" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="present">Present</SelectItem>
                                    <SelectItem value="absent">Absent</SelectItem>
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
                          {markAttendanceMutation.isPending ? "Saving..." : "Mark Attendance"}
                        </Button>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Select Student to View Attendance</label>
                    <select
                      className="w-full mt-1 p-2 border rounded-md"
                      value={selectedStudentForAttendance || 0}
                      onChange={(e) => setSelectedStudentForAttendance(parseInt(e.target.value) || null)}
                      data-testid="select-view-attendance-student"
                    >
                      <option value={0}>Select a student</option>
                      {students.map((s: any) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>

                  {selectedStudentForAttendance && (
                    <div className="mt-6">
                      <h3 className="text-lg font-semibold mb-4">
                        Attendance Records for {students.find((s: any) => s.id === selectedStudentForAttendance)?.name}
                      </h3>
                      {attendanceQuery.isLoading ? (
                        <div className="text-center py-8">Loading attendance...</div>
                      ) : attendanceQuery.isError ? (
                        <div className="text-center py-8 text-red-500">Error loading attendance</div>
                      ) : attendanceRecords.length === 0 ? (
                        <p className="text-center text-gray-500 py-8">No attendance records yet</p>
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
                              <TableRow key={a.id} data-testid={`row-attendance-${a.id}`}>
                                <TableCell data-testid={`text-attendance-date-${a.id}`}>
                                  {new Date(a.date).toLocaleDateString()}
                                </TableCell>
                                <TableCell>
                                  <Badge 
                                    variant={a.status === "present" ? "default" : a.status === "late" ? "secondary" : "destructive"}
                                    data-testid={`badge-attendance-status-${a.id}`}
                                  >
                                    {a.status}
                                  </Badge>
                                </TableCell>
                                <TableCell data-testid={`text-attendance-notes-${a.id}`}>{a.notes || "-"}</TableCell>
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

          <TabsContent value="requests">
            <Card>
              <CardHeader>
                <CardTitle>Tutor Requests</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {tutorRequests.map((r: any) => (
                    <div key={r.id} className="p-4 border rounded-lg" data-testid={`card-request-${r.id}`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium" data-testid={`text-request-message-${r.id}`}>{r.message}</p>
                          <p className="text-sm text-gray-600">
                            Requested: {new Date(r.requestDate).toLocaleDateString()}
                          </p>
                          <Badge variant={r.status === "approved" ? "default" : "outline"}>
                            {r.status}
                          </Badge>
                        </div>
                        {r.status === "pending" && (
                          <div className="space-x-2">
                            <Button
                              size="sm"
                              onClick={() => approveTutorRequestMutation.mutate({ id: r.id, status: "approved" })}
                              data-testid={`button-approve-${r.id}`}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => approveTutorRequestMutation.mutate({ id: r.id, status: "rejected" })}
                              data-testid={`button-reject-${r.id}`}
                            >
                              Reject
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Progress Reports & Analytics</CardTitle>
                <Dialog open={createReportOpen} onOpenChange={setCreateReportOpen}>
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
                        <label className="text-sm font-medium">Select Student</label>
                        <select
                          className="w-full mt-1 p-2 border rounded-md"
                          value={reportForm.studentId}
                          onChange={(e) => setReportForm({ ...reportForm, studentId: parseInt(e.target.value) })}
                          data-testid="select-report-student"
                        >
                          <option value={0}>Select a student</option>
                          {students.map((s: any) => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Report Date</label>
                        <Input
                          type="date"
                          value={reportForm.reportDate}
                          onChange={(e) => setReportForm({ ...reportForm, reportDate: e.target.value })}
                          data-testid="input-report-date"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Overall Grade</label>
                        <Input
                          placeholder="e.g., A, B+, 85%"
                          value={reportForm.overallGrade}
                          onChange={(e) => setReportForm({ ...reportForm, overallGrade: e.target.value })}
                          data-testid="input-overall-grade"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Comments</label>
                        <Textarea
                          placeholder="General comments about student performance..."
                          value={reportForm.comments}
                          onChange={(e) => setReportForm({ ...reportForm, comments: e.target.value })}
                          rows={3}
                          data-testid="input-report-comments"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Strengths</label>
                        <Textarea
                          placeholder="List student's strengths..."
                          value={reportForm.strengths}
                          onChange={(e) => setReportForm({ ...reportForm, strengths: e.target.value })}
                          rows={2}
                          data-testid="input-report-strengths"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Areas for Improvement</label>
                        <Textarea
                          placeholder="List areas where student can improve..."
                          value={reportForm.improvements}
                          onChange={(e) => setReportForm({ ...reportForm, improvements: e.target.value })}
                          rows={2}
                          data-testid="input-report-improvements"
                        />
                      </div>
                      <Button
                        onClick={() => generateReportMutation.mutate(reportForm)}
                        disabled={!reportForm.studentId || generateReportMutation.isPending}
                        className="w-full"
                        data-testid="button-generate-report"
                      >
                        {generateReportMutation.isPending ? "Generating..." : "Generate Report"}
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
                          <p className="text-sm text-gray-600">Total Reports</p>
                          <p className="text-3xl font-bold">{progressReports.length}</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <p className="text-sm text-gray-600">Students Tracked</p>
                          <p className="text-3xl font-bold">{students.length}</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <p className="text-sm text-gray-600">Total Earnings</p>
                          <p className="text-3xl font-bold">${totalEarnings}</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                  
                  <h3 className="text-lg font-semibold mb-3">Recent Progress Reports</h3>
                  {progressReports.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No reports generated yet</p>
                  ) : (
                    progressReports.map((report: any) => (
                      <div key={report.id} className="p-4 border rounded-lg" data-testid={`card-report-${report.id}`}>
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-medium">Report #{report.id}</h4>
                              <Badge>{report.overallGrade}</Badge>
                            </div>
                            <p className="text-sm text-gray-600">
                              Date: {new Date(report.reportDate).toLocaleDateString()}
                            </p>
                            <div className="mt-2 space-y-1">
                              <p className="text-sm"><strong>Comments:</strong> {report.comments}</p>
                              <p className="text-sm"><strong>Strengths:</strong> {report.strengths}</p>
                              <p className="text-sm"><strong>Improvements:</strong> {report.improvements}</p>
                            </div>
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

          <TabsContent value="messages">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Messages</CardTitle>
                <Dialog open={sendMessageOpen} onOpenChange={setSendMessageOpen}>
                  <DialogTrigger asChild>
                    <Button data-testid="button-new-message">
                      <Send className="h-4 w-4 mr-2" />
                      New Message
                    </Button>
                  </DialogTrigger>
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
              </CardHeader>
              <CardContent>
                <div className="h-[500px] overflow-y-auto space-y-3">
                  {messages.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No messages yet</p>
                  ) : (
                    messages.map((msg: any) => (
                      <div 
                        key={msg.id} 
                        className={`p-4 rounded-lg border ${msg.senderId === user?.id ? 'bg-blue-50 ml-8' : 'bg-gray-50 mr-8'}`}
                        data-testid={`message-${msg.id}`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-medium text-sm">
                            {msg.senderId === user?.id ? 'You' : `User #${msg.senderId}`}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(msg.sentDate).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm" data-testid={`text-message-content-${msg.id}`}>{msg.content}</p>
                        {!msg.isRead && msg.receiverId === user?.id && (
                          <Badge variant="secondary" className="mt-2">Unread</Badge>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
      </div>
    </div>
  );
}

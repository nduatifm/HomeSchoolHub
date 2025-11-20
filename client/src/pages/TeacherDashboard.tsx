import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Users, Calendar, DollarSign, FileText, LogOut, MessageSquare, Send, BarChart, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function TeacherDashboard() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("assignments");
  
  // Dialog state
  const [createAssignmentOpen, setCreateAssignmentOpen] = useState(false);
  const [uploadMaterialOpen, setUploadMaterialOpen] = useState(false);
  const [createSessionOpen, setCreateSessionOpen] = useState(false);
  const [createReportOpen, setCreateReportOpen] = useState(false);
  const [sendMessageOpen, setSendMessageOpen] = useState(false);

  // Fetch data
  const { data: students = [] } = useQuery({ queryKey: ["/api/students/teacher"] });
  const { data: assignments = [] } = useQuery({ queryKey: ["/api/assignments/teacher"] });
  const { data: materials = [] } = useQuery({ queryKey: ["/api/materials/teacher"] });
  const { data: sessions = [] } = useQuery({ queryKey: ["/api/sessions/teacher"] });
  const { data: tutorRequests = [] } = useQuery({ queryKey: ["/api/tutor-requests/teacher"] });
  const { data: earnings = [] } = useQuery({ queryKey: ["/api/earnings/teacher"] });
  const { data: messages = [] } = useQuery({ queryKey: ["/api/messages"] });
  const { data: progressReports = [] } = useQuery({ queryKey: ["/api/progress-reports/teacher"] });

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
    subject: "", date: "", startTime: "", endTime: "", studentIds: [] as number[], notes: "", status: "scheduled"
  });

  const createSessionMutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/sessions", {
      method: "POST",
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions/teacher"] });
      toast({ title: "Session created!", type: "success" });
      setSessionForm({ subject: "", date: "", startTime: "", endTime: "", studentIds: [], notes: "", status: "scheduled" });
      setCreateSessionOpen(false);
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

  const totalEarnings = earnings.reduce((sum: number, e: any) => sum + e.amount, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Teacher Dashboard</h1>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">Welcome, {user?.name}</span>
            <Button variant="outline" size="sm" onClick={logout} data-testid="button-logout">
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Students</p>
                  <p className="text-2xl font-bold" data-testid="text-students-count">{students.length}</p>
                </div>
                <Users className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Assignments</p>
                  <p className="text-2xl font-bold" data-testid="text-assignments-count">{assignments.length}</p>
                </div>
                <FileText className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Sessions</p>
                  <p className="text-2xl font-bold" data-testid="text-sessions-count">{sessions.length}</p>
                </div>
                <Calendar className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Earnings</p>
                  <p className="text-2xl font-bold" data-testid="text-earnings">${totalEarnings}</p>
                </div>
                <DollarSign className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="assignments" data-testid="tab-assignments">Assignments</TabsTrigger>
            <TabsTrigger value="materials" data-testid="tab-materials">Materials</TabsTrigger>
            <TabsTrigger value="students" data-testid="tab-students">Students</TabsTrigger>
            <TabsTrigger value="sessions" data-testid="tab-sessions">Sessions</TabsTrigger>
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
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assignments.map((a: any) => (
                      <TableRow key={a.id} data-testid={`row-assignment-${a.id}`}>
                        <TableCell data-testid={`text-assignment-title-${a.id}`}>{a.title}</TableCell>
                        <TableCell>{a.subject}</TableCell>
                        <TableCell>{new Date(a.dueDate).toLocaleDateString()}</TableCell>
                        <TableCell>{a.points}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {materials.map((m: any) => (
                      <TableRow key={m.id} data-testid={`row-material-${m.id}`}>
                        <TableCell data-testid={`text-material-title-${m.id}`}>{m.title}</TableCell>
                        <TableCell>{m.subject}</TableCell>
                        <TableCell>{m.gradeLevel}</TableCell>
                        <TableCell>{new Date(m.uploadDate).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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
                        placeholder="Subject"
                        value={sessionForm.subject}
                        onChange={(e) => setSessionForm({ ...sessionForm, subject: e.target.value })}
                        data-testid="input-session-subject"
                      />
                      <Input
                        type="date"
                        value={sessionForm.date}
                        onChange={(e) => setSessionForm({ ...sessionForm, date: e.target.value })}
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
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sessions.map((s: any) => (
                      <TableRow key={s.id} data-testid={`row-session-${s.id}`}>
                        <TableCell>{s.subject}</TableCell>
                        <TableCell>{new Date(s.date).toLocaleDateString()}</TableCell>
                        <TableCell>{s.startTime} - {s.endTime}</TableCell>
                        <TableCell><Badge>{s.status}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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
                        <label className="text-sm font-medium">To (User ID)</label>
                        <Input
                          type="number"
                          placeholder="Receiver ID"
                          value={messageForm.receiverId || ""}
                          onChange={(e) => setMessageForm({ ...messageForm, receiverId: parseInt(e.target.value) || 0 })}
                          data-testid="input-receiver-id"
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
  );
}

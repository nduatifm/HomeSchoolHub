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
import { Users, FileText, Calendar, UserPlus, LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ParentDashboard() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("children");

  // Fetch data
  const { data: students = [] } = useQuery({ queryKey: ["/api/students/parent"] });
  const { data: invites = [] } = useQuery({ queryKey: ["/api/invites/student/parent"] });
  const { data: tutorRequests = [] } = useQuery({ queryKey: ["/api/tutor-requests/parent"] });
  const { data: payments = [] } = useQuery({ queryKey: ["/api/payments/parent"] });

  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const { data: studentAssignments = [] } = useQuery({
    queryKey: ["/api/assignments/student", selectedStudent?.id],
    enabled: !!selectedStudent,
  });

  // Invite student form
  const [inviteForm, setInviteForm] = useState({
    email: "", studentName: "", gradeLevel: ""
  });

  const inviteStudentMutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/invites/student", {
      method: "POST",
      body: JSON.stringify(data),
    }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/invites/student/parent"] });
      toast({ 
        title: "Invite sent!", 
        description: `Invite code: ${data.token}`,
        type: "success" 
      });
      setInviteForm({ email: "", studentName: "", gradeLevel: "" });
    },
  });

  // Request tutor form
  const [tutorRequestForm, setTutorRequestForm] = useState({
    teacherId: 1, message: "", studentId: null as number | null
  });

  const requestTutorMutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/tutor-requests", {
      method: "POST",
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tutor-requests/parent"] });
      toast({ title: "Tutor request sent!", type: "success" });
      setTutorRequestForm({ teacherId: 1, message: "", studentId: null });
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
    mutationFn: (data: any) => apiRequest("/api/parental-controls", {
      method: "POST",
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      toast({ title: "Controls updated!", type: "success" });
    },
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Parent Dashboard</h1>
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
                  <p className="text-sm text-gray-600">Children</p>
                  <p className="text-2xl font-bold" data-testid="text-children-count">{students.length}</p>
                </div>
                <Users className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Invites</p>
                  <p className="text-2xl font-bold" data-testid="text-invites-count">{invites.length}</p>
                </div>
                <UserPlus className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Tutor Requests</p>
                  <p className="text-2xl font-bold" data-testid="text-requests-count">{tutorRequests.length}</p>
                </div>
                <FileText className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Payments</p>
                  <p className="text-2xl font-bold" data-testid="text-payments-count">{payments.length}</p>
                </div>
                <Calendar className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="children" data-testid="tab-children">My Children</TabsTrigger>
            <TabsTrigger value="invites" data-testid="tab-invites">Invite Student</TabsTrigger>
            <TabsTrigger value="progress" data-testid="tab-progress">Track Progress</TabsTrigger>
            <TabsTrigger value="tutors" data-testid="tab-tutors">Tutor Requests</TabsTrigger>
            <TabsTrigger value="controls" data-testid="tab-controls">Parental Controls</TabsTrigger>
          </TabsList>

          <TabsContent value="children">
            <Card>
              <CardHeader>
                <CardTitle>My Children</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {students.map((s: any) => (
                    <Card key={s.id} data-testid={`card-student-${s.id}`}>
                      <CardHeader>
                        <CardTitle className="text-lg" data-testid={`text-student-name-${s.id}`}>{s.name}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <p className="text-sm"><strong>Grade:</strong> {s.gradeLevel}</p>
                          <p className="text-sm"><strong>Points:</strong> {s.points}</p>
                          <p className="text-sm"><strong>Badges:</strong> {s.badges.length}</p>
                          <Button
                            size="sm"
                            onClick={() => setSelectedStudent(s)}
                            data-testid={`button-view-dashboard-${s.id}`}
                          >
                            View Dashboard
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
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
                    onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                    data-testid="input-invite-email"
                  />
                  <Input
                    placeholder="Student Name"
                    value={inviteForm.studentName}
                    onChange={(e) => setInviteForm({ ...inviteForm, studentName: e.target.value })}
                    data-testid="input-invite-name"
                  />
                  <Input
                    placeholder="Grade Level"
                    value={inviteForm.gradeLevel}
                    onChange={(e) => setInviteForm({ ...inviteForm, gradeLevel: e.target.value })}
                    data-testid="input-invite-grade"
                  />
                  <Button
                    onClick={() => inviteStudentMutation.mutate(inviteForm)}
                    disabled={inviteStudentMutation.isPending}
                    className="w-full"
                    data-testid="button-send-invite"
                  >
                    {inviteStudentMutation.isPending ? "Sending..." : "Send Invite"}
                  </Button>
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-medium mb-4">Sent Invites</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Invite Code</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invites.map((i: any) => (
                        <TableRow key={i.id} data-testid={`row-invite-${i.id}`}>
                          <TableCell>{i.studentName}</TableCell>
                          <TableCell>{i.email}</TableCell>
                          <TableCell><Badge>{i.status}</Badge></TableCell>
                          <TableCell className="font-mono text-xs" data-testid={`text-invite-token-${i.id}`}>
                            {i.token.slice(0, 8)}...
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="progress">
            <Card>
              <CardHeader>
                <CardTitle>Track Student Progress</CardTitle>
              </CardHeader>
              <CardContent>
                {selectedStudent ? (
                  <div>
                    <h3 className="font-medium mb-4">{selectedStudent.name}'s Assignments</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Assignment</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Grade</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {studentAssignments.map((a: any) => (
                          <TableRow key={a.id} data-testid={`row-assignment-${a.id}`}>
                            <TableCell>{a.title}</TableCell>
                            <TableCell>
                              <Badge variant={a.studentAssignment.status === "graded" ? "default" : "outline"}>
                                {a.studentAssignment.status}
                              </Badge>
                            </TableCell>
                            <TableCell>{a.studentAssignment.grade || "-"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-sm text-gray-600">Select a child from "My Children" tab to view their progress</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tutors">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Tutor Requests</CardTitle>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button data-testid="button-request-tutor">Request Tutor</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Request Tutor</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Textarea
                        placeholder="Message to tutor..."
                        value={tutorRequestForm.message}
                        onChange={(e) => setTutorRequestForm({ ...tutorRequestForm, message: e.target.value })}
                        data-testid="input-tutor-request-message"
                      />
                      <Button
                        onClick={() => requestTutorMutation.mutate(tutorRequestForm)}
                        disabled={requestTutorMutation.isPending}
                        className="w-full"
                        data-testid="button-submit-tutor-request"
                      >
                        {requestTutorMutation.isPending ? "Sending..." : "Send Request"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {tutorRequests.map((r: any) => (
                    <div key={r.id} className="p-4 border rounded-lg" data-testid={`card-tutor-request-${r.id}`}>
                      <p className="font-medium" data-testid={`text-tutor-request-message-${r.id}`}>{r.message}</p>
                      <p className="text-sm text-gray-600">
                        Requested: {new Date(r.requestDate).toLocaleDateString()}
                      </p>
                      <Badge variant={r.status === "approved" ? "default" : "outline"}>
                        {r.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="controls">
            <Card>
              <CardHeader>
                <CardTitle>Parental Controls</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Select Student</label>
                    <select
                      className="w-full mt-1 p-2 border rounded-md"
                      value={controlsForm.studentId}
                      onChange={(e) => setControlsForm({ ...controlsForm, studentId: parseInt(e.target.value) })}
                      data-testid="select-controls-student"
                    >
                      <option value={0}>Select a student</option>
                      {students.map((s: any) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Screen Time Limit (minutes)</label>
                    <Input
                      type="number"
                      value={controlsForm.screenTimeLimit}
                      onChange={(e) => setControlsForm({ ...controlsForm, screenTimeLimit: parseInt(e.target.value) })}
                      data-testid="input-screen-time"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Allowed Hours</label>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      <Input
                        type="time"
                        value={controlsForm.allowedTimes.start}
                        onChange={(e) => setControlsForm({ 
                          ...controlsForm, 
                          allowedTimes: { ...controlsForm.allowedTimes, start: e.target.value }
                        })}
                        data-testid="input-time-start"
                      />
                      <Input
                        type="time"
                        value={controlsForm.allowedTimes.end}
                        onChange={(e) => setControlsForm({ 
                          ...controlsForm, 
                          allowedTimes: { ...controlsForm.allowedTimes, end: e.target.value }
                        })}
                        data-testid="input-time-end"
                      />
                    </div>
                  </div>
                  <Button
                    onClick={() => setControlsMutation.mutate(controlsForm)}
                    disabled={!controlsForm.studentId || setControlsMutation.isPending}
                    className="w-full"
                    data-testid="button-save-controls"
                  >
                    {setControlsMutation.isPending ? "Saving..." : "Save Controls"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FileText, Award, BookOpen, Calendar, LogOut, Trophy, MessageSquare, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function StudentDashboard() {
  const { user, student, logout } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("assignments");
  
  // Dialog state
  const [submitDialogAssignmentId, setSubmitDialogAssignmentId] = useState<number | null>(null);
  const [requestClarificationOpen, setRequestClarificationOpen] = useState(false);
  const [sendMessageOpen, setSendMessageOpen] = useState(false);

  // Fetch data
  const { data: assignments = [] } = useQuery({
    queryKey: ["/api/assignments/student", student?.id],
    enabled: !!student,
  });
  const { data: materials = [] } = useQuery({
    queryKey: ["/api/materials/student", student?.id],
    enabled: !!student,
  });
  const { data: feedback = [] } = useQuery({
    queryKey: ["/api/feedback/student", student?.id],
    enabled: !!student,
  });
  const { data: sessions = [] } = useQuery({
    queryKey: ["/api/sessions/student", student?.id],
    enabled: !!student,
  });
  const { data: schedule = [] } = useQuery({
    queryKey: ["/api/schedules/student", student?.id],
    enabled: !!student,
  });
  const { data: clarifications = [] } = useQuery({
    queryKey: ["/api/clarifications/student", student?.id],
    enabled: !!student,
  });
  const { data: messages = [] } = useQuery({ queryKey: ["/api/messages"] });

  // Submit assignment
  const [submissionForm, setSubmissionForm] = useState({
    studentAssignmentId: 0,
    submission: ""
  });

  const submitAssignmentMutation = useMutation({
    mutationFn: ({ id, submission }: { id: number; submission: string }) =>
      apiRequest(`/api/student-assignments/${id}/submit`, {
        method: "PATCH",
        body: JSON.stringify({ submission }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assignments/student", student?.id] });
      toast({ title: "Assignment submitted!", type: "success" });
      setSubmissionForm({ studentAssignmentId: 0, submission: "" });
      setSubmitDialogAssignmentId(null);
    },
  });

  // Request clarification
  const [clarificationForm, setClarificationForm] = useState({
    assignmentId: 0,
    question: ""
  });

  const requestClarificationMutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/clarifications", {
      method: "POST",
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clarifications/student", student?.id] });
      toast({ title: "Clarification requested!", type: "success" });
      setClarificationForm({ assignmentId: 0, question: "" });
      setRequestClarificationOpen(false);
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

  const pendingAssignments = assignments.filter((a: any) => a.studentAssignment?.status === "pending");
  const submittedAssignments = assignments.filter((a: any) => a.studentAssignment?.status === "submitted");
  const gradedAssignments = assignments.filter((a: any) => a.studentAssignment?.status === "graded");

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Student Dashboard</h1>
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
                  <p className="text-sm text-gray-600">Assignments</p>
                  <p className="text-2xl font-bold" data-testid="text-assignments-count">{assignments.length}</p>
                </div>
                <FileText className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Points</p>
                  <p className="text-2xl font-bold" data-testid="text-points">{student?.points || 0}</p>
                </div>
                <Trophy className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Badges</p>
                  <p className="text-2xl font-bold" data-testid="text-badges-count">{student?.badges?.length || 0}</p>
                </div>
                <Award className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Materials</p>
                  <p className="text-2xl font-bold" data-testid="text-materials-count">{materials.length}</p>
                </div>
                <BookOpen className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="assignments" data-testid="tab-assignments">Assignments</TabsTrigger>
            <TabsTrigger value="materials" data-testid="tab-materials">Study Materials</TabsTrigger>
            <TabsTrigger value="feedback" data-testid="tab-feedback">Feedback & Grades</TabsTrigger>
            <TabsTrigger value="schedule" data-testid="tab-schedule">Schedule</TabsTrigger>
            <TabsTrigger value="clarifications" data-testid="tab-clarifications">Ask Questions</TabsTrigger>
            <TabsTrigger value="messages" data-testid="tab-messages">Messages</TabsTrigger>
          </TabsList>

          <TabsContent value="assignments">
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Pending Assignments ({pendingAssignments.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {pendingAssignments.map((a: any) => (
                      <div key={a.id} className="p-4 border rounded-lg" data-testid={`card-pending-${a.id}`}>
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className="font-medium" data-testid={`text-assignment-title-${a.id}`}>{a.title}</h3>
                            <p className="text-sm text-gray-600">{a.description}</p>
                            <div className="mt-2 space-x-2">
                              <Badge variant="outline">{a.subject}</Badge>
                              <Badge>Due: {new Date(a.dueDate).toLocaleDateString()}</Badge>
                              <Badge variant="secondary">{a.points} points</Badge>
                            </div>
                          </div>
                          <Dialog open={submitDialogAssignmentId === a.id} onOpenChange={(open) => {
                            if (open) {
                              setSubmitDialogAssignmentId(a.id);
                              setSubmissionForm({ studentAssignmentId: a.studentAssignment.id, submission: "" });
                            } else {
                              setSubmitDialogAssignmentId(null);
                            }
                          }}>
                            <DialogTrigger asChild>
                              <Button
                                size="sm"
                                data-testid={`button-submit-${a.id}`}
                              >
                                Submit
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Submit Assignment: {a.title}</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <Textarea
                                  placeholder="Enter your work here..."
                                  value={submissionForm.submission}
                                  onChange={(e) => setSubmissionForm({ ...submissionForm, submission: e.target.value })}
                                  rows={6}
                                  data-testid="input-submission"
                                />
                                <DialogFooter>
                                  <Button
                                    onClick={() => submitAssignmentMutation.mutate({
                                      id: submissionForm.studentAssignmentId,
                                      submission: submissionForm.submission
                                    })}
                                    disabled={submitAssignmentMutation.isPending}
                                    data-testid="button-submit-assignment"
                                  >
                                    {submitAssignmentMutation.isPending ? "Submitting..." : "Submit"}
                                  </Button>
                                </DialogFooter>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Submitted Assignments ({submittedAssignments.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Assignment</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>Submitted</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {submittedAssignments.map((a: any) => (
                        <TableRow key={a.id} data-testid={`row-submitted-${a.id}`}>
                          <TableCell>{a.title}</TableCell>
                          <TableCell>{a.subject}</TableCell>
                          <TableCell>
                            {a.studentAssignment.submittedAt ? new Date(a.studentAssignment.submittedAt).toLocaleDateString() : "-"}
                          </TableCell>
                          <TableCell><Badge variant="secondary">Pending Review</Badge></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Graded Assignments ({gradedAssignments.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Assignment</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>Grade</TableHead>
                        <TableHead>Feedback</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {gradedAssignments.map((a: any) => (
                        <TableRow key={a.id} data-testid={`row-graded-${a.id}`}>
                          <TableCell>{a.title}</TableCell>
                          <TableCell>{a.subject}</TableCell>
                          <TableCell>
                            <Badge variant={a.studentAssignment.grade >= 70 ? "default" : "destructive"}>
                              {a.studentAssignment.grade}%
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {a.studentAssignment.feedback || "No feedback"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="materials">
            <Card>
              <CardHeader>
                <CardTitle>Study Materials</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {materials.map((m: any) => (
                    <Card key={m.id} data-testid={`card-material-${m.id}`}>
                      <CardHeader>
                        <CardTitle className="text-lg" data-testid={`text-material-title-${m.id}`}>{m.title}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-gray-600 mb-4">{m.description}</p>
                        <div className="space-x-2 mb-4">
                          <Badge>{m.subject}</Badge>
                          <Badge variant="outline">{m.gradeLevel}</Badge>
                        </div>
                        <Button size="sm" variant="outline" data-testid={`button-access-${m.id}`}>
                          <BookOpen className="h-4 w-4 mr-2" />
                          Access Material
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="feedback">
            <Card>
              <CardHeader>
                <CardTitle>Feedback & Grades</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {feedback.map((f: any) => (
                    <div key={f.id} className="p-4 border rounded-lg" data-testid={`card-feedback-${f.id}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium" data-testid={`text-feedback-message-${f.id}`}>{f.message}</p>
                          <p className="text-sm text-gray-600 mt-1">
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
          </TabsContent>

          <TabsContent value="schedule">
            <Card>
              <CardHeader>
                <CardTitle>My Schedule</CardTitle>
              </CardHeader>
              <CardContent>
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
                      <TableRow key={s.id} data-testid={`row-schedule-${s.id}`}>
                        <TableCell>{s.dayOfWeek}</TableCell>
                        <TableCell>{s.subject}</TableCell>
                        <TableCell>{s.startTime} - {s.endTime}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div className="mt-6">
                  <h3 className="font-medium mb-4">Upcoming Sessions</h3>
                  <div className="space-y-4">
                    {sessions.map((s: any) => (
                      <div key={s.id} className="p-4 border rounded-lg" data-testid={`card-session-${s.id}`}>
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">{s.subject}</p>
                            <p className="text-sm text-gray-600">
                              {new Date(s.date).toLocaleDateString()} at {s.startTime}
                            </p>
                          </div>
                          <Badge>{s.status}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="clarifications">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Ask Questions</CardTitle>
                <Dialog open={requestClarificationOpen} onOpenChange={setRequestClarificationOpen}>
                  <DialogTrigger asChild>
                    <Button data-testid="button-ask-question">Ask Question</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Request Clarification</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium">Select Assignment</label>
                        <select
                          className="w-full mt-1 p-2 border rounded-md"
                          value={clarificationForm.assignmentId}
                          onChange={(e) => setClarificationForm({ ...clarificationForm, assignmentId: parseInt(e.target.value) })}
                          data-testid="select-assignment"
                        >
                          <option value={0}>Select an assignment</option>
                          {assignments.map((a: any) => (
                            <option key={a.id} value={a.id}>{a.title}</option>
                          ))}
                        </select>
                      </div>
                      <Textarea
                        placeholder="What would you like to ask?"
                        value={clarificationForm.question}
                        onChange={(e) => setClarificationForm({ ...clarificationForm, question: e.target.value })}
                        data-testid="input-question"
                      />
                      <Button
                        onClick={() => requestClarificationMutation.mutate(clarificationForm)}
                        disabled={!clarificationForm.assignmentId || requestClarificationMutation.isPending}
                        className="w-full"
                        data-testid="button-submit-question"
                      >
                        {requestClarificationMutation.isPending ? "Sending..." : "Send Question"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {clarifications.map((c: any) => (
                    <div key={c.id} className="p-4 border rounded-lg" data-testid={`card-clarification-${c.id}`}>
                      <div className="space-y-2">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Your Question:</p>
                          <p className="text-sm" data-testid={`text-question-${c.id}`}>{c.question}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            Asked: {new Date(c.askedDate).toLocaleDateString()}
                          </p>
                        </div>
                        {c.answer ? (
                          <div className="bg-blue-50 p-3 rounded">
                            <p className="text-sm font-medium text-blue-900">Teacher's Answer:</p>
                            <p className="text-sm text-blue-800" data-testid={`text-answer-${c.id}`}>{c.answer}</p>
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

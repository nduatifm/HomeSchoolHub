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
  Calendar,
  UserPlus,
  LogOut,
  MessageSquare,
  Send,
  BarChart,
  Download,
  DollarSign,
  Star,
  ClipboardCheck,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ModernSidebar from "@/components/ModernSidebar";
import WelcomeCard from "@/components/WelcomeCard";
import ColorfulStatCard from "@/components/ColorfulStatCard";
import ModernCombobox from "@/components/ModernCombobox";

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

export default function ParentDashboard() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState(() => {
    const hash = window.location.hash.replace("#", "");
    return hash || "children";
  });

  // Listen to hash changes from sidebar navigation
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace("#", "");
      if (hash) setActiveTab(hash);
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  // Dialog state
  const [inviteStudentOpen, setInviteStudentOpen] = useState(false);
  const [requestTutorOpen, setRequestTutorOpen] = useState(false);
  const [sendMessageOpen, setSendMessageOpen] = useState(false);
  const [createPaymentOpen, setCreatePaymentOpen] = useState(false);
  const [rateTutorOpen, setRateTutorOpen] = useState(false);

  // Fetch data
  const { data: students = [] } = useQuery({
    queryKey: ["/api/students/parent"],
  });
  const { data: invites = [] } = useQuery({
    queryKey: ["/api/invites/student/parent"],
  });
  const { data: tutorRequests = [] } = useQuery({
    queryKey: ["/api/tutor-requests/parent"],
  });
  const paymentsQuery = useQuery({ queryKey: ["/api/payments/parent"] });
  const { data: messages = [] } = useQuery({ queryKey: ["/api/messages"] });
  const { data: users = [] } = useQuery({ queryKey: ["/api/users"] });
  const { data: teachers = [] } = useQuery({ queryKey: ["/api/users"] });
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
        description: `Invite code: ${data.token}`,
        type: "success",
      });
      setInviteForm({ email: "", studentName: "", gradeLevel: "" });
      setInviteStudentOpen(false);
    },
  });

  // Request tutor form
  const [tutorRequestForm, setTutorRequestForm] = useState({
    teacherId: 1,
    message: "",
    studentId: null as number | null,
  });

  const requestTutorMutation = useMutation({
    mutationFn: (data: any) =>
      apiRequest("/api/tutor-requests", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/tutor-requests/parent"],
      });
      toast({ title: "Tutor request sent!", type: "success" });
      setTutorRequestForm({ teacherId: 1, message: "", studentId: null });
      setRequestTutorOpen(false);
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

      <div className="ml-24 flex">
        <main className="flex-1 p-8">
          <WelcomeCard
            name={user?.name || "Parent"}
            message="Stay connected with your child's learning journey. Monitor progress and support their growth."
            buttonText="View Children"
            onButtonClick={() => setActiveTab("children")}
          />

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 my-8">
            <ColorfulStatCard
              title="Children"
              value={students.length}
              icon={Users}
              className="bg-purple-500"
              subtitle="Registered"
            />
            <ColorfulStatCard
              title="Invites"
              value={invites.length}
              icon={UserPlus}
              className="bg-green-500"
              subtitle="Pending invites"
            />
            <ColorfulStatCard
              title="Tutor Requests"
              value={tutorRequests.length}
              icon={FileText}
              className="bg-pink-500"
              subtitle="Active requests"
            />
            <ColorfulStatCard
              title="Payments"
              value={payments.length}
              icon={DollarSign}
              className="bg-orange-500"
              subtitle="Total payments"
            />
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="children" data-testid="tab-children">
                My Children
              </TabsTrigger>
              <TabsTrigger value="invites" data-testid="tab-invites">
                Invite Student
              </TabsTrigger>
              <TabsTrigger value="progress" data-testid="tab-progress">
                Track Progress
              </TabsTrigger>
              <TabsTrigger value="payments" data-testid="tab-payments">
                Payments
              </TabsTrigger>
              <TabsTrigger value="rate-tutor" data-testid="tab-rate-tutor">
                Rate Tutor
              </TabsTrigger>
              <TabsTrigger value="attendance" data-testid="tab-attendance">
                Attendance
              </TabsTrigger>
              <TabsTrigger value="tutors" data-testid="tab-tutors">
                Tutor Requests
              </TabsTrigger>
              <TabsTrigger value="reports" data-testid="tab-reports">
                Progress Reports
              </TabsTrigger>
              <TabsTrigger value="controls" data-testid="tab-controls">
                Parental Controls
              </TabsTrigger>
              <TabsTrigger value="messages" data-testid="tab-messages">
                Messages
              </TabsTrigger>
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
                          <CardTitle
                            className="text-lg"
                            data-testid={`text-student-name-${s.id}`}
                          >
                            {s.name}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <p className="text-sm">
                              <strong>Grade:</strong> {s.gradeLevel}
                            </p>
                            <p className="text-sm">
                              <strong>Points:</strong> {s.points}
                            </p>
                            <p className="text-sm">
                              <strong>Badges:</strong> {s.badges.length}
                            </p>
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
                          <TableHead>Status</TableHead>
                          <TableHead>Invite Code</TableHead>
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
                              <Badge>{i.status}</Badge>
                            </TableCell>
                            <TableCell
                              className="font-mono text-xs"
                              data-testid={`text-invite-token-${i.id}`}
                            >
                              {i.token}
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
                      <h3 className="font-medium mb-4">
                        {selectedStudent.name}'s Assignments
                      </h3>
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
                            <TableRow
                              key={a.id}
                              data-testid={`row-assignment-${a.id}`}
                            >
                              <TableCell>{a.title}</TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    a.studentAssignment.status === "graded"
                                      ? "default"
                                      : "outline"
                                  }
                                >
                                  {a.studentAssignment.status}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {a.studentAssignment.grade || "-"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-600">
                      Select a child from "My Children" tab to view their
                      progress
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="payments">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Payments</CardTitle>
                  <Dialog
                    open={createPaymentOpen}
                    onOpenChange={setCreatePaymentOpen}
                  >
                    <DialogTrigger asChild>
                      <Button data-testid="button-create-payment">
                        <DollarSign className="h-4 w-4 mr-2" />
                        Create Payment
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create New Payment</DialogTitle>
                      </DialogHeader>
                      <Form {...paymentForm}>
                        <form
                          onSubmit={paymentForm.handleSubmit((data) =>
                            createPaymentMutation.mutate(data),
                          )}
                          className="space-y-4"
                        >
                          <FormField
                            control={paymentForm.control}
                            name="teacherId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Teacher</FormLabel>
                                <FormControl>
                                  <Select
                                    onValueChange={(v) =>
                                      field.onChange(parseInt(v))
                                    }
                                    value={field.value.toString()}
                                  >
                                    <SelectTrigger data-testid="select-payment-teacher">
                                      <SelectValue placeholder="Select a teacher" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {teachers
                                        .filter(
                                          (u: any) => u.role === "teacher",
                                        )
                                        .map((t: any) => (
                                          <SelectItem
                                            key={t.id}
                                            value={t.id.toString()}
                                          >
                                            {t.name}
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
                            control={paymentForm.control}
                            name="amount"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Amount</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    placeholder="Enter amount"
                                    {...field}
                                    onChange={(e) =>
                                      field.onChange(
                                        parseFloat(e.target.value) || 0,
                                      )
                                    }
                                    data-testid="input-payment-amount"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={paymentForm.control}
                            name="description"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Description</FormLabel>
                                <FormControl>
                                  <Textarea
                                    placeholder="Payment description..."
                                    rows={3}
                                    {...field}
                                    data-testid="input-payment-description"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={paymentForm.control}
                            name="subscriptionType"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>
                                  Subscription Type (Optional)
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="e.g., Monthly, Weekly"
                                    {...field}
                                    data-testid="input-payment-subscription"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <Button
                            type="submit"
                            disabled={createPaymentMutation.isPending}
                            className="w-full"
                            data-testid="button-submit-payment"
                          >
                            {createPaymentMutation.isPending
                              ? "Creating..."
                              : "Create Payment"}
                          </Button>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent>
                  {paymentsQuery.isLoading ? (
                    <div className="text-center py-8">Loading payments...</div>
                  ) : paymentsQuery.isError ? (
                    <div className="text-center py-8 text-red-500">
                      Error loading payments
                    </div>
                  ) : payments.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">
                      No payments yet
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {payments.map((p: any) => (
                          <TableRow
                            key={p.id}
                            data-testid={`row-payment-${p.id}`}
                          >
                            <TableCell
                              data-testid={`text-payment-date-${p.id}`}
                            >
                              {new Date(p.paymentDate).toLocaleDateString()}
                            </TableCell>
                            <TableCell
                              data-testid={`text-payment-amount-${p.id}`}
                            >
                              ${p.amount.toFixed(2)}
                            </TableCell>
                            <TableCell>{p.description || "-"}</TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  p.status === "completed"
                                    ? "default"
                                    : "secondary"
                                }
                              >
                                {p.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="rate-tutor">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Rate Tutor</CardTitle>
                  <Dialog open={rateTutorOpen} onOpenChange={setRateTutorOpen}>
                    <DialogTrigger asChild>
                      <Button data-testid="button-rate-tutor">
                        <Star className="h-4 w-4 mr-2" />
                        Rate a Tutor
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Rate a Tutor</DialogTitle>
                      </DialogHeader>
                      <Form {...ratingForm}>
                        <form
                          onSubmit={ratingForm.handleSubmit((data) =>
                            rateTutorMutation.mutate(data),
                          )}
                          className="space-y-4"
                        >
                          <FormField
                            control={ratingForm.control}
                            name="teacherId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Teacher</FormLabel>
                                <FormControl>
                                  <Select
                                    onValueChange={(v) =>
                                      field.onChange(parseInt(v))
                                    }
                                    value={field.value.toString()}
                                  >
                                    <SelectTrigger data-testid="select-rating-teacher">
                                      <SelectValue placeholder="Select a teacher" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {teachers
                                        .filter(
                                          (u: any) => u.role === "teacher",
                                        )
                                        .map((t: any) => (
                                          <SelectItem
                                            key={t.id}
                                            value={t.id.toString()}
                                          >
                                            {t.name}
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
                            control={ratingForm.control}
                            name="rating"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Rating (1-5 stars)</FormLabel>
                                <FormControl>
                                  <Select
                                    onValueChange={(v) =>
                                      field.onChange(parseInt(v))
                                    }
                                    value={field.value.toString()}
                                  >
                                    <SelectTrigger data-testid="select-rating-stars">
                                      <SelectValue placeholder="Select rating" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="1">1 Star</SelectItem>
                                      <SelectItem value="2">2 Stars</SelectItem>
                                      <SelectItem value="3">3 Stars</SelectItem>
                                      <SelectItem value="4">4 Stars</SelectItem>
                                      <SelectItem value="5">5 Stars</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={ratingForm.control}
                            name="comment"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Comment</FormLabel>
                                <FormControl>
                                  <Textarea
                                    placeholder="Share your experience..."
                                    rows={4}
                                    {...field}
                                    data-testid="input-rating-comment"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <Button
                            type="submit"
                            disabled={rateTutorMutation.isPending}
                            className="w-full"
                            data-testid="button-submit-rating"
                          >
                            {rateTutorMutation.isPending
                              ? "Submitting..."
                              : "Submit Rating"}
                          </Button>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent>
                  {ratingsQuery.isLoading ? (
                    <div className="text-center py-8">Loading ratings...</div>
                  ) : ratingsQuery.isError ? (
                    <div className="text-center py-8 text-red-500">
                      Error loading ratings
                    </div>
                  ) : tutorRatings.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">
                      No ratings submitted yet
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {tutorRatings.map((r: any) => (
                        <div
                          key={r.id}
                          className="p-4 border rounded-lg"
                          data-testid={`card-rating-${r.id}`}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <p
                                  className="font-medium"
                                  data-testid={`text-rating-teacher-${r.id}`}
                                >
                                  {teachers.find(
                                    (t: any) => t.id === r.teacherId,
                                  )?.name || `Teacher #${r.teacherId}`}
                                </p>
                                <div className="flex items-center">
                                  {[...Array(r.rating)].map((_, i) => (
                                    <Star
                                      key={i}
                                      className="h-4 w-4 fill-yellow-400 text-yellow-400"
                                    />
                                  ))}
                                </div>
                              </div>
                              <p
                                className="text-sm"
                                data-testid={`text-rating-comment-${r.id}`}
                              >
                                {r.comment}
                              </p>
                              <p className="text-xs text-gray-500 mt-2">
                                {new Date(r.ratingDate).toLocaleDateString()}
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
                <CardHeader>
                  <CardTitle>Children's Attendance</CardTitle>
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
                        data-testid="select-view-student-attendance"
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
                        ) : studentAttendance.length === 0 ? (
                          <p className="text-center text-gray-500 py-8">
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
                              {studentAttendance.map((a: any) => (
                                <TableRow
                                  key={a.id}
                                  data-testid={`row-student-attendance-${a.id}`}
                                >
                                  <TableCell
                                    data-testid={`text-student-attendance-date-${a.id}`}
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
                                      data-testid={`badge-student-attendance-status-${a.id}`}
                                    >
                                      {a.status}
                                    </Badge>
                                  </TableCell>
                                  <TableCell
                                    data-testid={`text-student-attendance-notes-${a.id}`}
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
                        <DialogTitle>Request Tutor</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <Textarea
                          placeholder="Message to tutor..."
                          value={tutorRequestForm.message}
                          onChange={(e) =>
                            setTutorRequestForm({
                              ...tutorRequestForm,
                              message: e.target.value,
                            })
                          }
                          data-testid="input-tutor-request-message"
                        />
                        <Button
                          onClick={() =>
                            requestTutorMutation.mutate(tutorRequestForm)
                          }
                          disabled={requestTutorMutation.isPending}
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
                    {tutorRequests.map((r: any) => (
                      <div
                        key={r.id}
                        className="p-4 border rounded-lg"
                        data-testid={`card-tutor-request-${r.id}`}
                      >
                        <p
                          className="font-medium"
                          data-testid={`text-tutor-request-message-${r.id}`}
                        >
                          {r.message}
                        </p>
                        <p className="text-sm text-gray-600">
                          Requested:{" "}
                          {new Date(r.requestDate).toLocaleDateString()}
                        </p>
                        <Badge
                          variant={
                            r.status === "approved" ? "default" : "outline"
                          }
                        >
                          {r.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="reports">
              <Card>
                <CardHeader>
                  <CardTitle>Student Progress Reports</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">
                        Select Student to View Reports
                      </label>
                      <select
                        className="w-full mt-1 p-2 border rounded-md"
                        value={selectedStudent?.id || 0}
                        onChange={(e) => {
                          const student = students.find(
                            (s: any) => s.id === parseInt(e.target.value),
                          );
                          setSelectedStudent(student || null);
                        }}
                        data-testid="select-student-reports"
                      >
                        <option value={0}>Select a student</option>
                        {students.map((s: any) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {selectedStudent && (
                      <div className="mt-6">
                        <h3 className="text-lg font-semibold mb-4">
                          Progress Reports for {selectedStudent.name}
                        </h3>
                        {studentProgressReports.length === 0 ? (
                          <p className="text-center text-gray-500 py-8">
                            No reports available yet
                          </p>
                        ) : (
                          <div className="space-y-4">
                            {studentProgressReports.map((report: any) => (
                              <div
                                key={report.id}
                                className="p-4 border rounded-lg"
                                data-testid={`card-report-${report.id}`}
                              >
                                <div className="flex justify-between items-start">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                      <h4 className="font-medium">
                                        Report #{report.id}
                                      </h4>
                                      <Badge>{report.overallGrade}</Badge>
                                    </div>
                                    <p className="text-sm text-gray-600">
                                      Date:{" "}
                                      {new Date(
                                        report.reportDate,
                                      ).toLocaleDateString()}
                                    </p>
                                    <div className="mt-2 space-y-1">
                                      <p className="text-sm">
                                        <strong>Comments:</strong>{" "}
                                        {report.comments}
                                      </p>
                                      <p className="text-sm">
                                        <strong>Strengths:</strong>{" "}
                                        {report.strengths}
                                      </p>
                                      <p className="text-sm">
                                        <strong>Areas for Improvement:</strong>{" "}
                                        {report.improvements}
                                      </p>
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
                            ))}
                          </div>
                        )}
                      </div>
                    )}
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
                      <label className="text-sm font-medium">
                        Select Student
                      </label>
                      <select
                        className="w-full mt-1 p-2 border rounded-md"
                        value={controlsForm.studentId}
                        onChange={(e) =>
                          setControlsForm({
                            ...controlsForm,
                            studentId: parseInt(e.target.value),
                          })
                        }
                        data-testid="select-controls-student"
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
                        Screen Time Limit (minutes)
                      </label>
                      <Input
                        type="number"
                        value={controlsForm.screenTimeLimit}
                        onChange={(e) =>
                          setControlsForm({
                            ...controlsForm,
                            screenTimeLimit: parseInt(e.target.value),
                          })
                        }
                        data-testid="input-screen-time"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">
                        Allowed Hours
                      </label>
                      <div className="grid grid-cols-2 gap-2 mt-1">
                        <Input
                          type="time"
                          value={controlsForm.allowedTimes.start}
                          onChange={(e) =>
                            setControlsForm({
                              ...controlsForm,
                              allowedTimes: {
                                ...controlsForm.allowedTimes,
                                start: e.target.value,
                              },
                            })
                          }
                          data-testid="input-time-start"
                        />
                        <Input
                          type="time"
                          value={controlsForm.allowedTimes.end}
                          onChange={(e) =>
                            setControlsForm({
                              ...controlsForm,
                              allowedTimes: {
                                ...controlsForm.allowedTimes,
                                end: e.target.value,
                              },
                            })
                          }
                          data-testid="input-time-end"
                        />
                      </div>
                    </div>
                    <Button
                      onClick={() => setControlsMutation.mutate(controlsForm)}
                      disabled={
                        !controlsForm.studentId || setControlsMutation.isPending
                      }
                      className="w-full"
                      data-testid="button-save-controls"
                    >
                      {setControlsMutation.isPending
                        ? "Saving..."
                        : "Save Controls"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="messages">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Messages</CardTitle>
                  <Dialog
                    open={sendMessageOpen}
                    onOpenChange={setSendMessageOpen}
                  >
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
                          <label className="text-sm font-medium mb-2 block">
                            To
                          </label>
                          <ModernCombobox
                            users={users}
                            selectedUserId={messageForm.receiverId}
                            onSelect={(userId) =>
                              setMessageForm({
                                ...messageForm,
                                receiverId: userId,
                              })
                            }
                            placeholder="Search users..."
                            testId="select-receiver"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Message</label>
                          <Textarea
                            placeholder="Type your message..."
                            value={messageForm.content}
                            onChange={(e) =>
                              setMessageForm({
                                ...messageForm,
                                content: e.target.value,
                              })
                            }
                            rows={4}
                            data-testid="input-message-content"
                          />
                        </div>
                        <Button
                          onClick={() =>
                            sendMessageMutation.mutate(messageForm)
                          }
                          disabled={
                            sendMessageMutation.isPending ||
                            !messageForm.receiverId ||
                            !messageForm.content
                          }
                          className="w-full"
                          data-testid="button-send-message"
                        >
                          {sendMessageMutation.isPending
                            ? "Sending..."
                            : "Send"}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent>
                  <div className="h-[500px] overflow-y-auto space-y-3">
                    {messages.length === 0 ? (
                      <p className="text-center text-gray-500 py-8">
                        No messages yet
                      </p>
                    ) : (
                      messages.map((msg: any) => (
                        <div
                          key={msg.id}
                          className={`p-4 rounded-lg border ${msg.senderId === user?.id ? "bg-blue-50 ml-8" : "bg-gray-50 mr-8"}`}
                          data-testid={`message-${msg.id}`}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <span className="font-medium text-sm">
                              {msg.senderId === user?.id
                                ? "You"
                                : `User #${msg.senderId}`}
                            </span>
                            <span className="text-xs text-gray-500">
                              {new Date(msg.sentDate).toLocaleString()}
                            </span>
                          </div>
                          <p
                            className="text-sm"
                            data-testid={`text-message-content-${msg.id}`}
                          >
                            {msg.content}
                          </p>
                          {!msg.isRead && msg.receiverId === user?.id && (
                            <Badge variant="secondary" className="mt-2">
                              Unread
                            </Badge>
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

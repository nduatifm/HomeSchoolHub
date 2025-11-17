import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { SessionsCard } from "@/components/dashboard/SessionsCard";
import { AssignmentsCard } from "@/components/dashboard/AssignmentsCard";
import { ProgressCard } from "@/components/dashboard/ProgressCard";
import { AISummaryCard } from "@/components/dashboard/AISummaryCard";
import { MessagesCard } from "@/components/dashboard/MessagesCard";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { TutoringSession, User, Subject } from "@/types";
import { TutorRequest } from "@shared/schema";
import { UserCircle2, BookOpen, Calendar, BarChart2, Send, CheckCircle2, XCircle, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

// Form schema for creating a tutor request
const tutorRequestSchema = z.object({
  tutorId: z.string().min(1, "Please select a tutor"),
  studentId: z.string().optional(),
  subjectId: z.string().optional(),
  message: z.string().min(1, "Please add a message"),
});

type TutorRequestFormValues = z.infer<typeof tutorRequestSchema>;

export default function ParentDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);

  // Fetch children (students)
  const { data: children, isLoading: isLoadingChildren } = useQuery<User[]>({
    queryKey: [`/api/students/parent/${user?.id}`],
    enabled: !!user?.id,
  });

  // Fetch upcoming sessions for children
  const { data: upcomingSessions, isLoading: isLoadingSessions } = useQuery<TutoringSession[]>({
    queryKey: [`/api/sessions/upcoming/parent/${user?.id}`],
    enabled: !!user?.id,
  });

  // Fetch tutor requests
  const { data: tutorRequests, isLoading: isLoadingRequests } = useQuery<TutorRequest[]>({
    queryKey: [`/api/tutor-requests/parent/${user?.id}`],
    enabled: !!user?.id,
  });

  // Fetch available tutors
  const { data: tutors, isLoading: isLoadingTutors } = useQuery<User[]>({
    queryKey: ["/api/users/tutors"],
    enabled: !!user?.id,
  });

  // Fetch subjects
  const { data: subjects, isLoading: isLoadingSubjects } = useQuery<Subject[]>({
    queryKey: ["/api/subjects"],
    enabled: !!user?.id,
  });

  // Tutor request form
  const requestForm = useForm<TutorRequestFormValues>({
    resolver: zodResolver(tutorRequestSchema),
    defaultValues: {
      message: "",
    },
  });

  // Create tutor request mutation
  const createTutorRequest = useMutation({
    mutationFn: async (data: TutorRequestFormValues) => {
      return apiRequest("POST", "/api/tutor-requests", {
        tutorId: data.tutorId,
        studentId: data.studentId,
        subjectId: data.subjectId ? parseInt(data.subjectId) : undefined,
        message: data.message,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tutor-requests/parent/${user?.id}`] });
      setRequestDialogOpen(false);
      requestForm.reset();
      toast({
        title: "Request Sent",
        description: "Your tutor request has been sent successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to send tutor request: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const onSubmitRequest = (data: TutorRequestFormValues) => {
    createTutorRequest.mutate(data);
  };

  // Sample data for other components (would be fetched from API in a real app)
  const assignments = [
    { id: 1, title: "Weekly Math Problems (Set 3)", status: "completed" as const, timeAgo: "Yesterday", studentName: "Alex", action: "View" },
    { id: 2, title: "English Essay: Character Analysis", status: "in_progress" as const, timeAgo: "3 days ago", studentName: "Alex", action: "View" },
    { id: 3, title: "Science Lab Report", status: "overdue" as const, timeAgo: "1 week ago", studentName: "Alex", action: "Remind" },
  ];

  const progressData = [
    { id: "1", name: "Alex", profileImageUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=120&h=120", subject: "Algebra II", week: 6, totalWeeks: 8, completionPercentage: 85 },
  ];

  const aiSummary = {
    id: 1,
    title: "Algebra II with Sarah Johnson (Tutor)",
    date: "2 days ago",
    content: "Alex demonstrated strong understanding of quadratic equations and factoring polynomials. He completed all exercises successfully, though needed some guidance on word problems.",
    keyConcepts: ["Quadratic equations", "Factoring polynomials", "Word problem strategies"],
    homeworkAssigned: "Complete worksheets 3-4 in the Algebra workbook. Review factoring techniques for the quiz next week.",
    engagementLevel: 5, // 1-5 scale
  };

  const messages = [
    { id: 1, senderName: "Sarah Johnson", senderRole: "Tutor", senderAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=120&h=120", content: "Alex is making excellent progress with algebraic expressions. I've assigned some extra practice to help with word problems.", timestamp: "Yesterday at 2:15 PM" },
    { id: 2, senderName: "Daniel Wilson", senderRole: "Science Tutor", senderAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=120&h=120", content: "We need to reschedule our next science session. Is Friday at 3 PM possible?", timestamp: "Monday at 9:30 AM" },
  ];

  return (
    <DashboardLayout 
      title="Parent Dashboard" 
      subtitle={`Welcome back, ${user?.firstName || 'Parent'}! Here's what's happening with your child's education.`}
    >
      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <StatsCard 
          title="Children" 
          value={children?.length || "..."}
          icon={UserCircle2} 
          colorClass="bg-primary-100 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400"
        />
        <StatsCard 
          title="Upcoming Sessions" 
          value={upcomingSessions?.length || "..."}
          icon={Calendar} 
          colorClass="bg-secondary-100 text-secondary-600 dark:bg-secondary-900/20 dark:text-secondary-400"
        />
        <StatsCard 
          title="Active Assignments" 
          value="4" 
          icon={BookOpen} 
          colorClass="bg-accent-100 text-accent-600 dark:bg-accent-900/20 dark:text-accent-400"
        />
        <StatsCard 
          title="Overall Progress" 
          value="78%" 
          icon={BarChart2} 
          colorClass="bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400"
        />
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2/3 width on large screens) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Children Overview */}
          <Card>
            <CardHeader className="px-6 py-4 border-b flex justify-between items-center">
              <CardTitle className="text-lg font-semibold">My Children</CardTitle>
              <Button variant="link" className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium p-0">
                Add Child
              </Button>
            </CardHeader>
            <CardContent className="p-0 divide-y divide-gray-100 dark:divide-gray-800">
              {isLoadingChildren ? (
                <div className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                  Loading children...
                </div>
              ) : children?.length === 0 ? (
                <div className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                  No children added yet. Add your first child to get started.
                </div>
              ) : (
                <>
                  {(children || []).map((child) => (
                    <div key={child.id} className="px-6 py-4 flex items-center">
                      <div className="mr-4 flex-shrink-0">
                        <img 
                          src={child.profileImageUrl || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=120&h=120"} 
                          alt={child.firstName || "Child"} 
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-sm font-medium">{child.firstName} {child.lastName}</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          <span className="flex items-center mt-1">
                            <BookOpen className="h-4 w-4 mr-1 text-gray-400 dark:text-gray-500" />
                            3 subjects • 2 tutors
                          </span>
                        </p>
                      </div>
                      <div className="ml-4 flex-shrink-0 flex space-x-2">
                        <Link href={`/progress/student/${child.id}`}>
                          <Button size="sm" variant="outline">View Progress</Button>
                        </Link>
                        <Link href={`/schedule/student/${child.id}`}>
                          <Button size="sm" variant="default">Schedule Session</Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </CardContent>
          </Card>

          {/* Tutor Requests */}
          <Card>
            <CardHeader className="px-6 py-4 border-b flex justify-between items-center">
              <CardTitle className="text-lg font-semibold">Tutor Requests</CardTitle>
              <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" data-testid="button-send-tutor-request">
                    <Send className="h-4 w-4 mr-2" />
                    Send Request
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[525px]">
                  <DialogHeader>
                    <DialogTitle>Send Tutor Request</DialogTitle>
                    <DialogDescription>
                      Send a tutoring request to a tutor for your child.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <Form {...requestForm}>
                    <form onSubmit={requestForm.handleSubmit(onSubmitRequest)} className="space-y-4">
                      <FormField
                        control={requestForm.control}
                        name="tutorId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tutor</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-tutor">
                                  <SelectValue placeholder="Select a tutor" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {isLoadingTutors ? (
                                  <SelectItem value="loading">Loading tutors...</SelectItem>
                                ) : (tutors || []).map((tutor) => (
                                  <SelectItem key={tutor.id} value={tutor.id} data-testid={`select-tutor-${tutor.id}`}>
                                    {tutor.firstName} {tutor.lastName}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={requestForm.control}
                        name="studentId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Child (Optional)</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-student">
                                  <SelectValue placeholder="Select a child" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="">None</SelectItem>
                                {(children || []).map((child) => (
                                  <SelectItem key={child.id} value={child.id} data-testid={`select-student-${child.id}`}>
                                    {child.firstName} {child.lastName}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={requestForm.control}
                        name="subjectId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Subject (Optional)</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-subject">
                                  <SelectValue placeholder="Select a subject" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="">None</SelectItem>
                                {isLoadingSubjects ? (
                                  <SelectItem value="loading">Loading subjects...</SelectItem>
                                ) : (subjects || []).map((subject) => (
                                  <SelectItem key={subject.id} value={subject.id.toString()} data-testid={`select-subject-${subject.id}`}>
                                    {subject.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={requestForm.control}
                        name="message"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Message</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Tell the tutor about your needs..." 
                                className="resize-none min-h-[100px]" 
                                {...field}
                                data-testid="textarea-message"
                              />
                            </FormControl>
                            <FormDescription>
                              Describe what help you're looking for and any specific requirements.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setRequestDialogOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={createTutorRequest.isPending} data-testid="button-submit-request">
                          {createTutorRequest.isPending ? "Sending..." : "Send Request"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent className="p-0 divide-y divide-gray-100 dark:divide-gray-800">
              {isLoadingRequests ? (
                <div className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                  Loading requests...
                </div>
              ) : tutorRequests?.length === 0 ? (
                <div className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                  No tutor requests yet. Send a request to get started!
                </div>
              ) : (
                <>
                  {(tutorRequests || []).map((request) => (
                    <div key={request.id} className="px-6 py-4" data-testid={`tutor-request-${request.id}`}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-sm font-medium" data-testid={`text-tutor-name-${request.id}`}>
                              Request to Tutor
                            </h4>
                            <Badge 
                              variant="outline"
                              className={
                                request.status === 'approved' 
                                  ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                                  : request.status === 'rejected'
                                    ? 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                                    : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400'
                              }
                              data-testid={`status-${request.status}-${request.id}`}
                            >
                              {request.status === 'approved' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                              {request.status === 'rejected' && <XCircle className="h-3 w-3 mr-1" />}
                              {request.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                              {request.status}
                            </Badge>
                          </div>
                          {request.message && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1" data-testid={`text-message-${request.id}`}>
                              {request.message}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Sessions */}
          <SessionsCard 
            title="Upcoming Sessions"
            sessions={upcomingSessions || []}
            loading={isLoadingSessions}
            emptyMessage="No upcoming sessions scheduled. Schedule a session with a tutor."
          />

          {/* Recent Assignment Activity */}
          <AssignmentsCard 
            title="Recent Assignments"
            assignments={assignments}
            viewAllLink="/assignments"
          />
        </div>

        {/* Right Column (1/3 width on large screens) */}
        <div className="space-y-6">
          {/* Children Progress */}
          <ProgressCard students={progressData} />

          {/* Recent Session Summaries */}
          <AISummaryCard 
            summary={aiSummary}
          />

          {/* Messages from Tutors */}
          <MessagesCard messages={messages} />
        </div>
      </div>
    </DashboardLayout>
  );
}

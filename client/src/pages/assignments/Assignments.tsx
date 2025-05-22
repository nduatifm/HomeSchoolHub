import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { StudentAssignment, Assignment, Subject } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarIcon, Filter, PlusCircle, CheckCircle, Clock, AlertTriangle, Edit, Eye, Upload } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { cn, getStatusColor } from "@/lib/utils";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

// Form schema for creating an assignment
const createAssignmentSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  subjectId: z.string().optional(),
  dueDate: z.date().optional(),
});

type CreateAssignmentFormValues = z.infer<typeof createAssignmentSchema>;

// Form schema for submitting an assignment
const submitAssignmentSchema = z.object({
  submissionText: z.string().optional(),
  submissionUrl: z.string().optional(),
});

type SubmitAssignmentFormValues = z.infer<typeof submitAssignmentSchema>;

function getStatusBadge(status: string) {
  switch (status) {
    case 'completed':
      return <Badge className="bg-secondary-500 dark:bg-secondary-700">Completed</Badge>;
    case 'in_progress':
      return <Badge className="bg-accent-500 dark:bg-accent-700">In Progress</Badge>;
    case 'overdue':
      return <Badge className="bg-red-500 dark:bg-red-700">Overdue</Badge>;
    case 'assigned':
    case 'new':
      return <Badge className="bg-primary-500 dark:bg-primary-700">New</Badge>;
    default:
      return <Badge>Unknown</Badge>;
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'completed':
      return <CheckCircle className="h-5 w-5" />;
    case 'in_progress':
      return <Clock className="h-5 w-5" />;
    case 'overdue':
      return <AlertTriangle className="h-5 w-5" />;
    case 'assigned':
    case 'new':
      return <Edit className="h-5 w-5" />;
    default:
      return <CheckCircle className="h-5 w-5" />;
  }
}

export default function Assignments() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<StudentAssignment | null>(null);
  const [filterSubject, setFilterSubject] = useState<string>("");

  // Create assignment form
  const createForm = useForm<CreateAssignmentFormValues>({
    resolver: zodResolver(createAssignmentSchema),
    defaultValues: {
      title: "",
      description: "",
    },
  });

  // Submit assignment form
  const submitForm = useForm<SubmitAssignmentFormValues>({
    resolver: zodResolver(submitAssignmentSchema),
    defaultValues: {
      submissionText: "",
      submissionUrl: "",
    },
  });

  // Get assignments based on user role
  const isStudent = user?.role === "student";
  const isTutor = user?.role === "tutor";
  const isParent = user?.role === "parent";

  // Fetch assignments based on role
  const { data: assignments, isLoading: isLoadingAssignments } = useQuery({
    queryKey: isStudent 
      ? [`/api/assignments/student/${user?.id}`] 
      : isTutor
        ? [`/api/assignments/tutor/${user?.id}`]
        : [`/api/assignments/parent/${user?.id}`],
    enabled: !!user?.id,
  });

  // Fetch subjects for assignment creation
  const { data: subjects, isLoading: isLoadingSubjects } = useQuery<Subject[]>({
    queryKey: ["/api/subjects"],
    enabled: isTutor, // Only load for tutors who can create assignments
  });

  // Create assignment mutation
  const createAssignment = useMutation({
    mutationFn: async (data: CreateAssignmentFormValues) => {
      return apiRequest("POST", "/api/assignments", {
        title: data.title,
        description: data.description,
        subjectId: data.subjectId ? parseInt(data.subjectId) : undefined,
        dueDate: data.dueDate,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/assignments/tutor/${user?.id}`] });
      setCreateDialogOpen(false);
      createForm.reset();
      toast({
        title: "Assignment Created",
        description: "The assignment has been created successfully.",
        variant: "success",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create assignment: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Submit assignment mutation
  const submitAssignment = useMutation({
    mutationFn: async (data: SubmitAssignmentFormValues) => {
      if (!selectedAssignment) return;
      return apiRequest("PATCH", `/api/student-assignments/${selectedAssignment.id}`, {
        status: "completed",
        submissionText: data.submissionText,
        submissionUrl: data.submissionUrl,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/assignments/student/${user?.id}`] });
      setSubmitDialogOpen(false);
      submitForm.reset();
      toast({
        title: "Assignment Submitted",
        description: "Your assignment has been submitted successfully.",
        variant: "success",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to submit assignment: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Handle assignment creation
  const onSubmitCreate = (data: CreateAssignmentFormValues) => {
    createAssignment.mutate(data);
  };

  // Handle assignment submission
  const onSubmitSubmission = (data: SubmitAssignmentFormValues) => {
    submitAssignment.mutate(data);
  };

  // Filter assignments based on active tab
  const filteredAssignments = (assignments || []).filter((assignment) => {
    if (activeTab === "all") return true;
    if (activeTab === "completed") return assignment.status === "completed";
    if (activeTab === "pending") return assignment.status === "assigned" || assignment.status === "in_progress";
    if (activeTab === "overdue") return assignment.status === "overdue";
    return true;
  }).filter((assignment) => {
    if (!filterSubject) return true;
    return assignment.subjectId?.toString() === filterSubject;
  });

  return (
    <DashboardLayout 
      title="Assignments" 
      subtitle="Manage and track all assignments in one place."
    >
      <Card className="mb-6">
        <CardHeader className="px-6 py-4 border-b flex flex-wrap justify-between items-center gap-4">
          <CardTitle className="text-lg font-semibold">Assignments</CardTitle>
          <div className="flex flex-wrap gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="flex items-center gap-1">
                  <Filter className="h-4 w-4 mr-1" />
                  Filter
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <div className="space-y-4">
                  <h4 className="font-medium">Filter Assignments</h4>
                  <div className="space-y-2">
                    <FormLabel>Subject</FormLabel>
                    <Select value={filterSubject} onValueChange={setFilterSubject}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Subjects" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All Subjects</SelectItem>
                        {(subjects || []).map((subject) => (
                          <SelectItem key={subject.id} value={subject.id.toString()}>
                            {subject.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            
            {isTutor && (
              <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="flex items-center gap-1">
                    <PlusCircle className="h-4 w-4 mr-1" />
                    Create Assignment
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[525px]">
                  <DialogHeader>
                    <DialogTitle>Create New Assignment</DialogTitle>
                    <DialogDescription>
                      Create a new assignment for your students.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <Form {...createForm}>
                    <form onSubmit={createForm.handleSubmit(onSubmitCreate)} className="space-y-4">
                      <FormField
                        control={createForm.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Title</FormLabel>
                            <FormControl>
                              <Input placeholder="Assignment title" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={createForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Describe the assignment" 
                                className="resize-none min-h-[100px]" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={createForm.control}
                        name="subjectId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Subject</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a subject" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {isLoadingSubjects ? (
                                  <SelectItem value="loading">Loading subjects...</SelectItem>
                                ) : (subjects || []).map((subject) => (
                                  <SelectItem key={subject.id} value={subject.id.toString()}>
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
                        control={createForm.control}
                        name="dueDate"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>Due Date</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant={"outline"}
                                    className={cn(
                                      "w-full pl-3 text-left font-normal",
                                      !field.value && "text-muted-foreground"
                                    )}
                                  >
                                    {field.value ? (
                                      format(field.value, "PPP")
                                    ) : (
                                      <span>Pick a date</span>
                                    )}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={field.value}
                                  onSelect={field.onChange}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={createAssignment.isPending}>
                          {createAssignment.isPending ? "Creating..." : "Create Assignment"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="px-6 py-3 border-b">
              <TabsList className="grid grid-cols-4 w-full sm:w-auto">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="pending">Pending</TabsTrigger>
                <TabsTrigger value="completed">Completed</TabsTrigger>
                <TabsTrigger value="overdue">Overdue</TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value={activeTab} className="mt-0">
              {isLoadingAssignments ? (
                <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                  Loading assignments...
                </div>
              ) : filteredAssignments.length === 0 ? (
                <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                  No assignments found.
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {filteredAssignments.map((assignment) => (
                    <div key={assignment.id} className="p-6">
                      <div className="flex flex-wrap gap-4 sm:gap-6 items-start">
                        <div className={cn("flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full", getStatusColor(assignment.status))}>
                          {getStatusIcon(assignment.status)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap justify-between items-start gap-2 mb-2">
                            <div>
                              <h3 className="text-base font-medium">{assignment.title}</h3>
                              <div className="flex flex-wrap items-center gap-2 mt-1">
                                {getStatusBadge(assignment.status)}
                                {assignment.subjectId && (
                                  <Badge variant="outline" className="bg-gray-100 dark:bg-gray-800">
                                    {subjects?.find(s => s.id === assignment.subjectId)?.name || "Subject"}
                                  </Badge>
                                )}
                                {assignment.dueDate && (
                                  <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                                    <CalendarIcon className="h-3 w-3 mr-1" />
                                    Due: {format(new Date(assignment.dueDate), "MMM d, yyyy")}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {assignment.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                              {assignment.description}
                            </p>
                          )}
                          
                          {isStudent && assignment.status !== "completed" && (
                            <Dialog open={submitDialogOpen} onOpenChange={setSubmitDialogOpen}>
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="mt-2"
                                onClick={() => {
                                  setSelectedAssignment(assignment);
                                  setSubmitDialogOpen(true);
                                }}
                              >
                                <Upload className="h-4 w-4 mr-2" />
                                Submit Assignment
                              </Button>
                              
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Submit Assignment</DialogTitle>
                                  <DialogDescription>
                                    Submit your work for this assignment.
                                  </DialogDescription>
                                </DialogHeader>
                                
                                <Form {...submitForm}>
                                  <form onSubmit={submitForm.handleSubmit(onSubmitSubmission)} className="space-y-4">
                                    <FormField
                                      control={submitForm.control}
                                      name="submissionText"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>Submission Notes</FormLabel>
                                          <FormControl>
                                            <Textarea 
                                              placeholder="Add notes about your submission" 
                                              className="resize-none min-h-[100px]" 
                                              {...field} 
                                            />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                    
                                    <FormField
                                      control={submitForm.control}
                                      name="submissionUrl"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>Link to Work (Optional)</FormLabel>
                                          <FormControl>
                                            <Input placeholder="https://..." {...field} />
                                          </FormControl>
                                          <FormDescription>
                                            Provide a link to your work if it's hosted elsewhere
                                          </FormDescription>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                    
                                    <DialogFooter>
                                      <Button type="button" variant="outline" onClick={() => setSubmitDialogOpen(false)}>Cancel</Button>
                                      <Button type="submit" disabled={submitAssignment.isPending}>
                                        {submitAssignment.isPending ? "Submitting..." : "Submit Assignment"}
                                      </Button>
                                    </DialogFooter>
                                  </form>
                                </Form>
                              </DialogContent>
                            </Dialog>
                          )}
                          
                          {/* For tutors to review submissions */}
                          {isTutor && assignment.status === "completed" && (
                            <Button variant="outline" size="sm" className="mt-2">
                              <Eye className="h-4 w-4 mr-2" />
                              Review Submission
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}

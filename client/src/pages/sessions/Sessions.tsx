import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { TutoringSession, User, Subject } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
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
import { CalendarIcon, PlusCircle, Video, Clock, FileText, Upload, Calendar as CalendarFull } from "lucide-react";
import { format, parseISO, isBefore, isToday, addHours } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

// Form schema for creating a session
const createSessionSchema = z.object({
  title: z.string().min(1, "Title is required"),
  subjectId: z.string().optional(),
  studentId: z.string().min(1, "Student is required"),
  startTime: z.date().refine(date => isBefore(new Date(), date), {
    message: "Start time must be in the future",
  }),
  endTime: z.date(),
  meetLink: z.string().url().optional().or(z.literal("")),
});

type CreateSessionFormValues = z.infer<typeof createSessionSchema>;

// Form schema for session notes
const sessionNotesSchema = z.object({
  notes: z.string().min(1, "Notes are required"),
  recordingFile: z.any().optional(),
});

type SessionNotesFormValues = z.infer<typeof sessionNotesSchema>;

export default function Sessions() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("upcoming");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<TutoringSession | null>(null);
  const [recordingFile, setRecordingFile] = useState<File | null>(null);

  // Create session form
  const createForm = useForm<CreateSessionFormValues>({
    resolver: zodResolver(createSessionSchema),
    defaultValues: {
      title: "",
      meetLink: "",
    },
  });

  // Session notes form
  const notesForm = useForm<SessionNotesFormValues>({
    resolver: zodResolver(sessionNotesSchema),
    defaultValues: {
      notes: "",
    },
  });

  // Get sessions based on user role
  const isStudent = user?.role === "student";
  const isTutor = user?.role === "tutor";
  const isParent = user?.role === "parent";

  // Fetch all sessions
  const { data: allSessions, isLoading: isLoadingAllSessions } = useQuery<TutoringSession[]>({
    queryKey: isStudent 
      ? [`/api/sessions/student/${user?.id}`] 
      : isTutor
        ? [`/api/sessions/tutor/${user?.id}`]
        : [`/api/sessions/parent/${user?.id}`],
    enabled: !!user?.id,
  });

  // Fetch upcoming sessions
  const { data: upcomingSessions, isLoading: isLoadingUpcoming } = useQuery<TutoringSession[]>({
    queryKey: isStudent 
      ? [`/api/sessions/upcoming/student/${user?.id}`] 
      : isTutor
        ? [`/api/sessions/upcoming/tutor/${user?.id}`]
        : [`/api/sessions/upcoming/parent/${user?.id}`],
    enabled: !!user?.id,
  });

  // Fetch subjects for session creation
  const { data: subjects, isLoading: isLoadingSubjects } = useQuery<Subject[]>({
    queryKey: ["/api/subjects"],
    enabled: isTutor, // Only load for tutors who can create sessions
  });

  // Fetch students for session creation (for tutors)
  const { data: students, isLoading: isLoadingStudents } = useQuery<User[]>({
    queryKey: [`/api/students/tutor/${user?.id}`],
    enabled: !!user?.id && isTutor,
  });

  // Create session mutation
  const createSession = useMutation({
    mutationFn: async (data: CreateSessionFormValues) => {
      return apiRequest("POST", "/api/sessions", {
        title: data.title,
        subjectId: data.subjectId ? parseInt(data.subjectId) : undefined,
        studentId: data.studentId,
        startTime: data.startTime.toISOString(),
        endTime: data.endTime.toISOString(),
        meetLink: data.meetLink,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/sessions/tutor/${user?.id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/sessions/upcoming/tutor/${user?.id}`] });
      setCreateDialogOpen(false);
      createForm.reset();
      toast({
        title: "Session Scheduled",
        description: "The session has been scheduled successfully.",
        variant: "success",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to schedule session: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Update session with notes and optionally generate AI summary
  const updateSessionNotes = useMutation({
    mutationFn: async (data: SessionNotesFormValues) => {
      if (!selectedSession) return;
      
      // First update session with notes and mark as completed
      const updatedSession = await apiRequest("PATCH", `/api/sessions/${selectedSession.id}`, {
        notes: data.notes,
        status: "completed",
      });

      // If recording file is present, generate AI summary
      if (recordingFile) {
        const formData = new FormData();
        formData.append("sessionId", selectedSession.id.toString());
        formData.append("notes", data.notes);
        formData.append("recording", recordingFile);

        await fetch("/api/ai-summary", {
          method: "POST",
          body: formData,
        });
      }

      return updatedSession;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/sessions/tutor/${user?.id}`] });
      setNotesDialogOpen(false);
      notesForm.reset();
      setRecordingFile(null);
      toast({
        title: "Session Updated",
        description: recordingFile 
          ? "Session notes saved and AI summary generated."
          : "Session notes have been saved.",
        variant: "success",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update session: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Handle file change for recording upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setRecordingFile(e.target.files[0]);
    }
  };

  // Handle session creation
  const onSubmitCreate = (data: CreateSessionFormValues) => {
    createSession.mutate(data);
  };

  // Handle session notes submission
  const onSubmitNotes = (data: SessionNotesFormValues) => {
    updateSessionNotes.mutate(data);
  };

  // Set end time when start time changes (default to 1 hour later)
  const handleStartTimeChange = (date: Date | undefined) => {
    if (date) {
      createForm.setValue("startTime", date);
      createForm.setValue("endTime", addHours(date, 1));
    }
  };

  // Filter sessions based on active tab
  const upcomingSessionsList = upcomingSessions || [];
  const pastSessionsList = allSessions 
    ? allSessions.filter(session => isBefore(new Date(session.endTime), new Date()))
    : [];
  const todaySessionsList = allSessions
    ? allSessions.filter(session => isToday(new Date(session.startTime)))
    : [];

  // Get sessions for the active tab
  const getActiveTabSessions = () => {
    switch (activeTab) {
      case "upcoming":
        return upcomingSessionsList;
      case "past":
        return pastSessionsList;
      case "today":
        return todaySessionsList;
      default:
        return upcomingSessionsList;
    }
  };

  return (
    <DashboardLayout 
      title="Sessions" 
      subtitle="Schedule, manage, and review your tutoring sessions."
    >
      <Card className="mb-6">
        <CardHeader className="px-6 py-4 border-b flex flex-wrap justify-between items-center gap-4">
          <CardTitle className="text-lg font-semibold">Sessions</CardTitle>
          {isTutor && (
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-1">
                  <PlusCircle className="h-4 w-4 mr-1" />
                  Schedule Session
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[525px]">
                <DialogHeader>
                  <DialogTitle>Schedule New Session</DialogTitle>
                  <DialogDescription>
                    Schedule a new tutoring session with a student.
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
                            <Input placeholder="Session title" {...field} />
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
                      name="studentId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Student</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a student" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {isLoadingStudents ? (
                                <SelectItem value="loading">Loading students...</SelectItem>
                              ) : (students || []).map((student) => (
                                <SelectItem key={student.id} value={student.id}>
                                  {student.firstName} {student.lastName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={createForm.control}
                        name="startTime"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>Start Time</FormLabel>
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
                                      format(field.value, "PPP HH:mm")
                                    ) : (
                                      <span>Pick date and time</span>
                                    )}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={field.value}
                                  onSelect={(date) => handleStartTimeChange(date)}
                                  initialFocus
                                />
                                {field.value && (
                                  <div className="p-3 border-t border-gray-100">
                                    <Select
                                      onValueChange={(value) => {
                                        const [hours, minutes] = value.split(':').map(Number);
                                        const newDate = new Date(field.value);
                                        newDate.setHours(hours, minutes);
                                        handleStartTimeChange(newDate);
                                      }}
                                      defaultValue={`${field.value.getHours().toString().padStart(2, '0')}:${field.value.getMinutes().toString().padStart(2, '0')}`}
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select time" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {Array.from({ length: 24 }).map((_, hour) => (
                                          <React.Fragment key={hour}>
                                            <SelectItem value={`${hour.toString().padStart(2, '0')}:00`}>
                                              {hour.toString().padStart(2, '0')}:00
                                            </SelectItem>
                                            <SelectItem value={`${hour.toString().padStart(2, '0')}:30`}>
                                              {hour.toString().padStart(2, '0')}:30
                                            </SelectItem>
                                          </React.Fragment>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                )}
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={createForm.control}
                        name="endTime"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>End Time</FormLabel>
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
                                      format(field.value, "PPP HH:mm")
                                    ) : (
                                      <span>Pick date and time</span>
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
                                {field.value && (
                                  <div className="p-3 border-t border-gray-100">
                                    <Select
                                      onValueChange={(value) => {
                                        const [hours, minutes] = value.split(':').map(Number);
                                        const newDate = new Date(field.value);
                                        newDate.setHours(hours, minutes);
                                        field.onChange(newDate);
                                      }}
                                      defaultValue={`${field.value.getHours().toString().padStart(2, '0')}:${field.value.getMinutes().toString().padStart(2, '0')}`}
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select time" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {Array.from({ length: 24 }).map((_, hour) => (
                                          <React.Fragment key={hour}>
                                            <SelectItem value={`${hour.toString().padStart(2, '0')}:00`}>
                                              {hour.toString().padStart(2, '0')}:00
                                            </SelectItem>
                                            <SelectItem value={`${hour.toString().padStart(2, '0')}:30`}>
                                              {hour.toString().padStart(2, '0')}:30
                                            </SelectItem>
                                          </React.Fragment>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                )}
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={createForm.control}
                      name="meetLink"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Meeting Link (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="https://meet.google.com/..." {...field} />
                          </FormControl>
                          <FormDescription>
                            Add a Google Meet or other video conferencing link
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
                      <Button type="submit" disabled={createSession.isPending}>
                        {createSession.isPending ? "Scheduling..." : "Schedule Session"}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          )}
        </CardHeader>
        
        <CardContent className="p-0">
          <Tabs defaultValue="upcoming" value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="px-6 py-3 border-b">
              <TabsList className="grid grid-cols-3 w-full sm:w-auto">
                <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                <TabsTrigger value="today">Today</TabsTrigger>
                <TabsTrigger value="past">Past</TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value={activeTab} className="mt-0">
              {isLoadingAllSessions || isLoadingUpcoming ? (
                <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                  Loading sessions...
                </div>
              ) : getActiveTabSessions().length === 0 ? (
                <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                  No {activeTab} sessions found.
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {getActiveTabSessions().map((session) => (
                    <div key={session.id} className="p-6">
                      <div className="flex flex-wrap gap-4 sm:gap-6 items-start">
                        <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-primary-100 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400">
                          <CalendarFull className="h-5 w-5" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap justify-between items-start gap-2 mb-2">
                            <div>
                              <h3 className="text-base font-medium">{session.title}</h3>
                              <div className="flex flex-wrap items-center gap-2 mt-1">
                                <Badge className={cn({
                                  "bg-green-500 dark:bg-green-700": session.status === "completed",
                                  "bg-primary-500 dark:bg-primary-700": session.status === "scheduled",
                                  "bg-red-500 dark:bg-red-700": session.status === "cancelled",
                                })}>
                                  {session.status === "completed" ? "Completed" : 
                                    session.status === "scheduled" ? "Scheduled" : "Cancelled"}
                                </Badge>
                                {session.subjectId && (
                                  <Badge variant="outline" className="bg-gray-100 dark:bg-gray-800">
                                    {subjects?.find(s => s.id === session.subjectId)?.name || "Subject"}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              <div className="flex items-center">
                                <Clock className="h-4 w-4 mr-1" />
                                {format(new Date(session.startTime), "MMM d, yyyy")} at {format(new Date(session.startTime), "h:mm a")}
                                {" - "}
                                {format(new Date(session.endTime), "h:mm a")}
                              </div>
                            </div>
                          </div>
                          
                          {session.notes && (
                            <div className="mt-3 bg-gray-50 dark:bg-gray-900 p-3 rounded-md text-sm text-gray-600 dark:text-gray-300">
                              <p className="font-medium text-gray-700 dark:text-gray-200 mb-1">Session Notes:</p>
                              <p>{session.notes}</p>
                            </div>
                          )}
                          
                          <div className="mt-4 flex flex-wrap gap-2">
                            {session.meetLink && (
                              <Button variant="outline" size="sm" asChild>
                                <a href={session.meetLink} target="_blank" rel="noopener noreferrer">
                                  <Video className="h-4 w-4 mr-2" />
                                  Join Meeting
                                </a>
                              </Button>
                            )}
                            
                            {/* For tutors to add session notes after completion */}
                            {isTutor && activeTab === "past" && !session.notes && (
                              <Dialog open={notesDialogOpen} onOpenChange={setNotesDialogOpen}>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => {
                                    setSelectedSession(session);
                                    setNotesDialogOpen(true);
                                  }}
                                >
                                  <FileText className="h-4 w-4 mr-2" />
                                  Add Session Notes
                                </Button>
                                
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Session Notes</DialogTitle>
                                    <DialogDescription>
                                      Add notes about the completed session. Optionally upload a recording for AI summary generation.
                                    </DialogDescription>
                                  </DialogHeader>
                                  
                                  <Form {...notesForm}>
                                    <form onSubmit={notesForm.handleSubmit(onSubmitNotes)} className="space-y-4">
                                      <FormField
                                        control={notesForm.control}
                                        name="notes"
                                        render={({ field }) => (
                                          <FormItem>
                                            <FormLabel>Session Notes</FormLabel>
                                            <FormControl>
                                              <Textarea 
                                                placeholder="What was covered in this session? Any observations or progress notes?" 
                                                className="resize-none min-h-[150px]" 
                                                {...field} 
                                              />
                                            </FormControl>
                                            <FormMessage />
                                          </FormItem>
                                        )}
                                      />
                                      
                                      <div className="space-y-2">
                                        <FormLabel>Session Recording (Optional)</FormLabel>
                                        <Input 
                                          type="file" 
                                          accept="audio/*,video/*" 
                                          onChange={handleFileChange}
                                        />
                                        <FormDescription>
                                          Upload a recording to generate an AI-powered session summary.
                                        </FormDescription>
                                      </div>
                                      
                                      <DialogFooter>
                                        <Button type="button" variant="outline" onClick={() => setNotesDialogOpen(false)}>Cancel</Button>
                                        <Button type="submit" disabled={updateSessionNotes.isPending}>
                                          {updateSessionNotes.isPending ? 
                                            (recordingFile ? "Generating AI Summary..." : "Saving Notes...") : 
                                            (recordingFile ? "Save & Generate AI Summary" : "Save Notes")}
                                        </Button>
                                      </DialogFooter>
                                    </form>
                                  </Form>
                                </DialogContent>
                              </Dialog>
                            )}
                          </div>
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

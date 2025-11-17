import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { SessionsCard } from "@/components/dashboard/SessionsCard";
import { AssignmentsCard } from "@/components/dashboard/AssignmentsCard";
import { ProgressCard } from "@/components/dashboard/ProgressCard";
import { AISummaryCard } from "@/components/dashboard/AISummaryCard";
import { MessagesCard } from "@/components/dashboard/MessagesCard";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { TutoringSession } from "@/types";
import { TutorRequest } from "@shared/schema";
import { Users, Calendar, BookOpen, Clock, CheckCircle, XCircle, User, MessageSquare, FileText, Upload, Share, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useRef } from "react";
import { LearningMaterial, User as UserType } from "@shared/schema";

export default function TutorDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();

  // Fetch upcoming sessions
  const { data: upcomingSessions, isLoading: isLoadingSessions } = useQuery<TutoringSession[]>({
    queryKey: [`/api/sessions/upcoming/tutor/${user?.id}`],
    enabled: !!user?.id,
  });

  // Fetch tutor requests
  const { data: tutorRequests, isLoading: isLoadingRequests } = useQuery<TutorRequest[]>({
    queryKey: [`/api/tutor-requests/tutor/${user?.id}`],
    enabled: !!user?.id,
  });

  // Update tutor request status mutation
  const updateRequestStatus = useMutation({
    mutationFn: async ({ requestId, status }: { requestId: number; status: string }) => {
      return apiRequest("PATCH", `/api/tutor-requests/${requestId}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tutor-requests/tutor/${user?.id}`] });
      toast({
        title: "Request Updated",
        description: "The tutor request has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update request: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleApproveRequest = (requestId: number) => {
    updateRequestStatus.mutate({ requestId, status: "approved" });
  };

  const handleRejectRequest = (requestId: number) => {
    updateRequestStatus.mutate({ requestId, status: "rejected" });
  };

  // Learning Materials state and data fetching
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<LearningMaterial | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch learning materials
  const { data: learningMaterials, isLoading: isLoadingMaterials } = useQuery<LearningMaterial[]>({
    queryKey: [`/api/learning-materials`],
    enabled: !!user?.id,
  });

  // Fetch students for sharing
  const { data: students } = useQuery<UserType[]>({
    queryKey: ["/api/users/students"],
    enabled: !!user?.id && shareDialogOpen,
  });

  // Upload learning material mutation
  const uploadMaterial = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch("/api/learning-materials", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      if (!response.ok) throw new Error("Failed to upload material");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/learning-materials`] });
      setUploadDialogOpen(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      toast({
        title: "Material Uploaded",
        description: "Learning material has been uploaded successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to upload material: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Share material mutation
  const shareMaterial = useMutation({
    mutationFn: async ({ materialId, studentId }: { materialId: number; studentId: string }) => {
      return apiRequest("POST", `/api/learning-materials/${materialId}/share/${studentId}`, {});
    },
    onSuccess: () => {
      setShareDialogOpen(false);
      setSelectedMaterial(null);
      setSelectedStudent("");
      toast({
        title: "Material Shared",
        description: "Learning material has been shared with the student.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to share material: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Delete material mutation
  const deleteMaterial = useMutation({
    mutationFn: async (materialId: number) => {
      return apiRequest("DELETE", `/api/learning-materials/${materialId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/learning-materials`] });
      toast({
        title: "Material Deleted",
        description: "Learning material has been deleted successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete material: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleUploadMaterial = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    uploadMaterial.mutate(formData);
  };

  const handleShareMaterial = () => {
    if (selectedMaterial && selectedStudent) {
      shareMaterial.mutate({ materialId: selectedMaterial.id, studentId: selectedStudent });
    }
  };

  // Sample data for other components (would be fetched from API in a real app)
  const assignments = [
    { id: 1, title: "Weekly Math Problems (Set 3)", status: "completed" as const, timeAgo: "2 hours ago", studentName: "Alex Thompson", action: "Review" },
    { id: 2, title: "English Essay: Character Analysis", status: "in_progress" as const, timeAgo: "Yesterday", studentName: "Emma Davis", action: "Review" },
    { id: 3, title: "Science Lab Report", status: "overdue" as const, timeAgo: "3 days ago", studentName: "Nathan Wilson", action: "Remind" },
    { id: 4, title: "History Timeline Project", status: "new" as const, timeAgo: "Just now", action: "Edit" },
  ];

  const progressData = [
    { id: "1", name: "Alex Thompson", profileImageUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=120&h=120", subject: "Algebra II", week: 6, totalWeeks: 8, completionPercentage: 85 },
    { id: "2", name: "Emma Davis", profileImageUrl: "https://images.unsplash.com/photo-1580489944761-15a19d654956?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=120&h=120", subject: "World History", week: 5, totalWeeks: 8, completionPercentage: 62 },
    { id: "3", name: "Nathan Wilson", profileImageUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=120&h=120", subject: "Biology", week: 3, totalWeeks: 8, completionPercentage: 34 },
  ];

  const aiSummary = {
    id: 1,
    title: "Algebra II with Alex Thompson",
    date: "May 15, 2023",
    content: "Reviewed quadratic functions and equations. Alex demonstrated strong understanding of the standard form but needs additional practice with vertex form conversions.",
    keyConcepts: ["Standard form of quadratic equations", "Vertex form and conversions", "Completing the square"],
    homeworkAssigned: "Practice problems 3-15 (odd) from Chapter 4. Create one real-world example of a quadratic function.",
    engagementLevel: 4, // 1-5 scale
  };

  const messages = [
    { id: 1, senderName: "Jennifer Thompson", senderRole: "Alex's Mom", senderAvatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=120&h=120", content: "Thank you for the progress report. I'd like to discuss Alex's upcoming science project. Could we schedule a quick call?", timestamp: "Yesterday at 4:23 PM" },
    { id: 2, senderName: "Robert Davis", senderRole: "Emma's Dad", senderAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=120&h=120", content: "Emma mentioned she's having trouble with the history timeline project. Could you provide some additional resources?", timestamp: "Monday at 10:05 AM" },
  ];

  const handleCreateNewAssignment = () => {
    // Navigate to assignment creation page or open a modal
    toast({
      title: "Create Assignment",
      description: "Assignment creation would open here",
    });
  };

  const handleEditSummary = () => {
    toast({
      title: "Edit Summary",
      description: "Summary editing would open here",
    });
  };

  const handleShareSummary = () => {
    toast({
      title: "Share with Parent",
      description: "Summary has been shared with parent",
    });
  };

  return (
    <DashboardLayout 
      title="Tutor Dashboard" 
      subtitle={`Welcome back, ${user?.firstName || 'Tutor'}! Here's what's happening with your students today.`}
    >
      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <StatsCard 
          title="Active Students" 
          value="3" 
          icon={Users} 
          colorClass="bg-primary-100 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400"
        />
        <StatsCard 
          title="Sessions Today" 
          value="2" 
          icon={Calendar} 
          colorClass="bg-secondary-100 text-secondary-600 dark:bg-secondary-900/20 dark:text-secondary-400"
        />
        <StatsCard 
          title="Pending Assignments" 
          value="5" 
          icon={BookOpen} 
          colorClass="bg-accent-100 text-accent-600 dark:bg-accent-900/20 dark:text-accent-400"
        />
        <StatsCard 
          title="Overdue Tasks" 
          value="2" 
          icon={Clock} 
          colorClass="bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400"
        />
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2/3 width on large screens) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Today's Sessions */}
          <SessionsCard 
            title="Today's Sessions"
            sessions={upcomingSessions || []}
            loading={isLoadingSessions}
            emptyMessage="No sessions scheduled for today. Would you like to schedule a new session?"
          />

          {/* Tutor Requests */}
          <Card>
            <CardHeader className="px-6 py-4 border-b">
              <CardTitle className="text-lg font-semibold">Parent Requests</CardTitle>
            </CardHeader>
            <CardContent className="p-0 divide-y divide-gray-100 dark:divide-gray-800">
              {isLoadingRequests ? (
                <div className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                  Loading requests...
                </div>
              ) : tutorRequests?.filter(r => r.status === 'pending').length === 0 ? (
                <div className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                  No pending requests at the moment.
                </div>
              ) : (
                <>
                  {(tutorRequests || []).filter(r => r.status === 'pending').map((request) => (
                    <div key={request.id} className="px-6 py-4" data-testid={`tutor-request-${request.id}`}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <User className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                            <h4 className="text-sm font-medium" data-testid={`text-parent-name-${request.id}`}>
                              Tutoring Request from Parent
                            </h4>
                            <Badge variant="outline" className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400" data-testid={`status-${request.status}-${request.id}`}>
                              Pending
                            </Badge>
                          </div>
                          {request.message && (
                            <div className="flex items-start gap-2 mt-2">
                              <MessageSquare className="h-4 w-4 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" />
                              <p className="text-sm text-gray-600 dark:text-gray-400" data-testid={`text-message-${request.id}`}>
                                {request.message}
                              </p>
                            </div>
                          )}
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Button 
                              size="sm" 
                              onClick={() => handleApproveRequest(request.id)}
                              disabled={updateRequestStatus.isPending}
                              data-testid={`button-approve-${request.id}`}
                              className="bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800"
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => handleRejectRequest(request.id)}
                              disabled={updateRequestStatus.isPending}
                              data-testid={`button-reject-${request.id}`}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </CardContent>
          </Card>

          {/* Recent Assignment Activity */}
          <AssignmentsCard 
            title="Recent Assignment Activity"
            assignments={assignments}
            onCreateNew={handleCreateNewAssignment}
          />

          {/* Learning Materials */}
          <Card>
            <CardHeader className="px-6 py-4 border-b flex justify-between items-center">
              <CardTitle className="text-lg font-semibold">Learning Materials</CardTitle>
              <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" data-testid="button-upload-material">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Material
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Upload Learning Material</DialogTitle>
                    <DialogDescription>
                      Upload a document or resource to share with your students.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleUploadMaterial}>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="title">Title</Label>
                        <Input
                          id="title"
                          name="title"
                          placeholder="e.g., Math Practice Worksheet"
                          required
                          data-testid="input-material-title"
                        />
                      </div>
                      <div>
                        <Label htmlFor="description">Description (Optional)</Label>
                        <Input
                          id="description"
                          name="description"
                          placeholder="Brief description of the material"
                          data-testid="input-material-description"
                        />
                      </div>
                      <div>
                        <Label htmlFor="file">File</Label>
                        <Input
                          id="file"
                          name="file"
                          type="file"
                          ref={fileInputRef}
                          required
                          data-testid="input-material-file"
                        />
                      </div>
                    </div>
                    <DialogFooter className="mt-4">
                      <Button type="button" variant="outline" onClick={() => setUploadDialogOpen(false)} data-testid="button-cancel-upload">
                        Cancel
                      </Button>
                      <Button type="submit" disabled={uploadMaterial.isPending} data-testid="button-submit-upload">
                        {uploadMaterial.isPending ? "Uploading..." : "Upload"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent className="p-0 divide-y divide-gray-100 dark:divide-gray-800">
              {isLoadingMaterials ? (
                <div className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                  Loading materials...
                </div>
              ) : !learningMaterials || learningMaterials.length === 0 ? (
                <div className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                  No learning materials yet. Upload your first material to get started!
                </div>
              ) : (
                <>
                  {learningMaterials.map((material) => (
                    <div key={material.id} className="px-6 py-4" data-testid={`material-${material.id}`}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <FileText className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                            <h4 className="text-sm font-medium" data-testid={`text-material-title-${material.id}`}>
                              {material.title}
                            </h4>
                          </div>
                          {material.description && (
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1" data-testid={`text-material-description-${material.id}`}>
                              {material.description}
                            </p>
                          )}
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedMaterial(material);
                                setShareDialogOpen(true);
                              }}
                              data-testid={`button-share-${material.id}`}
                            >
                              <Share className="h-4 w-4 mr-1" />
                              Share
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => deleteMaterial.mutate(material.id)}
                              disabled={deleteMaterial.isPending}
                              data-testid={`button-delete-${material.id}`}
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Delete
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </CardContent>
          </Card>

          {/* Share Material Dialog */}
          <Dialog open={shareDialogOpen} onOpenChange={(open) => {
            setShareDialogOpen(open);
            if (!open) {
              // Reset state when dialog closes
              setSelectedMaterial(null);
              setSelectedStudent("");
            }
          }}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Share Learning Material</DialogTitle>
                <DialogDescription>
                  Select a student to share "{selectedMaterial?.title}" with.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="student">Student</Label>
                  <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                    <SelectTrigger id="student" data-testid="select-share-student">
                      <SelectValue placeholder="Select a student" />
                    </SelectTrigger>
                    <SelectContent>
                      {students?.map((student) => (
                        <SelectItem key={student.id} value={student.id} data-testid={`select-share-student-${student.id}`}>
                          {student.firstName} {student.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => {
                  setShareDialogOpen(false);
                }} data-testid="button-cancel-share">
                  Cancel
                </Button>
                <Button
                  onClick={handleShareMaterial}
                  disabled={!selectedStudent || shareMaterial.isPending}
                  data-testid="button-submit-share"
                >
                  {shareMaterial.isPending ? "Sharing..." : "Share"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Right Column (1/3 width on large screens) */}
        <div className="space-y-6">
          {/* Student Progress */}
          <ProgressCard students={progressData} />

          {/* Recent AI Session Summaries */}
          <AISummaryCard 
            summary={aiSummary}
            onEdit={handleEditSummary}
            onShare={handleShareSummary}
          />

          {/* Messages */}
          <MessagesCard messages={messages} />
        </div>
      </div>
    </DashboardLayout>
  );
}

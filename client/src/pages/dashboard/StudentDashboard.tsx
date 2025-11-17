import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { SessionsCard } from "@/components/dashboard/SessionsCard";
import { AssignmentsCard } from "@/components/dashboard/AssignmentsCard";
import { ProgressCard } from "@/components/dashboard/ProgressCard";
import { AISummaryCard } from "@/components/dashboard/AISummaryCard";
import { MessagesCard } from "@/components/dashboard/MessagesCard";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { TutoringSession, StudentAssignment, StudentProgress, Subject } from "@/types";
import { BookOpen, Calendar, Clock, Award, FileText, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { LearningMaterial } from "@shared/schema";
import { Button } from "@/components/ui/button";

export default function StudentDashboard() {
  const { user } = useAuth();

  // Fetch upcoming sessions
  const { data: upcomingSessions, isLoading: isLoadingSessions } = useQuery<TutoringSession[]>({
    queryKey: [`/api/sessions/upcoming/student/${user?.id}`],
    enabled: !!user?.id,
  });

  // Fetch assignments
  const { data: assignments, isLoading: isLoadingAssignments } = useQuery<StudentAssignment[]>({
    queryKey: [`/api/assignments/student/${user?.id}`],
    enabled: !!user?.id,
  });

  // Fetch progress
  const { data: progress, isLoading: isLoadingProgress } = useQuery<StudentProgress[]>({
    queryKey: [`/api/progress/student/${user?.id}`],
    enabled: !!user?.id,
  });

  // Fetch subjects
  const { data: subjects, isLoading: isLoadingSubjects } = useQuery<Subject[]>({
    queryKey: [`/api/subjects`],
    enabled: !!user?.id,
  });

  // Fetch learning materials shared with student
  const { data: learningMaterials, isLoading: isLoadingMaterials } = useQuery<LearningMaterial[]>({
    queryKey: [`/api/learning-materials/student/${user?.id}`],
    enabled: !!user?.id,
  });

  // Sample data for other components (would be fetched from API in a real app)
  const formattedAssignments = [
    { id: 1, title: "Weekly Math Problems (Set 3)", status: "completed" as const, timeAgo: "Yesterday", action: "View" },
    { id: 2, title: "English Essay: Character Analysis", status: "in_progress" as const, timeAgo: "3 days ago", action: "Continue" },
    { id: 3, title: "Science Lab Report", status: "overdue" as const, timeAgo: "1 week ago", action: "Start" },
    { id: 4, title: "History Timeline Project", status: "new" as const, timeAgo: "Just now", action: "Start" },
  ];

  const progressData = [
    { id: "1", name: user?.firstName || "Student", profileImageUrl: user?.profileImageUrl || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=120&h=120", subject: "Algebra II", week: 6, totalWeeks: 8, completionPercentage: 85 },
    { id: "2", name: user?.firstName || "Student", profileImageUrl: user?.profileImageUrl || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=120&h=120", subject: "World History", week: 5, totalWeeks: 8, completionPercentage: 62 },
    { id: "3", name: user?.firstName || "Student", profileImageUrl: user?.profileImageUrl || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=120&h=120", subject: "Biology", week: 3, totalWeeks: 8, completionPercentage: 34 },
  ];

  const aiSummary = {
    id: 1,
    title: "Algebra II with Ms. Johnson",
    date: "2 days ago",
    content: "We reviewed quadratic functions and equations, focusing on standard form and vertex form conversions. You showed good understanding of the concepts but need more practice with applying them to word problems.",
    keyConcepts: ["Standard form of quadratic equations", "Vertex form and conversions", "Completing the square"],
    homeworkAssigned: "Practice problems 3-15 (odd) from Chapter 4. Create one real-world example of a quadratic function.",
    engagementLevel: 4, // 1-5 scale
  };

  const messages = [
    { id: 1, senderName: "Sarah Johnson", senderRole: "Math Tutor", senderAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=120&h=120", content: "Don't forget about our session tomorrow at 3 PM. We'll be covering linear inequalities.", timestamp: "Today at 10:15 AM" },
    { id: 2, senderName: "Daniel Wilson", senderRole: "Science Tutor", senderAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=120&h=120", content: "I've reviewed your lab report draft. It's looking good but needs more detail in the methodology section.", timestamp: "Yesterday at 4:30 PM" },
  ];

  const completedTasks = 15;
  const totalTasks = 20;

  return (
    <DashboardLayout 
      title="Student Dashboard" 
      subtitle={`Welcome back, ${user?.firstName || 'Student'}! Here's your learning journey at a glance.`}
    >
      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <StatsCard 
          title="Assignments Completed" 
          value={`${completedTasks}/${totalTasks}`} 
          icon={BookOpen} 
          colorClass="bg-primary-100 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400"
        />
        <StatsCard 
          title="Upcoming Sessions" 
          value={upcomingSessions?.length || "..."} 
          icon={Calendar} 
          colorClass="bg-secondary-100 text-secondary-600 dark:bg-secondary-900/20 dark:text-secondary-400"
        />
        <StatsCard 
          title="Overdue Tasks" 
          value="1" 
          icon={Clock} 
          colorClass="bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400"
        />
        <StatsCard 
          title="Achievement Points" 
          value="850" 
          icon={Award} 
          colorClass="bg-accent-100 text-accent-600 dark:bg-accent-900/20 dark:text-accent-400"
        />
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2/3 width on large screens) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Overall Progress */}
          <Card>
            <CardHeader className="px-6 py-4 border-b">
              <CardTitle className="text-lg font-semibold">My Learning Progress</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="flex flex-col space-y-2 mb-4">
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">Overall Completion</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">75%</span>
                </div>
                <Progress value={75} className="h-2" />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <h3 className="text-sm font-medium mb-2">Subjects</h3>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="bg-primary-50 dark:bg-primary-900/10 text-primary-600 dark:text-primary-400 border-primary-200 dark:border-primary-800">Math</Badge>
                    <Badge variant="outline" className="bg-secondary-50 dark:bg-secondary-900/10 text-secondary-600 dark:text-secondary-400 border-secondary-200 dark:border-secondary-800">Science</Badge>
                    <Badge variant="outline" className="bg-accent-50 dark:bg-accent-900/10 text-accent-600 dark:text-accent-400 border-accent-200 dark:border-accent-800">History</Badge>
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <h3 className="text-sm font-medium mb-2">Streak</h3>
                  <div className="flex items-center">
                    <span className="text-2xl font-bold mr-2">7</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">days in a row</span>
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <h3 className="text-sm font-medium mb-2">Next Goal</h3>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    Complete 5 more math assignments to unlock the advanced algebra badge
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Sessions */}
          <SessionsCard 
            title="Upcoming Sessions"
            sessions={upcomingSessions || []}
            loading={isLoadingSessions}
            emptyMessage="No upcoming sessions scheduled."
          />

          {/* Assignments */}
          <AssignmentsCard 
            title="My Assignments"
            assignments={formattedAssignments}
            viewAllLink="/assignments"
          />

          {/* Learning Materials */}
          <Card>
            <CardHeader className="px-6 py-4 border-b">
              <CardTitle className="text-lg font-semibold">Learning Materials</CardTitle>
            </CardHeader>
            <CardContent className="p-0 divide-y divide-gray-100 dark:divide-gray-800">
              {isLoadingMaterials ? (
                <div className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                  Loading materials...
                </div>
              ) : !learningMaterials || learningMaterials.length === 0 ? (
                <div className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                  No learning materials shared with you yet.
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
                          {material.fileUrl && (
                            <div className="mt-3">
                              <a 
                                href={material.fileUrl} 
                                download
                                data-testid={`button-download-${material.id}`}
                              >
                                <Button
                                  size="sm"
                                  variant="outline"
                                >
                                  <Download className="h-4 w-4 mr-1" />
                                  Download
                                </Button>
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column (1/3 width on large screens) */}
        <div className="space-y-6">
          {/* Subject Progress */}
          <ProgressCard students={progressData} />

          {/* Recent Session Summaries */}
          <AISummaryCard 
            summary={aiSummary}
          />

          {/* Messages */}
          <MessagesCard messages={messages} />
        </div>
      </div>
    </DashboardLayout>
  );
}

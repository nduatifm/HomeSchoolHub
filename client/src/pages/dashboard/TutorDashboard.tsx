import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { SessionsCard } from "@/components/dashboard/SessionsCard";
import { AssignmentsCard } from "@/components/dashboard/AssignmentsCard";
import { ProgressCard } from "@/components/dashboard/ProgressCard";
import { AISummaryCard } from "@/components/dashboard/AISummaryCard";
import { MessagesCard } from "@/components/dashboard/MessagesCard";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { TutoringSession } from "@/types";
import { Users, Calendar, BookOpen, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function TutorDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();

  // Fetch upcoming sessions
  const { data: upcomingSessions, isLoading: isLoadingSessions } = useQuery<TutoringSession[]>({
    queryKey: [`/api/sessions/upcoming/tutor/${user?.id}`],
    enabled: !!user?.id,
  });

  // Sample data for other components (would be fetched from API in a real app)
  const assignments = [
    { id: 1, title: "Weekly Math Problems (Set 3)", status: "completed", timeAgo: "2 hours ago", studentName: "Alex Thompson", action: "Review" },
    { id: 2, title: "English Essay: Character Analysis", status: "in_progress", timeAgo: "Yesterday", studentName: "Emma Davis", action: "Review" },
    { id: 3, title: "Science Lab Report", status: "overdue", timeAgo: "3 days ago", studentName: "Nathan Wilson", action: "Remind" },
    { id: 4, title: "History Timeline Project", status: "new", timeAgo: "Just now", action: "Edit" },
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
      variant: "success",
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

          {/* Recent Assignment Activity */}
          <AssignmentsCard 
            title="Recent Assignment Activity"
            assignments={assignments}
            onCreateNew={handleCreateNewAssignment}
          />
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

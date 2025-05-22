import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { SessionsCard } from "@/components/dashboard/SessionsCard";
import { AssignmentsCard } from "@/components/dashboard/AssignmentsCard";
import { ProgressCard } from "@/components/dashboard/ProgressCard";
import { AISummaryCard } from "@/components/dashboard/AISummaryCard";
import { MessagesCard } from "@/components/dashboard/MessagesCard";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { TutoringSession, User } from "@/types";
import { UserCircle2, BookOpen, Calendar, BarChart2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function ParentDashboard() {
  const { user } = useAuth();

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

  // Sample data for other components (would be fetched from API in a real app)
  const assignments = [
    { id: 1, title: "Weekly Math Problems (Set 3)", status: "completed", timeAgo: "Yesterday", studentName: "Alex", action: "View" },
    { id: 2, title: "English Essay: Character Analysis", status: "in_progress", timeAgo: "3 days ago", studentName: "Alex", action: "View" },
    { id: 3, title: "Science Lab Report", status: "overdue", timeAgo: "1 week ago", studentName: "Alex", action: "Remind" },
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

import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { StudentProgress, Subject, User } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { BarChart, BarChart2, TrendingUp, Award, BookOpen } from "lucide-react";
import { 
  BarChart as ReBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer 
} from 'recharts';

export default function ProgressTracker() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  const isStudent = user?.role === "student";
  const isTutor = user?.role === "tutor";
  const isParent = user?.role === "parent";

  // Fetch student progress data
  const { data: progressData, isLoading: isLoadingProgress } = useQuery<StudentProgress[]>({
    queryKey: [`/api/progress/student/${selectedStudentId || user?.id}`],
    enabled: !!user?.id,
  });

  // Fetch subjects
  const { data: subjects, isLoading: isLoadingSubjects } = useQuery<Subject[]>({
    queryKey: ["/api/subjects"],
  });

  // Fetch students (for tutors and parents)
  const { data: students, isLoading: isLoadingStudents } = useQuery<User[]>({
    queryKey: isTutor 
      ? [`/api/students/tutor/${user?.id}`] 
      : isParent
        ? [`/api/students/parent/${user?.id}`]
        : ["/api/no-students"],
    enabled: !isStudent && !!user?.id,
  });

  // Sample chart data (would be derived from real progress data in a complete implementation)
  const weeklyProgressData = [
    { name: 'Week 1', Math: 85, Science: 75, History: 90 },
    { name: 'Week 2', Math: 70, Science: 82, History: 85 },
    { name: 'Week 3', Math: 90, Science: 88, History: 92 },
    { name: 'Week 4', Math: 95, Science: 90, History: 88 },
  ];

  const subjectProgressData = progressData?.map(progress => {
    const subject = subjects?.find(s => s.id === progress.subjectId);
    return {
      id: progress.id,
      subjectId: progress.subjectId,
      subjectName: subject?.name || `Subject ${progress.subjectId}`,
      week: progress.week,
      totalWeeks: progress.totalWeeks,
      completionPercentage: progress.completionPercentage,
    };
  }) || [];

  const assignmentCompletionData = [
    { name: 'Math', Completed: 15, Total: 20 },
    { name: 'Science', Completed: 12, Total: 15 },
    { name: 'History', Completed: 10, Total: 12 },
  ];

  // Calculate overall progress
  const overallProgress = subjectProgressData.length > 0
    ? Math.round(subjectProgressData.reduce((sum, item) => sum + item.completionPercentage, 0) / subjectProgressData.length)
    : 0;

  // Handle student selection (for tutors and parents)
  const handleStudentChange = (studentId: string) => {
    setSelectedStudentId(studentId);
  };

  return (
    <DashboardLayout 
      title="Progress Tracker" 
      subtitle="Monitor academic progress and track achievement milestones."
    >
      {/* Student Selection for Tutors and Parents */}
      {!isStudent && students && students.length > 0 && (
        <Card className="mb-6">
          <CardContent className="p-6">
            <h3 className="text-base font-medium mb-4">Select Student</h3>
            <div className="flex flex-wrap gap-2">
              {students.map((student) => (
                <Badge 
                  key={student.id}
                  variant={selectedStudentId === student.id ? "default" : "outline"}
                  className="cursor-pointer px-4 py-2 text-sm"
                  onClick={() => handleStudentChange(student.id)}
                >
                  {student.firstName} {student.lastName}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Progress Overview */}
      <Card className="mb-6">
        <CardHeader className="px-6 py-4 border-b">
          <CardTitle className="text-lg font-semibold">Progress Overview</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 flex items-center">
              <div className="p-3 rounded-full bg-primary-100 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400 mr-4">
                <BarChart2 className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-gray-500 dark:text-gray-400 text-sm font-medium">Overall Progress</h2>
                <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{overallProgress}%</p>
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 flex items-center">
              <div className="p-3 rounded-full bg-secondary-100 text-secondary-600 dark:bg-secondary-900/20 dark:text-secondary-400 mr-4">
                <BookOpen className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-gray-500 dark:text-gray-400 text-sm font-medium">Subjects</h2>
                <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{subjectProgressData.length}</p>
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 flex items-center">
              <div className="p-3 rounded-full bg-accent-100 text-accent-600 dark:bg-accent-900/20 dark:text-accent-400 mr-4">
                <TrendingUp className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-gray-500 dark:text-gray-400 text-sm font-medium">Current Streak</h2>
                <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">7 days</p>
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 flex items-center">
              <div className="p-3 rounded-full bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400 mr-4">
                <Award className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-gray-500 dark:text-gray-400 text-sm font-medium">Achievements</h2>
                <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">12</p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-lg font-medium">Subject Breakdown</h3>
            
            {isLoadingProgress || isLoadingSubjects ? (
              <div className="text-center text-gray-500 dark:text-gray-400 py-4">
                Loading progress data...
              </div>
            ) : subjectProgressData.length === 0 ? (
              <div className="text-center text-gray-500 dark:text-gray-400 py-4">
                No progress data available.
              </div>
            ) : (
              <div className="space-y-6">
                {subjectProgressData.map((item) => (
                  <div key={item.id} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{item.subjectName}</span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        Week {item.week} of {item.totalWeeks} • {item.completionPercentage}% complete
                      </span>
                    </div>
                    <Progress value={item.completionPercentage} className="h-2" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Detailed Progress Charts */}
      <Card>
        <CardHeader className="px-6 py-4 border-b">
          <CardTitle className="text-lg font-semibold">Detailed Progress</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="px-6 py-3 border-b">
              <TabsList className="grid grid-cols-3 w-full sm:w-auto">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="weekly">Weekly Progress</TabsTrigger>
                <TabsTrigger value="assignments">Assignments</TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="overview" className="p-6">
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <ReBarChart
                    data={subjectProgressData}
                    margin={{
                      top: 20,
                      right: 30,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="subjectName" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="completionPercentage" name="Completion %" fill="#6366f1" />
                  </ReBarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-6">
                <h3 className="text-base font-medium mb-4">Achievement Badges</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 text-center">
                  {['Math Master', 'Science Expert', 'History Buff', 'Perfect Attendance', 'Fast Learner'].map((badge, index) => (
                    <div key={index} className="flex flex-col items-center">
                      <div className="w-16 h-16 rounded-full bg-primary-100 dark:bg-primary-900/20 flex items-center justify-center mb-2">
                        <Award className="h-8 w-8 text-primary-600 dark:text-primary-400" />
                      </div>
                      <span className="text-sm font-medium">{badge}</span>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="weekly" className="p-6">
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <ReBarChart
                    data={weeklyProgressData}
                    margin={{
                      top: 20,
                      right: 30,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Math" fill="#6366f1" />
                    <Bar dataKey="Science" fill="#10b981" />
                    <Bar dataKey="History" fill="#f59e0b" />
                  </ReBarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-6">
                <h3 className="text-base font-medium mb-4">Weekly Highlights</h3>
                <div className="space-y-4">
                  <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                    <div className="font-medium mb-1">Week 4</div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Excellent progress in Mathematics with 95% performance. Completed all tasks ahead of schedule.
                    </p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                    <div className="font-medium mb-1">Week 3</div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Consistent improvement across all subjects. History performance jumped from 85% to 92%.
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="assignments" className="p-6">
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <ReBarChart
                    data={assignmentCompletionData}
                    margin={{
                      top: 20,
                      right: 30,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Completed" fill="#10b981" />
                    <Bar dataKey="Total" fill="#d1d5db" />
                  </ReBarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-6">
                <h3 className="text-base font-medium mb-4">Assignment Completion</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Subject</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Completed</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Completion Rate</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                      {assignmentCompletionData.map((item, index) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{item.name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{item.Completed}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{item.Total}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {Math.round((item.Completed / item.Total) * 100)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface StudentProgressItem {
  id: string;
  name: string;
  profileImageUrl: string;
  subject: string;
  week: number;
  totalWeeks: number;
  completionPercentage: number;
}

interface ProgressCardProps {
  students: StudentProgressItem[];
  loading?: boolean;
  error?: boolean;
}

export function ProgressCard({
  students,
  loading = false,
  error = false,
}: ProgressCardProps) {
  return (
    <Card>
      <CardHeader className="px-6 py-4 border-b">
        <CardTitle className="text-lg font-semibold">Student Progress</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {loading ? (
          <div className="text-center text-sm text-gray-500 dark:text-gray-400">
            Loading progress data...
          </div>
        ) : error ? (
          <div className="text-center text-sm text-red-500 dark:text-red-400">
            Failed to load progress data. Please try again.
          </div>
        ) : students.length === 0 ? (
          <div className="text-center text-sm text-gray-500 dark:text-gray-400">
            No student progress data available.
          </div>
        ) : (
          <>
            {students.map((student) => (
              <div key={student.id} className="mb-6 last:mb-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <img 
                      src={student.profileImageUrl} 
                      alt={student.name} 
                      className="w-6 h-6 rounded-full object-cover mr-2"
                    />
                    <span className="text-sm font-medium">{student.name}</span>
                  </div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">{student.completionPercentage}% complete</span>
                </div>
                <Progress 
                  value={student.completionPercentage} 
                  className="h-2 bg-gray-200 dark:bg-gray-700"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {student.subject}: Week {student.week}/{student.totalWeeks}
                </p>
              </div>
            ))}
          </>
        )}
      </CardContent>
    </Card>
  );
}

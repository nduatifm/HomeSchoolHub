import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Link } from "wouter";

interface AISummaryCardProps {
  summary?: {
    id: number;
    title: string;
    date: string;
    content: string;
    keyConcepts: string[];
    homeworkAssigned: string;
    engagementLevel: number;
  };
  loading?: boolean;
  error?: boolean;
  onEdit?: () => void;
  onShare?: () => void;
}

export function AISummaryCard({
  summary,
  loading = false,
  error = false,
  onEdit,
  onShare,
}: AISummaryCardProps) {
  return (
    <Card>
      <CardHeader className="px-6 py-4 border-b flex justify-between items-center">
        <CardTitle className="text-lg font-semibold">AI Session Summaries</CardTitle>
        <Link href="/sessions/summaries">
          <a className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium">
            View All
          </a>
        </Link>
      </CardHeader>
      <CardContent className="p-0 divide-y divide-gray-100 dark:divide-gray-800">
        {loading ? (
          <div className="p-6 text-center text-sm text-gray-500 dark:text-gray-400">
            Loading summary...
          </div>
        ) : error ? (
          <div className="p-6 text-center text-sm text-red-500 dark:text-red-400">
            Failed to load session summary. Please try again.
          </div>
        ) : !summary ? (
          <div className="p-6 text-center text-sm text-gray-500 dark:text-gray-400">
            No session summaries available. Generate a summary after your next session!
          </div>
        ) : (
          <div className="p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium">{summary.title}</h3>
              <span className="text-xs text-gray-500 dark:text-gray-400">{summary.date}</span>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 text-sm">
              <p className="font-medium text-gray-800 dark:text-gray-200 mb-2">Session Summary</p>
              <p className="text-gray-600 dark:text-gray-400 text-xs mb-3">{summary.content}</p>
              
              <p className="font-medium text-gray-800 dark:text-gray-200 mb-2">Key Concepts</p>
              <ul className="list-disc text-xs text-gray-600 dark:text-gray-400 pl-5 mb-3">
                {summary.keyConcepts.map((concept, index) => (
                  <li key={index}>{concept}</li>
                ))}
              </ul>
              
              <p className="font-medium text-gray-800 dark:text-gray-200 mb-2">Homework Assigned</p>
              <p className="text-gray-600 dark:text-gray-400 text-xs mb-3">{summary.homeworkAssigned}</p>
              
              <p className="font-medium text-gray-800 dark:text-gray-200 mb-2">Engagement Level</p>
              <div className="flex items-center">
                <Progress 
                  value={summary.engagementLevel * 20} 
                  className="w-full h-2 bg-gray-200 dark:bg-gray-700"
                />
                <span className="text-xs text-gray-600 dark:text-gray-400 ml-2">
                  {summary.engagementLevel >= 4 ? 'High' : summary.engagementLevel >= 2 ? 'Medium' : 'Low'}
                </span>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <Button 
                variant="outline" 
                size="sm"
                className="text-xs"
                onClick={onEdit}
              >
                Edit Summary
              </Button>
              <Button 
                variant="default" 
                size="sm"
                className="text-xs ml-2"
                onClick={onShare}
              >
                Share with Parent
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

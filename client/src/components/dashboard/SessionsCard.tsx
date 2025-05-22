import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock } from "lucide-react";
import { Link } from "wouter";
import { TutoringSession } from "@/types";
import { formatDate } from "@/lib/utils";

interface SessionsCardProps {
  title: string;
  sessions: TutoringSession[];
  loading?: boolean;
  error?: boolean;
  emptyMessage?: string;
  viewAllLink?: string;
}

export function SessionsCard({
  title,
  sessions,
  loading = false,
  error = false,
  emptyMessage = "No sessions scheduled",
  viewAllLink = "/sessions"
}: SessionsCardProps) {
  return (
    <Card>
      <CardHeader className="px-6 py-4 border-b flex justify-between items-center">
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
        <Link href={viewAllLink}>
          <a className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium">
            View All
          </a>
        </Link>
      </CardHeader>
      <CardContent className="p-0 divide-y divide-gray-100 dark:divide-gray-800">
        {loading ? (
          <div className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
            Loading sessions...
          </div>
        ) : error ? (
          <div className="px-6 py-4 text-center text-sm text-red-500 dark:text-red-400">
            Failed to load sessions. Please try again.
          </div>
        ) : sessions.length === 0 ? (
          <div className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
            {emptyMessage}
          </div>
        ) : (
          <>
            {sessions.map((session) => (
              <div key={session.id} className="px-6 py-4 flex items-center">
                <div className="mr-4 flex-shrink-0">
                  <img 
                    src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=120&h=120" 
                    alt="Student" 
                    className="h-10 w-10 rounded-full object-cover"
                  />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-medium">{session.title}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    <span className="flex items-center mt-1">
                      <Clock className="h-4 w-4 mr-1 text-gray-400 dark:text-gray-500" />
                      {formatDate(new Date(session.startTime))} - {formatDate(new Date(session.endTime), true)}
                    </span>
                  </p>
                </div>
                <div className="ml-4 flex-shrink-0 flex space-x-2">
                  <Button size="sm" variant="default">Start</Button>
                  <Button size="sm" variant="outline">Reschedule</Button>
                </div>
              </div>
            ))}
            
            <div className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
              That's all for now! <Link href="/sessions/new"><a className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium">Schedule more sessions</a></Link>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

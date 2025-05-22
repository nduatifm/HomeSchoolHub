import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, AlertTriangle, Edit } from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

interface Assignment {
  id: number;
  title: string;
  status: 'completed' | 'in_progress' | 'new' | 'overdue';
  timeAgo: string;
  studentName?: string;
  action?: string;
}

interface AssignmentsCardProps {
  title: string;
  assignments: Assignment[];
  loading?: boolean;
  error?: boolean;
  emptyMessage?: string;
  onCreateNew?: () => void;
  viewAllLink?: string;
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'completed':
      return <CheckCircle className="h-4 w-4" />;
    case 'in_progress':
      return <Clock className="h-4 w-4" />;
    case 'overdue':
      return <AlertTriangle className="h-4 w-4" />;
    case 'new':
      return <Edit className="h-4 w-4" />;
    default:
      return <CheckCircle className="h-4 w-4" />;
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case 'completed':
      return "bg-secondary-100 text-secondary-600 dark:bg-secondary-900/20 dark:text-secondary-400";
    case 'in_progress':
      return "bg-accent-100 text-accent-600 dark:bg-accent-900/20 dark:text-accent-400";
    case 'overdue':
      return "bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400";
    case 'new':
      return "bg-primary-100 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400";
    default:
      return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'completed':
      return <Badge className="bg-secondary-500 dark:bg-secondary-700">Completed</Badge>;
    case 'in_progress':
      return <Badge className="bg-accent-500 dark:bg-accent-700">In Progress</Badge>;
    case 'overdue':
      return <Badge className="bg-red-500 dark:bg-red-700">Overdue</Badge>;
    case 'new':
      return <Badge className="bg-primary-500 dark:bg-primary-700">New</Badge>;
    default:
      return <Badge>Unknown</Badge>;
  }
}

export function AssignmentsCard({
  title,
  assignments,
  loading = false,
  error = false,
  emptyMessage = "No assignments found",
  onCreateNew,
  viewAllLink = "/assignments"
}: AssignmentsCardProps) {
  return (
    <Card>
      <CardHeader className="px-6 py-4 border-b flex justify-between items-center">
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
        <Button 
          variant="link" 
          className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium p-0"
          onClick={onCreateNew}
        >
          Create New
        </Button>
      </CardHeader>
      <CardContent className="p-0 divide-y divide-gray-100 dark:divide-gray-800">
        {loading ? (
          <div className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
            Loading assignments...
          </div>
        ) : error ? (
          <div className="px-6 py-4 text-center text-sm text-red-500 dark:text-red-400">
            Failed to load assignments. Please try again.
          </div>
        ) : assignments.length === 0 ? (
          <div className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
            {emptyMessage}
          </div>
        ) : (
          <>
            {assignments.map((assignment) => (
              <div key={assignment.id} className="px-6 py-4 flex items-center">
                <div className={cn("mr-4 flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full", getStatusColor(assignment.status))}>
                  {getStatusIcon(assignment.status)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium flex items-center gap-2">
                      {assignment.title}
                      <span className="text-xs ml-2">{getStatusBadge(assignment.status)}</span>
                    </h3>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{assignment.timeAgo}</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {assignment.studentName 
                      ? `${assignment.studentName} ${assignment.status === 'completed' ? 'completed' : 'is working on'} this assignment` 
                      : `You created this new assignment`}
                  </p>
                </div>
                <div className="ml-4 flex-shrink-0">
                  <Button variant="link" className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium p-0">
                    {assignment.action || "Review"}
                  </Button>
                </div>
              </div>
            ))}
            
            <div className="px-6 py-4 text-center">
              <Link href={viewAllLink}>
                <a className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium">
                  View all assignments
                </a>
              </Link>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

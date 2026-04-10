import type { ClassroomAssignment, ClassroomSubmission } from "@shared/schema";

export type UrgencyLabel = "overdue" | "due-today" | "due-soon" | "new" | null;

export type ClassroomNotification = {
  classroomId: number;
  newCount: number;
  dueCount: number;
  dueSoonCount: number;
  total: number;
};

export type NotificationSummary = ClassroomNotification | null;

export function classifyAssignment(
  assignment: ClassroomAssignment,
  submissions: ClassroomSubmission[],
  classroomStatus: string,
): UrgencyLabel {
  if (classroomStatus === "archived") return null;

  const sub = submissions.find((s) => s.assignmentId === assignment.id);
  if (sub && sub.status !== "pending") return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (assignment.dueDate) {
    const due = new Date(assignment.dueDate);
    if (!isNaN(due.getTime())) {
      due.setHours(0, 0, 0, 0);
      const diffDays = Math.round((due.getTime() - today.getTime()) / 86400000);
      if (diffDays < 0) return "overdue";
      if (diffDays === 0) return "due-today";
      if (diffDays <= 3) return "due-soon";
    }
  }

  if (assignment.createdAt) {
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);
    const created = new Date(assignment.createdAt);
    if (created >= sevenDaysAgo) return "new";
  }

  return null;
}

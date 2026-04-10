import type { ClassroomAssignment, ClassroomSubmission } from "@shared/schema";

export type UrgencyLabel = "overdue" | "due-today" | "due-soon" | null;

export type NotificationSummary = {
  overdueCount: number;
  urgentCount: number;
  worstLabel: UrgencyLabel;
} | null;

export function classifyAssignment(
  assignment: ClassroomAssignment,
  submissions: ClassroomSubmission[],
  classroomStatus: string,
): UrgencyLabel {
  if (classroomStatus === "archived") return null;

  const sub = submissions.find((s) => s.assignmentId === assignment.id);
  if (sub && sub.status !== "pending") return null;

  if (!assignment.dueDate) return null;
  const due = new Date(assignment.dueDate);
  if (isNaN(due.getTime())) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);

  const diffDays = Math.round((due.getTime() - today.getTime()) / 86400000);

  if (diffDays < 0) return "overdue";
  if (diffDays === 0) return "due-today";
  if (diffDays <= 3) return "due-soon";
  return null;
}

export function buildNotifMap(
  classrooms: { id: number; status: string }[],
  assignmentsByIndex: (ClassroomAssignment[] | undefined)[],
  submissionsByIndex: (ClassroomSubmission[] | undefined)[],
): Record<number, NotificationSummary> {
  return Object.fromEntries(
    classrooms.map((c, i) => {
      if (c.status === "archived") {
        return [c.id, { overdueCount: 0, urgentCount: 0, worstLabel: null }];
      }
      const assignments: ClassroomAssignment[] = assignmentsByIndex[i] ?? [];
      const submissions: ClassroomSubmission[] = submissionsByIndex[i] ?? [];

      let overdueCount = 0;
      let urgentCount = 0;
      let worstLabel: UrgencyLabel = null;

      for (const a of assignments) {
        const label = classifyAssignment(a, submissions, c.status);
        if (label === "overdue") {
          overdueCount++;
          worstLabel = "overdue";
        } else if (label === "due-today" || label === "due-soon") {
          urgentCount++;
          if (worstLabel !== "overdue") worstLabel = label;
        }
      }
      return [c.id, { overdueCount, urgentCount, worstLabel }];
    }),
  );
}

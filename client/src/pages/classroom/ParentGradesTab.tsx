import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { BarChart2 } from "lucide-react";
import type { ClassroomAssignment, ClassroomSubmission } from "@shared/schema";
import StatusBadge from "./StatusBadge";

export default function ParentGradesTab({ classroomId, studentId, seenAssignmentIds, onAssignmentSeen }: {
  classroomId: number; studentId: number;
  seenAssignmentIds?: Set<number>; onAssignmentSeen?: (assignmentId: number) => void;
}) {
  const { data: assignments = [] } = useQuery<ClassroomAssignment[]>({
    queryKey: ["/api/classrooms", classroomId, "assignments"],
    queryFn: () => apiRequest(`/api/classrooms/${classroomId}/assignments`),
  });
  const { data: submissions = [] } = useQuery<ClassroomSubmission[]>({
    queryKey: ["/api/classrooms", classroomId, "my-submissions", studentId],
    queryFn: () => apiRequest(`/api/classrooms/${classroomId}/my-submissions?studentId=${studentId}`),
    enabled: classroomId > 0 && studentId > 0,
  });

  const subMap = Object.fromEntries(submissions.map((s) => [s.assignmentId, s]));
  const totalPoints = assignments.reduce((s, a) => s + a.points, 0);
  const earned = submissions.reduce((s, sub) => s + (sub.grade ?? 0), 0);

  if (assignments.length === 0) {
    return <div className="text-center py-12 text-muted-foreground text-sm rounded-2xl border border-dashed border-border">No assignments yet.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-green-50 border border-green-200 px-4 py-3 flex items-center gap-3">
        <BarChart2 className="h-4 w-4 text-green-600 shrink-0" />
        <span className="text-sm font-medium text-green-800">
          Total: {earned} / {totalPoints} pts ({totalPoints > 0 ? Math.round((earned / totalPoints) * 100) : 0}%)
        </span>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-border">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/40 border-b border-border">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Assignment</th>
              <th className="text-left px-3 py-3 text-xs font-semibold text-muted-foreground uppercase">Due</th>
              <th className="text-center px-3 py-3 text-xs font-semibold text-muted-foreground uppercase">Status</th>
              <th className="text-center px-3 py-3 text-xs font-semibold text-muted-foreground uppercase">Grade</th>
              <th className="text-left px-3 py-3 text-xs font-semibold text-muted-foreground uppercase">Feedback</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {assignments.map((a) => {
              const sub = subMap[a.id];
              const isUnseen = seenAssignmentIds && !seenAssignmentIds.has(a.id);
              return (
                <tr
                  key={a.id}
                  onClick={() => { if (isUnseen && onAssignmentSeen) onAssignmentSeen(a.id); }}
                  className={`transition-colors ${isUnseen ? "bg-primary/5 hover:bg-primary/10 cursor-pointer" : "hover:bg-muted/20"}`}
                >
                  <td className="px-4 py-3 font-medium text-foreground">
                    <div className="flex items-center gap-1.5">
                      {isUnseen && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
                      {a.title}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-muted-foreground">{a.dueDate}</td>
                  <td className="px-3 py-3 text-center"><StatusBadge status={sub?.status ?? "pending"} /></td>
                  <td className="px-3 py-3 text-center">
                    {sub?.grade !== null && sub?.grade !== undefined
                      ? <span className="font-semibold text-green-700">{sub.grade}/{a.points}</span>
                      : <span className="text-muted-foreground/40">—</span>}
                  </td>
                  <td className="px-3 py-3 text-xs text-muted-foreground italic">{sub?.feedback ?? "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

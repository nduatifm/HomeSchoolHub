import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { BarChart2 } from "lucide-react";
import type { ClassroomAssignment, ClassroomSubmission } from "@shared/schema";
import StatusBadge from "./StatusBadge";

export default function StudentGradesTab({
  classroomId,
  classroomSlug,
}: {
  classroomId: number;
  classroomSlug: string | number;
}) {
  const [, navigate] = useLocation();

  const { data: assignments = [] } = useQuery<ClassroomAssignment[]>({
    queryKey: ["/api/classrooms", classroomId, "assignments"],
    queryFn: () => apiRequest(`/api/classrooms/${classroomId}/assignments`),
  });
  const { data: submissions = [] } = useQuery<ClassroomSubmission[]>({
    queryKey: ["/api/classrooms", classroomId, "my-submissions"],
    queryFn: () => apiRequest(`/api/classrooms/${classroomId}/my-submissions`),
  });

  const subMap = Object.fromEntries(submissions.map((s) => [s.assignmentId, s]));
  const totalPoints = assignments.reduce((s, a) => s + a.points, 0);
  const earnedPoints = submissions.reduce((s, sub) => s + (sub.grade ?? 0), 0);
  const pct = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;

  if (assignments.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm rounded-2xl border border-dashed border-border">
        No assignments yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-green-50 border border-green-200 px-4 py-3 flex items-center gap-3">
        <BarChart2 className="h-4 w-4 text-green-600 shrink-0" />
        <span className="text-sm font-medium text-green-800">
          Your total: {earnedPoints} / {totalPoints} pts ({pct}%)
        </span>
        <div className="flex-1 ml-2 h-2 rounded-full bg-green-200 overflow-hidden">
          <div
            className="h-full rounded-full bg-green-500 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/40 border-b border-border">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Assignment / Test</th>
              <th className="text-left px-3 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Due</th>
              <th className="text-center px-3 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
              <th className="text-center px-3 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Grade</th>
              <th className="text-left px-3 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Feedback</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {assignments.map((a) => {
              const sub = subMap[a.id];
              const isGraded = sub?.grade !== null && sub?.grade !== undefined;
              return (
                <tr
                  key={a.id}
                  onClick={() => navigate(`/classrooms/${classroomSlug}/classwork/${a.slug ?? a.id}`)}
                  className="hover:bg-muted/20 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-foreground">
                    <div className="flex flex-col gap-0.5">
                      <span>{a.title}</span>
                      {a.assignmentType === "test"
                        ? <span className="text-[10px] font-medium px-1.5 py-0 rounded-full bg-orange-100 text-orange-700 self-start">Test</span>
                        : <span className="text-[10px] font-medium px-1.5 py-0 rounded-full bg-blue-100 text-blue-700 self-start">Assignment</span>
                      }
                    </div>
                  </td>
                  <td className="px-3 py-3 text-muted-foreground whitespace-nowrap">{a.dueDate}</td>
                  <td className="px-3 py-3 text-center">
                    <StatusBadge status={sub?.status ?? "pending"} />
                  </td>
                  <td className="px-3 py-3 text-center">
                    {isGraded ? (
                      <span className="font-semibold text-green-700">
                        {sub.grade}/{a.points}
                      </span>
                    ) : (
                      <span className="text-muted-foreground/40">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-xs text-muted-foreground italic max-w-[200px] truncate">
                    {sub?.feedback ?? "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

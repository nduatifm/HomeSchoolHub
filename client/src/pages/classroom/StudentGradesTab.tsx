import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import type { ClassroomAssignment, ClassroomSubmission } from "@shared/schema";
import StatusBadge from "./StatusBadge";
import GradeBreakdownPanel from "./GradeBreakdownPanel";

const TYPE_BADGE: Record<string, string> = {
  assignment: "bg-blue-100 text-blue-700",
  test: "bg-orange-100 text-orange-700",
  quiz: "bg-purple-100 text-purple-700",
  project: "bg-teal-100 text-teal-700",
};
const TYPE_LABEL: Record<string, string> = {
  assignment: "Assignment",
  test: "Test",
  quiz: "Quiz",
  project: "Project",
};

export default function StudentGradesTab({
  classroomId,
  classroomSlug,
  studentId,
}: {
  classroomId: number;
  classroomSlug: string | number;
  studentId: number;
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

  if (assignments.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm rounded-2xl border border-dashed border-border">
        No assignments yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {studentId > 0 && (
        <GradeBreakdownPanel classroomId={classroomId} studentId={studentId} />
      )}

      <div className="overflow-x-auto rounded-2xl border border-border">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/40 border-b border-border">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Assignment</th>
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
                      <span className={`text-[10px] font-medium px-1.5 py-0 rounded-full self-start ${TYPE_BADGE[a.assignmentType] ?? TYPE_BADGE.assignment}`}>
                        {TYPE_LABEL[a.assignmentType] ?? a.assignmentType}
                      </span>
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

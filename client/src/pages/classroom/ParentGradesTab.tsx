import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { ClassroomAssignment, ClassroomSubmission, GradingPolicy } from "@shared/schema";
import StatusBadge from "./StatusBadge";
import GradeBreakdownPanel from "./GradeBreakdownPanel";
import { Scale } from "lucide-react";

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

const POLICY_TYPES = [
  { key: "assignmentWeight" as const, label: "Assignments", dot: "bg-blue-500", badge: "bg-blue-100 text-blue-700" },
  { key: "testWeight" as const, label: "Tests", dot: "bg-orange-500", badge: "bg-orange-100 text-orange-700" },
  { key: "quizWeight" as const, label: "Quizzes", dot: "bg-purple-500", badge: "bg-purple-100 text-purple-700" },
  { key: "projectWeight" as const, label: "Projects", dot: "bg-teal-500", badge: "bg-teal-100 text-teal-700" },
];

function GradingPolicyCard({ policy }: { policy: GradingPolicy }) {
  const active = POLICY_TYPES.filter((t) => policy[t.key] > 0);
  return (
    <div className="rounded-2xl border border-border bg-card px-4 py-3 space-y-2">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-md bg-violet-100 flex items-center justify-center shrink-0">
          <Scale className="h-3.5 w-3.5 text-violet-600" />
        </div>
        <span className="text-sm font-semibold text-foreground">Grading Policy</span>
      </div>
      {active.length === 0 ? (
        <p className="text-xs text-muted-foreground">No grading policy set.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {active.map((t) => (
            <div key={t.key} className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full shrink-0 ${t.dot}`} />
              <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${t.badge}`}>
                {t.label} · {policy[t.key]}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

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
  const { data: policy } = useQuery<GradingPolicy | null>({
    queryKey: ["/api/classrooms", classroomId, "grading-policy"],
    queryFn: () => apiRequest(`/api/classrooms/${classroomId}/grading-policy`),
    enabled: classroomId > 0,
  });

  const subMap = Object.fromEntries(submissions.map((s) => [s.assignmentId, s]));

  if (assignments.length === 0) {
    return (
      <div className="space-y-4">
        {policy && <GradingPolicyCard policy={policy} />}
        <div className="text-center py-12 text-muted-foreground text-sm rounded-2xl border border-dashed border-border">No assignments yet.</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {studentId > 0 && (
        <GradeBreakdownPanel classroomId={classroomId} studentId={studentId} />
      )}

      {policy && <GradingPolicyCard policy={policy} />}

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
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-1.5">
                        {isUnseen && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
                        {a.title}
                      </div>
                      <span className={`text-[10px] font-medium px-1.5 py-0 rounded-full self-start ${TYPE_BADGE[a.assignmentType] ?? TYPE_BADGE.assignment}`}>
                        {TYPE_LABEL[a.assignmentType] ?? a.assignmentType}
                      </span>
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

import { useState } from "react";
import { useQuery, useQueries } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { ChevronDown } from "lucide-react";
import type { ClassroomAssignment, GradingPolicy } from "@shared/schema";
import type { SubmissionWithName, EnrollmentWithStudent } from "./types";
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

function computeWeightedPct(
  assignments: ClassroomAssignment[],
  subs: Record<number, SubmissionWithName>,
  policy: GradingPolicy | null | undefined
): number | null {
  const types = ["assignment", "test", "quiz", "project"] as const;
  const weights = policy
    ? { assignment: policy.assignmentWeight, test: policy.testWeight, quiz: policy.quizWeight, project: policy.projectWeight }
    : { assignment: 25, test: 25, quiz: 25, project: 25 };
  const groups = types.map((type) => {
    const typeAssigns = assignments.filter((a) => a.assignmentType === type);
    const graded = typeAssigns.filter((a) => subs[a.id]?.grade != null);
    if (graded.length === 0) return { w: weights[type], avg: null as number | null };
    const earned = graded.reduce((s, a) => s + (subs[a.id].grade ?? 0), 0);
    const possible = graded.reduce((s, a) => s + a.points, 0);
    return { w: weights[type], avg: possible > 0 ? (earned / possible) * 100 : 0 };
  });
  const gradedGroups = groups.filter((g) => g.avg !== null);
  if (gradedGroups.length === 0) return null;
  const tw = gradedGroups.reduce((s, g) => s + g.w, 0);
  if (tw === 0) return null;
  return Math.round(gradedGroups.reduce((s, g) => s + (g.avg! * g.w) / tw, 0));
}

export default function TeacherGradesTab({ classroomId }: { classroomId: number }) {
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);

  const { data: assignments = [] } = useQuery<ClassroomAssignment[]>({
    queryKey: ["/api/classrooms", classroomId, "assignments"],
    queryFn: () => apiRequest(`/api/classrooms/${classroomId}/assignments`),
  });
  const { data: enrollments = [] } = useQuery<EnrollmentWithStudent[]>({
    queryKey: ["/api/classrooms", classroomId, "enrollments"],
    queryFn: () => apiRequest(`/api/classrooms/${classroomId}/enrollments`),
  });
  const { data: policy } = useQuery<GradingPolicy | null>({
    queryKey: ["/api/classrooms", classroomId, "grading-policy"],
    queryFn: () => apiRequest(`/api/classrooms/${classroomId}/grading-policy`),
    enabled: classroomId > 0,
  });
  const allSubsResults = useQueries({
    queries: assignments.map((a) => ({
      queryKey: ["/api/classrooms", classroomId, "assignments", a.id, "submissions"],
      queryFn: () => apiRequest(`/api/classrooms/${classroomId}/assignments/${a.id}/submissions`) as Promise<SubmissionWithName[]>,
      enabled: assignments.length > 0,
    })),
  });

  const submissionMap: Record<number, Record<number, SubmissionWithName>> = {};
  allSubsResults.forEach((q, i) => {
    (q.data ?? []).forEach((sub) => {
      if (!submissionMap[sub.studentId]) submissionMap[sub.studentId] = {};
      submissionMap[sub.studentId][assignments[i].id] = sub;
    });
  });

  if (assignments.length === 0 || enrollments.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm rounded-2xl border border-dashed border-border">
        Add assignments and students to see the grade book.
      </div>
    );
  }

  const totalPossible = assignments.reduce((s, a) => s + a.points, 0);
  const selectedEnrollment = enrollments.find((e) => e.studentId === selectedStudentId);

  return (
    <div className="space-y-3">
      {/* Grading policy summary */}
      {policy && (
        <div className="rounded-xl border border-border bg-muted/30 px-4 py-2.5 flex flex-wrap gap-x-4 gap-y-1 items-center text-xs">
          <span className="font-semibold text-foreground text-xs uppercase tracking-wider">Grading Policy</span>
          {[
            { label: "Assignments", w: policy.assignmentWeight, cls: "text-blue-700" },
            { label: "Tests", w: policy.testWeight, cls: "text-orange-700" },
            { label: "Quizzes", w: policy.quizWeight, cls: "text-purple-700" },
            { label: "Projects", w: policy.projectWeight, cls: "text-teal-700" },
          ].map((t) => (
            <span key={t.label} className={`font-medium ${t.cls}`}>{t.label}: {t.w}%</span>
          ))}
        </div>
      )}

      {/* Grade book table — click a row to view that student's full weighted breakdown */}
      <div className="overflow-x-auto rounded-2xl border border-border">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/40 border-b border-border">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider sticky left-0 bg-muted/40 min-w-[140px]">Student</th>
              {assignments.map((a) => (
                <th key={a.id} className="px-3 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider min-w-[100px]">
                  <div className="truncate max-w-[100px]" title={a.title}>{a.title}</div>
                  <div className="flex items-center justify-center gap-1 mt-0.5">
                    <span className={`text-[9px] font-medium px-1 rounded-full ${TYPE_BADGE[a.assignmentType] ?? TYPE_BADGE.assignment}`}>
                      {TYPE_LABEL[a.assignmentType] ?? a.assignmentType}
                    </span>
                    <span className="text-muted-foreground/60 font-normal">{a.points} pts</span>
                  </div>
                </th>
              ))}
              <th className="px-3 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider min-w-[100px]">
                {policy ? "Weighted %" : "Total"}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {enrollments.map((e) => {
              const subs = submissionMap[e.studentId] ?? {};
              const earned = assignments.reduce((s, a) => s + (subs[a.id]?.grade ?? 0), 0);
              const hasAnyGrade = assignments.some((a) => subs[a.id]?.grade != null);
              const weightedPct = computeWeightedPct(assignments, subs, policy);
              const isSelected = selectedStudentId === e.studentId;
              return (
                <tr
                  key={e.studentId}
                  className={`hover:bg-muted/20 cursor-pointer transition-colors ${isSelected ? "bg-muted/30" : ""}`}
                  onClick={() => setSelectedStudentId(isSelected ? null : e.studentId)}
                  title="Click to view detailed grade breakdown"
                >
                  <td className={`px-4 py-3 font-medium text-foreground sticky left-0 ${isSelected ? "bg-muted/30" : "bg-card"}`}>
                    <div className="flex items-center gap-1.5">
                      {e.student.name}
                      <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${isSelected ? "rotate-180" : ""}`} />
                    </div>
                  </td>
                  {assignments.map((a) => {
                    const sub = subs[a.id];
                    return (
                      <td key={a.id} className="px-3 py-3 text-center">
                        {sub?.grade !== null && sub?.grade !== undefined
                          ? <span className="font-medium text-green-700">{sub.grade}</span>
                          : <span className="text-muted-foreground/40">—</span>}
                      </td>
                    );
                  })}
                  <td className="px-3 py-3 text-center">
                    {hasAnyGrade ? (
                      <>
                        <div className="font-semibold text-foreground">
                          {weightedPct !== null ? `${weightedPct}%` : "—"}
                        </div>
                        <div className="text-xs text-muted-foreground tabular-nums">{earned}/{totalPossible} pts</div>
                      </>
                    ) : (
                      <span className="text-muted-foreground/40 text-sm">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Selected student's full weighted breakdown panel */}
      {selectedStudentId !== null && selectedEnrollment && (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-0.5">
            {selectedEnrollment.student.name} — Grade Breakdown
          </p>
          <GradeBreakdownPanel classroomId={classroomId} studentId={selectedStudentId} />
        </div>
      )}
    </div>
  );
}

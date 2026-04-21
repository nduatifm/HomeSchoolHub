import { useQuery, useQueries } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { ClassroomAssignment } from "@shared/schema";
import type { SubmissionWithName, EnrollmentWithStudent } from "./types";

export default function TeacherGradesTab({ classroomId }: { classroomId: number }) {
  const { data: assignments = [] } = useQuery<ClassroomAssignment[]>({
    queryKey: ["/api/classrooms", classroomId, "assignments"],
    queryFn: () => apiRequest(`/api/classrooms/${classroomId}/assignments`),
  });
  const { data: enrollments = [] } = useQuery<EnrollmentWithStudent[]>({
    queryKey: ["/api/classrooms", classroomId, "enrollments"],
    queryFn: () => apiRequest(`/api/classrooms/${classroomId}/enrollments`),
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
    return <div className="text-center py-12 text-muted-foreground text-sm rounded-2xl border border-dashed border-border">Add assignments and students to see the grade book.</div>;
  }

  const totalPossible = assignments.reduce((s, a) => s + a.points, 0);

  return (
    <div className="overflow-x-auto rounded-2xl border border-border">
      <table className="min-w-full text-sm">
        <thead className="bg-muted/40 border-b border-border">
          <tr>
            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider sticky left-0 bg-muted/40 min-w-[140px]">Student</th>
            {assignments.map((a) => (
              <th key={a.id} className="px-3 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider min-w-[100px]">
                <div className="truncate max-w-[100px]" title={a.title}>{a.title}</div>
                <div className="flex items-center justify-center gap-1 mt-0.5">
                  {a.assignmentType === "test"
                    ? <span className="text-[9px] font-medium px-1 rounded-full bg-orange-100 text-orange-700">Test</span>
                    : <span className="text-[9px] font-medium px-1 rounded-full bg-blue-100 text-blue-700">Assignment</span>
                  }
                  <span className="text-muted-foreground/60 font-normal">{a.points} pts</span>
                </div>
              </th>
            ))}
            <th className="px-3 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider min-w-[90px]">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {enrollments.map((e) => {
            const subs = submissionMap[e.studentId] ?? {};
            const earned = assignments.reduce((s, a) => s + (subs[a.id]?.grade ?? 0), 0);
            const pct = totalPossible > 0 ? Math.round((earned / totalPossible) * 100) : 0;
            return (
              <tr key={e.studentId} className="hover:bg-muted/20">
                <td className="px-4 py-3 font-medium text-foreground sticky left-0 bg-card">{e.student.name}</td>
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
                  <div className="font-semibold text-foreground">{earned}/{totalPossible}</div>
                  <div className="text-xs text-muted-foreground">{pct}%</div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

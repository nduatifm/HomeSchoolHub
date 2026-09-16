import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import type { ClassroomAssignment, ClassroomGradingCategory, ClassroomSubmission, GradingPolicy } from "@shared/schema";
import StatusBadge from "./StatusBadge";
import GradeBreakdownPanel from "./GradeBreakdownPanel";
import { Scale } from "lucide-react";

const CATEGORY_COLORS = [
  { dot: "bg-blue-500", badge: "bg-blue-100 text-blue-700" },
  { dot: "bg-orange-500", badge: "bg-orange-100 text-orange-700" },
  { dot: "bg-purple-500", badge: "bg-purple-100 text-purple-700" },
  { dot: "bg-teal-500", badge: "bg-teal-100 text-teal-700" },
  { dot: "bg-pink-500", badge: "bg-pink-100 text-pink-700" },
  { dot: "bg-indigo-500", badge: "bg-indigo-100 text-indigo-700" },
];

function GradingPolicyCard({ policy, categories }: { policy: GradingPolicy; categories: ClassroomGradingCategory[] }) {
  const active = (categories.length ? categories : (policy.categories ?? [])).filter((category) => category.active && category.weight > 0);
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
          {active.map((category, index) => (
            <div key={category.id} className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full shrink-0 ${CATEGORY_COLORS[index % CATEGORY_COLORS.length].dot}`} />
              <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${CATEGORY_COLORS[index % CATEGORY_COLORS.length].badge}`}>
                {category.name} · {category.weight}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

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
  const { data: policy } = useQuery<GradingPolicy | null>({
    queryKey: ["/api/classrooms", classroomId, "grading-policy"],
    queryFn: () => apiRequest(`/api/classrooms/${classroomId}/grading-policy`),
    enabled: classroomId > 0,
  });
  const { data: categories = [] } = useQuery<ClassroomGradingCategory[]>({
    queryKey: ["/api/classrooms", classroomId, "grading-categories"],
    queryFn: () => apiRequest(`/api/classrooms/${classroomId}/grading-categories`),
    enabled: classroomId > 0,
  });

  const subMap = Object.fromEntries(submissions.map((s) => [s.assignmentId, s]));

  if (assignments.length === 0) {
    return (
      <div className="space-y-4">
        {policy && <GradingPolicyCard policy={policy} categories={categories} />}
        <div className="text-center py-12 text-muted-foreground text-sm rounded-2xl border border-dashed border-border">
          No assignments yet.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {studentId > 0 && (
        <GradeBreakdownPanel classroomId={classroomId} studentId={studentId} />
      )}

      {policy && <GradingPolicyCard policy={policy} categories={categories} />}

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
                      <span className={`text-[10px] font-medium px-1.5 py-0 rounded-full self-start ${(() => { const c = categories.find((x) => x.id === a.categoryId) ?? categories.find((x) => x.key === a.assignmentType); return CATEGORY_COLORS[(c?.displayOrder ?? 0) % CATEGORY_COLORS.length].badge; })()}`}>
                        {categories.find((x) => x.id === a.categoryId)?.name ?? categories.find((x) => x.key === a.assignmentType)?.name ?? a.assignmentType}
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

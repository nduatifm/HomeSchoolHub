import { useLocation } from "wouter";
import { useQuery, useQueries } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { BarChart2, Loader2, FileText, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ModernSidebar from "@/components/ModernSidebar";
import StatusBadge from "./classroom/StatusBadge";
import type { Classroom, ClassroomAssignment, ClassroomSubmission, ProgressReport } from "@shared/schema";

type ReportWithMeta = ProgressReport & { studentName?: string; teacherName?: string };

export default function StudentGradesPage() {
  const [, navigate] = useLocation();

  const { data: classrooms = [], isLoading: classroomsLoading } = useQuery<Classroom[]>({
    queryKey: ["/api/classrooms"],
  });

  const { data: myReports = [] } = useQuery<ReportWithMeta[]>({
    queryKey: ["/api/progress-reports/me"],
    queryFn: () => apiRequest("/api/progress-reports/me"),
  });

  const classroomAssignmentQueries = useQueries({
    queries: classrooms.map((c) => ({
      queryKey: ["/api/classrooms", c.id, "assignments"],
      queryFn: () => apiRequest(`/api/classrooms/${c.id}/assignments`),
      enabled: classrooms.length > 0,
    })),
  });

  const classroomSubmissionQueries = useQueries({
    queries: classrooms.map((c) => ({
      queryKey: ["/api/classrooms", c.id, "my-submissions"],
      queryFn: () => apiRequest(`/api/classrooms/${c.id}/my-submissions`),
      enabled: classrooms.length > 0,
    })),
  });

  const gradeRows = classrooms.flatMap((c, i) => {
    const cwAssignments: ClassroomAssignment[] =
      (classroomAssignmentQueries[i]?.data as ClassroomAssignment[]) ?? [];
    const cwSubmissions: ClassroomSubmission[] =
      (classroomSubmissionQueries[i]?.data as ClassroomSubmission[]) ?? [];
    const subMap = Object.fromEntries(cwSubmissions.map((s) => [s.assignmentId, s]));
    return cwAssignments.map((a) => ({ a, sub: subMap[a.id], classroom: c }));
  });

  const totalPoints = gradeRows.reduce((s, { a }) => s + a.points, 0);
  const earnedPoints = gradeRows.reduce((s, { sub }) => s + (sub?.grade ?? 0), 0);
  const overallPct = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
  const isGradesLoading =
    classroomAssignmentQueries.some((q) => q.isLoading) ||
    classroomSubmissionQueries.some((q) => q.isLoading);

  const semesterReports = myReports.filter((r) => r.semesterData);

  return (
    <div className="min-h-screen bg-background">
      <ModernSidebar />
      <div className="md:ml-[228px]">
        <main className="p-4 sm:p-5 pt-18 md:pt-5 max-w-4xl mx-auto">
          <h2 className="text-xl font-semibold text-foreground mb-5 flex items-center gap-2">
            <BarChart2 className="h-5 w-5 text-primary" /> My Grades
          </h2>

          {isGradesLoading || classroomsLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : classrooms.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm rounded-2xl border border-dashed border-border">
              You're not enrolled in any classrooms yet.
            </div>
          ) : (
            <div className="space-y-5">
              {totalPoints > 0 && (
                <div className="rounded-2xl bg-green-50 border border-green-200 px-4 py-3 flex items-center gap-3">
                  <BarChart2 className="h-4 w-4 text-green-600 shrink-0" />
                  <span className="text-sm font-medium text-green-800">
                    Overall: {earnedPoints} / {totalPoints} pts ({overallPct}%)
                  </span>
                  <div className="flex-1 ml-2 h-2 rounded-full bg-green-200 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-green-500 transition-all"
                      style={{ width: `${overallPct}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-6">
                {classrooms.map((c, i) => {
                  const cwAssignments: ClassroomAssignment[] =
                    (classroomAssignmentQueries[i]?.data as ClassroomAssignment[]) ?? [];
                  const cwSubmissions: ClassroomSubmission[] =
                    (classroomSubmissionQueries[i]?.data as ClassroomSubmission[]) ?? [];
                  const subMap = Object.fromEntries(cwSubmissions.map((s) => [s.assignmentId, s]));
                  const classTotal = cwAssignments.reduce((s, a) => s + a.points, 0);
                  const classEarned = cwSubmissions.reduce((s, sub) => s + (sub.grade ?? 0), 0);
                  const classPct =
                    classTotal > 0 ? Math.round((classEarned / classTotal) * 100) : 0;

                  return (
                    <div key={c.id} className="rounded-2xl border border-border overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-b border-border">
                        <button
                          onClick={() => navigate(`/classrooms/${c.slug ?? c.id}/grades`)}
                          className="font-semibold text-sm text-foreground hover:text-primary transition-colors text-left"
                        >
                          {c.name}
                        </button>
                        {classTotal > 0 && (
                          <span className="text-xs font-semibold text-muted-foreground">
                            {classEarned}/{classTotal} pts ({classPct}%)
                          </span>
                        )}
                      </div>
                      {cwAssignments.length === 0 ? (
                        <div className="px-4 py-4 text-sm text-muted-foreground">
                          No assignments yet.
                        </div>
                      ) : (
                        <table className="min-w-full text-sm">
                          <thead className="border-b border-border bg-muted/10">
                            <tr>
                              <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                Assignment / Test
                              </th>
                              <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden sm:table-cell">
                                Due
                              </th>
                              <th className="text-center px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                Status
                              </th>
                              <th className="text-center px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                Grade
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {cwAssignments.map((a) => {
                              const sub = subMap[a.id];
                              const isGraded =
                                sub?.grade !== null && sub?.grade !== undefined;
                              return (
                                <tr
                                  key={a.id}
                                  onClick={() =>
                                    navigate(
                                      `/classrooms/${c.slug ?? c.id}/classwork/${a.slug ?? a.id}`
                                    )
                                  }
                                  className="hover:bg-muted/20 cursor-pointer transition-colors"
                                >
                                  <td className="px-4 py-2.5 font-medium text-foreground">
                                    <div className="flex flex-col gap-0.5">
                                      <span>{a.title}</span>
                                      {a.assignmentType === "test" ? (
                                        <span className="text-[10px] font-medium px-1.5 py-0 rounded-full bg-orange-100 text-orange-700 self-start">
                                          Test
                                        </span>
                                      ) : (
                                        <span className="text-[10px] font-medium px-1.5 py-0 rounded-full bg-blue-100 text-blue-700 self-start">
                                          Assignment
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-3 py-2.5 text-muted-foreground text-xs whitespace-nowrap hidden sm:table-cell">
                                    {a.dueDate}
                                  </td>
                                  <td className="px-3 py-2.5 text-center">
                                    <StatusBadge status={sub?.status ?? "pending"} />
                                  </td>
                                  <td className="px-3 py-2.5 text-center">
                                    {isGraded ? (
                                      <span className="font-semibold text-green-700 text-xs">
                                        {sub.grade}/{a.points}
                                      </span>
                                    ) : (
                                      <span className="text-muted-foreground/40 text-xs">—</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* ── My semester reports ─────────────────────────── */}
              {semesterReports.length > 0 && (
                <div className="space-y-3 pt-2">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                    <FileText className="h-4 w-4 text-primary" /> My Performance Reports
                  </h3>
                  {semesterReports.map((report) => {
                    const sd = report.semesterData as any;
                    return (
                      <div
                        key={report.id}
                        className="rounded-2xl border border-border px-4 py-3 flex items-center justify-between gap-4 hover:border-primary/30 transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-0.5">
                            <span className="font-medium text-sm text-foreground truncate">
                              {report.period}
                            </span>
                            {sd?.overallGpa !== null && sd?.overallGpa !== undefined && (
                              <Badge
                                variant="outline"
                                className={`text-xs font-semibold shrink-0 ${
                                  sd.overallGpa >= 70
                                    ? "text-green-600 border-green-200"
                                    : sd.overallGpa >= 50
                                      ? "text-amber-600 border-amber-200"
                                      : "text-red-600 border-red-200"
                                }`}
                              >
                                {sd.overallGpa}%
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            By {report.teacherName || "Teacher"} ·{" "}
                            {report.date ? new Date(report.date).toLocaleDateString() : ""}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/reports/${report.id}/view`)}
                        >
                          <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                          View
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

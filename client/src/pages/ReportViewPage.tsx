import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Loader2, Printer, ArrowLeft, BookOpen, CheckSquare, Users } from "lucide-react";
import ModernSidebar from "@/components/ModernSidebar";
import type { ProgressReport, SemesterReportData } from "@shared/schema";

type ReportWithMeta = ProgressReport & {
  studentName?: string;
  teacherName?: string;
};

function GradeBar({ value, max = 100 }: { value: number; max?: number }) {
  const pct = Math.min((value / max) * 100, 100);
  const color = value >= 70 ? "bg-green-500" : value >= 50 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="h-2 rounded-full bg-muted overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function GradeLabel({ value }: { value: number | null }) {
  if (value === null) return <span className="text-muted-foreground">—</span>;
  const cls = value >= 70 ? "text-green-600" : value >= 50 ? "text-amber-600" : "text-red-600";
  return <span className={`font-bold ${cls}`}>{value}%</span>;
}

function formatDate(d: string) {
  return new Date(d + "T12:00:00").toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatShortDate(d: string) {
  return new Date(d + "T12:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function ReportViewPage() {
  const [match, params] = useRoute("/reports/:id/view");
  const reportId = params?.id ? parseInt(params.id, 10) : 0;

  const { data: report, isLoading, error } = useQuery<ReportWithMeta>({
    queryKey: ["/api/progress-reports", reportId],
    queryFn: () => apiRequest(`/api/progress-reports/${reportId}`),
    enabled: reportId > 0,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-muted-foreground">Report not found.</p>
          <Button variant="outline" size="sm" onClick={() => window.history.back()}>Go back</Button>
        </div>
      </div>
    );
  }

  const sd = report.semesterData as SemesterReportData | null | undefined;
  const attendanceTotals = sd?.classrooms?.reduce(
    (acc, c) => ({
      present: acc.present + c.attendance.present,
      absent: acc.absent + c.attendance.absent,
      late: acc.late + c.attendance.late,
      total: acc.total + c.attendance.total,
    }),
    { present: 0, absent: 0, late: 0, total: 0 }
  ) ?? null;
  const uniqueAttendance = sd?.classrooms?.[0]?.attendance ?? null;

  return (
    <div className="min-h-screen bg-background print:bg-white">
      <ModernSidebar />

      <div className="md:ml-[228px]">
        {/* Top bar — hidden on print */}
        <div className="print:hidden sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center justify-between gap-3">
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <Button size="sm" variant="outline" onClick={() => window.print()}>
            <Printer className="h-3.5 w-3.5 mr-1.5" /> Print / Save PDF
          </Button>
        </div>

        <main className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6 print:p-8 print:max-w-none">
          {/* Header */}
          <div className="rounded-2xl bg-primary text-primary-foreground px-5 py-5 print:rounded-none print:px-0">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest opacity-75 mb-1">
                  Semester Performance Report
                </p>
                <h1 className="text-xl font-bold">{report.studentName || "Student"}</h1>
                {sd && (
                  <p className="text-sm opacity-80 mt-0.5">
                    {formatShortDate(sd.dateFrom)} – {formatShortDate(sd.dateTo)}
                  </p>
                )}
                {!sd && report.period && (
                  <p className="text-sm opacity-80 mt-0.5">{report.period}</p>
                )}
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs opacity-70">Teacher</p>
                <p className="text-sm font-medium">{report.teacherName || "—"}</p>
                <p className="text-xs opacity-70 mt-1">{report.date ? formatShortDate(report.date) : ""}</p>
              </div>
            </div>
          </div>

          {/* Semester data present */}
          {sd ? (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-2xl border border-border bg-card px-4 py-3 text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Overall Grade
                  </p>
                  <GradeLabel value={sd.overallGpa} />
                </div>
                <div className="rounded-2xl border border-border bg-card px-4 py-3 text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Completion
                  </p>
                  <span className="font-bold text-foreground">{sd.completionRate}%</span>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {sd.completedAssignments}/{sd.totalAssignments}
                  </p>
                </div>
                <div className="rounded-2xl border border-border bg-card px-4 py-3 text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Attendance
                  </p>
                  {uniqueAttendance && uniqueAttendance.total > 0 ? (
                    <>
                      <span className="font-bold text-foreground">
                        {Math.round((uniqueAttendance.present / uniqueAttendance.total) * 100)}%
                      </span>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {uniqueAttendance.present}/{uniqueAttendance.total} sessions
                      </p>
                    </>
                  ) : (
                    <span className="text-muted-foreground font-medium">—</span>
                  )}
                </div>
              </div>

              {/* Per-classroom breakdown */}
              <div>
                <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5">
                  <BookOpen className="h-4 w-4 text-primary" /> Classroom Breakdown
                </h2>
                <div className="space-y-3">
                  {sd.classrooms.map((c) => (
                    <div key={c.id} className="rounded-2xl border border-border bg-card px-4 py-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium text-sm text-foreground truncate">{c.name}</p>
                          {c.subject && (
                            <p className="text-xs text-muted-foreground">{c.subject}</p>
                          )}
                        </div>
                        <GradeLabel value={c.weightedGrade} />
                      </div>
                      {c.weightedGrade !== null && (
                        <GradeBar value={c.weightedGrade} />
                      )}
                      <div className="grid grid-cols-2 gap-x-4 text-xs text-muted-foreground pt-0.5">
                        <span>
                          <CheckSquare className="inline h-3 w-3 mr-0.5 mb-px" />
                          {c.completedAssignments}/{c.totalAssignments} assignments ({c.completionRate}%)
                        </span>
                        {c.attendance.total > 0 && (
                          <span>
                            <Users className="inline h-3 w-3 mr-0.5 mb-px" />
                            {c.attendance.present} present · {c.attendance.absent} absent
                            {c.attendance.late > 0 && ` · ${c.attendance.late} late`}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  {sd.classrooms.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                      No classrooms enrolled during this period.
                    </div>
                  )}
                </div>
              </div>

              {/* Attendance detail */}
              {uniqueAttendance && uniqueAttendance.total > 0 && (
                <div>
                  <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5">
                    <Users className="h-4 w-4 text-primary" /> Attendance Summary
                  </h2>
                  <div className="rounded-2xl border border-border bg-card px-4 py-3 grid grid-cols-3 gap-3 text-center">
                    <div>
                      <p className="text-lg font-bold text-green-600">{uniqueAttendance.present}</p>
                      <p className="text-xs text-muted-foreground">Present</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-red-500">{uniqueAttendance.absent}</p>
                      <p className="text-xs text-muted-foreground">Absent</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-amber-500">{uniqueAttendance.late}</p>
                      <p className="text-xs text-muted-foreground">Late</p>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Legacy report (no semesterData) */
            <div className="rounded-2xl border border-border bg-card px-4 py-3">
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Grades</p>
              {report.grades && Object.keys(report.grades).length > 0 ? (
                <div className="space-y-2">
                  {Object.entries(report.grades as Record<string, number>).map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between gap-3">
                      <span className="text-sm">{k}</span>
                      <span className="font-semibold">{v}%</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No grades recorded.</p>
              )}
            </div>
          )}

          {/* Teacher comments */}
          {report.content && (
            <div>
              <h2 className="text-sm font-semibold text-foreground mb-2">Teacher Comments</h2>
              <div className="rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                {report.content}
              </div>
            </div>
          )}

          {/* Print footer */}
          <div className="hidden print:block pt-6 border-t border-border text-xs text-muted-foreground text-center">
            Generated by Lyra Preparatory · {report.date ? formatDate(report.date) : ""}
          </div>
        </main>
      </div>

      <style>{`
        @media print {
          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
          .print\\:bg-white { background: white !important; }
          .print\\:rounded-none { border-radius: 0 !important; }
          .print\\:px-0 { padding-left: 0 !important; padding-right: 0 !important; }
          .print\\:p-8 { padding: 2rem !important; }
          .print\\:max-w-none { max-width: none !important; }
          [class*="md\\:ml-"] { margin-left: 0 !important; }
          nav, aside { display: none !important; }
        }
      `}</style>
    </div>
  );
}

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

function GradeBar({ value }: { value: number }) {
  const color =
    value >= 70 ? "bg-green-500" : value >= 50 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="h-2 rounded-full bg-gray-200 overflow-hidden print-grade-bar">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(value, 100)}%` }} />
    </div>
  );
}

function GradeLabel({ value }: { value: number | null }) {
  if (value === null) return <span className="text-gray-400 print:text-gray-500">—</span>;
  const cls =
    value >= 70 ? "text-green-700" : value >= 50 ? "text-amber-700" : "text-red-700";
  return <span className={`font-bold ${cls}`}>{value}%</span>;
}

function fmt(d: string, opts?: Intl.DateTimeFormatOptions) {
  return new Date(d + "T12:00:00").toLocaleDateString("en-US", opts ?? {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
function fmtShort(d: string) {
  return fmt(d, { month: "short", day: "numeric", year: "numeric" });
}

export default function ReportViewPage() {
  const [, params] = useRoute("/reports/:id/view");
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
          <Button variant="outline" size="sm" onClick={() => window.history.back()}>
            Go back
          </Button>
        </div>
      </div>
    );
  }

  const sd = report.semesterData as SemesterReportData | null | undefined;
  const att = sd?.attendance ?? null;
  const attPct =
    att && att.total > 0 ? Math.round((att.present / att.total) * 100) : null;

  return (
    <div className="min-h-screen bg-background">
      <ModernSidebar />

      <div className="md:ml-[228px]">
        {/* Top action bar — hidden on print */}
        <div className="print-hidden sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center justify-between gap-3">
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

        <main className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6">
          {/* ── Header banner ── */}
          <div className="report-header rounded-2xl bg-primary text-primary-foreground px-5 py-5">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest opacity-75 mb-1">
                  Semester Performance Report
                </p>
                <h1 className="text-xl font-bold">{report.studentName || "Student"}</h1>
                <p className="text-sm opacity-80 mt-0.5">
                  {sd
                    ? `${fmtShort(sd.dateFrom)} – ${fmtShort(sd.dateTo)}`
                    : report.period}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs opacity-70">Teacher</p>
                <p className="text-sm font-medium">{report.teacherName || "—"}</p>
                <p className="text-xs opacity-70 mt-1">
                  {report.date ? fmtShort(report.date) : ""}
                </p>
              </div>
            </div>
          </div>

          {/* ── Semester data ── */}
          {sd ? (
            <>
              {/* Summary cards — stacked on mobile, 3-col on sm+ */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="report-card rounded-2xl border border-border bg-card px-4 py-3 text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Overall Grade
                  </p>
                  <GradeLabel value={sd.overallGpa} />
                </div>
                <div className="report-card rounded-2xl border border-border bg-card px-4 py-3 text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Completion Rate
                  </p>
                  <span className="font-bold text-foreground">{sd.completionRate}%</span>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {sd.completedAssignments}/{sd.totalAssignments} assignments
                  </p>
                </div>
                <div className="report-card rounded-2xl border border-border bg-card px-4 py-3 text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Attendance
                  </p>
                  {attPct !== null ? (
                    <>
                      <span className="font-bold text-foreground">{attPct}%</span>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {att!.present}/{att!.total} sessions
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
                  <BookOpen className="h-4 w-4 text-primary print-hidden-icon" /> Classroom Breakdown
                </h2>
                <div className="space-y-3">
                  {sd.classrooms.map((c) => (
                    <div
                      key={c.id}
                      className="report-card rounded-2xl border border-border bg-card px-4 py-3 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="min-w-0">
                          <p className="font-medium text-sm text-foreground">{c.name}</p>
                          {c.subject && (
                            <p className="text-xs text-muted-foreground">{c.subject}</p>
                          )}
                        </div>
                        {c.totalAssignments > 0 ? (
                          <GradeLabel value={c.weightedGrade} />
                        ) : (
                          <span className="text-xs text-muted-foreground italic">No data</span>
                        )}
                      </div>

                      {c.weightedGrade !== null && c.totalAssignments > 0 && (
                        <GradeBar value={c.weightedGrade} />
                      )}

                      {c.totalAssignments === 0 ? (
                        <p className="text-xs text-muted-foreground italic">
                          No assignments due in this period.
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          <span>
                            <CheckSquare className="inline h-3 w-3 mr-0.5 mb-px" />
                            {c.completedAssignments}/{c.totalAssignments} completed ({c.completionRate}%)
                          </span>
                          {c.weightedGrade === null && (
                            <span className="text-amber-600">· No grades recorded yet</span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  {sd.classrooms.length === 0 && (
                    <div className="report-card rounded-2xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                      No assignments in the selected period.
                    </div>
                  )}
                </div>
              </div>

              {/* Attendance summary — stacked on mobile, 3-col on sm+ */}
              {att && att.total > 0 && (
                <div>
                  <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5">
                    <Users className="h-4 w-4 text-primary print-hidden-icon" /> Attendance Summary
                    <span className="text-xs font-normal text-muted-foreground ml-1">
                      (across all enrolled classrooms)
                    </span>
                  </h2>
                  <div className="report-card rounded-2xl border border-border bg-card px-4 py-3 grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
                    <div>
                      <p className="text-lg font-bold text-green-700">{att.present}</p>
                      <p className="text-xs text-muted-foreground">Present</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-red-600">{att.absent}</p>
                      <p className="text-xs text-muted-foreground">Absent</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-amber-600">{att.late}</p>
                      <p className="text-xs text-muted-foreground">Late</p>
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1.5 italic">
                    Note: attendance is recorded globally and is not broken down by individual classroom.
                  </p>
                </div>
              )}
            </>
          ) : (
            /* Legacy report */
            <div className="report-card rounded-2xl border border-border bg-card px-4 py-3">
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Grades
              </p>
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
              <div className="report-card rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                {report.content}
              </div>
            </div>
          )}

          {/* Print footer */}
          <div className="print-footer hidden pt-6 border-t border-gray-200 text-xs text-gray-500 text-center">
            Generated by Lyra Preparatory · {report.date ? fmt(report.date) : ""}
          </div>
        </main>
      </div>

      {/* Print styles — comprehensive black-on-white with only banner in color */}
      <style>{`
        @media print {
          /* Remove sidebar, nav, action bar */
          .print-hidden,
          [class*="ModernSidebar"],
          nav, aside, header { display: none !important; }

          /* Reset page */
          body, html { background: white !important; color: black !important; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }

          /* Remove content offset */
          [class*="md:ml-"] { margin-left: 0 !important; }

          /* Full-width content */
          main { max-width: 100% !important; padding: 1.5rem !important; }

          /* Banner — keep color, it's the only branded element */
          .report-header {
            border-radius: 0.5rem !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          /* Cards — white bg, light border */
          .report-card {
            background: white !important;
            border: 1px solid #d1d5db !important;
            border-radius: 0.5rem !important;
            break-inside: avoid;
          }

          /* Grade bars — keep color */
          .print-grade-bar * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }

          /* Grid: always 3-col when printing (landscape can fit it) */
          .sm\\:grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; }
          .sm\\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }

          /* Show print footer */
          .print-footer { display: block !important; }

          /* Avoid page breaks inside cards */
          .space-y-3 > * { break-inside: avoid; }
        }
      `}</style>
    </div>
  );
}

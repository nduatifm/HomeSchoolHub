import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, ExternalLink, BarChart2 } from "lucide-react";
import ModernSidebar from "@/components/ModernSidebar";
import type { ProgressReport } from "@shared/schema";

type ProgressReportEnriched = ProgressReport & { studentName?: string; teacherName?: string };

export default function ParentReportsPage() {
  const [, navigate] = useLocation();
  const { data: progressReports = [] } = useQuery<ProgressReportEnriched[]>({
    queryKey: ["/api/progress-reports/parent"],
  });

  const downloadReport = (report: ProgressReportEnriched) => {
    const dataStr = JSON.stringify(report, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `progress-report-${report.id}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const semesterReports = progressReports.filter((r) => r.semesterData);
  const legacyReports = progressReports.filter((r) => !r.semesterData);

  return (
    <div className="min-h-screen bg-background">
      <ModernSidebar />
      <div className="md:ml-[228px]">
        <main className="p-4 sm:p-5 pt-18 md:pt-5 max-w-4xl mx-auto">
          <h1 className="text-xl font-semibold text-foreground mb-5 flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" /> Progress Reports
          </h1>

          {progressReports.length === 0 ? (
            <div className="text-center py-12 rounded-2xl border border-dashed border-border">
              <FileText className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No progress reports yet. Reports written by teachers will appear here.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Semester performance reports */}
              {semesterReports.length > 0 && (
                <div className="space-y-3">
                  <h2 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                    <BarChart2 className="h-4 w-4 text-primary" /> Semester Performance Reports
                  </h2>
                  {semesterReports.map((report) => {
                    const sd = report.semesterData as any;
                    return (
                      <div
                        key={report.id}
                        className="p-4 border rounded-2xl hover:border-primary/30 transition-colors"
                        data-testid={`card-report-${report.id}`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <span className="font-medium text-sm">{report.studentName || "Student"}</span>
                              <Badge variant="secondary" className="text-xs">Semester Report</Badge>
                              {sd?.overallGpa !== null && sd?.overallGpa !== undefined && (
                                <Badge
                                  variant="outline"
                                  className={`text-xs font-semibold ${
                                    sd.overallGpa >= 70 ? "text-green-600 border-green-200" :
                                    sd.overallGpa >= 50 ? "text-amber-600 border-amber-200" :
                                    "text-red-600 border-red-200"
                                  }`}
                                >
                                  {sd.overallGpa}%
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mb-1.5">
                              By {report.teacherName || "Teacher"} · {report.period}
                            </p>
                            {sd && (
                              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                                <span>{sd.completedAssignments}/{sd.totalAssignments} assignments completed</span>
                                <span>·</span>
                                <span>{sd.classrooms?.length ?? 0} classroom{sd.classrooms?.length !== 1 ? "s" : ""}</span>
                              </div>
                            )}
                            {report.content && (
                              <p className="text-sm text-foreground line-clamp-1 mt-1.5 text-muted-foreground italic">
                                "{report.content}"
                              </p>
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => navigate(`/reports/${report.id}/view`)}
                            className="shrink-0"
                            data-testid={`button-view-${report.id}`}
                          >
                            <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                            View
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Legacy reports */}
              {legacyReports.length > 0 && (
                <div className="space-y-3">
                  {semesterReports.length > 0 && (
                    <h2 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                      <FileText className="h-4 w-4 text-muted-foreground" /> Other Reports
                    </h2>
                  )}
                  {legacyReports.map((report) => (
                    <div
                      key={report.id}
                      className="p-4 border rounded-lg hover:border-primary/30 transition-colors"
                      data-testid={`card-report-${report.id}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">{report.studentName || "Student"}</span>
                            <span className="text-xs text-muted-foreground font-medium">{report.period}</span>
                            {(report.grades as any)?.Overall !== undefined && (
                              <Badge variant="secondary">{(report.grades as any).Overall}%</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">
                            By {report.teacherName || "Teacher"} · {report.date ? new Date(report.date).toLocaleDateString() : ""}
                          </p>
                          {report.content && (
                            <p className="text-sm text-foreground line-clamp-2">{report.content}</p>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => downloadReport(report)}
                          data-testid={`button-download-${report.id}`}
                          className="shrink-0"
                        >
                          <Download className="h-3.5 w-3.5 mr-1.5" />
                          Save
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

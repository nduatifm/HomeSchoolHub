import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Download } from "lucide-react";
import ModernSidebar from "@/components/ModernSidebar";
import type { ProgressReport } from "@shared/schema";

type ProgressReportEnriched = ProgressReport & { studentName?: string; teacherName?: string };

export default function ParentReportsPage() {
  const { data: progressReports = [] } = useQuery<ProgressReportEnriched[]>({
    queryKey: ["/api/progress-reports/parent"],
  });

  const downloadReport = (report: any) => {
    const dataStr = JSON.stringify(report, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `progress-report-${report.id}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

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
            <div className="space-y-4">
              {progressReports.map((report: any) => (
                <div key={report.id} className="p-4 border rounded-lg hover:border-primary/30 transition-colors" data-testid={`card-report-${report.id}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{report.studentName || "Student"}</span>
                        <span className="text-xs text-muted-foreground font-medium">{report.period}</span>
                        {report.grades?.Overall !== undefined && (
                          <Badge variant="secondary">{report.grades.Overall}%</Badge>
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
        </main>
      </div>
    </div>
  );
}

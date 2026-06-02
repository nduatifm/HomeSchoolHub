import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Loader2, ChevronRight, ChevronLeft, CheckCircle2, BarChart2, BookOpen, Calendar } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { SemesterReportData } from "@shared/schema";

type StudentOption = { id: number; name: string };

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5 mb-5">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-1.5 rounded-full flex-1 transition-colors ${i < current ? "bg-primary" : i === current ? "bg-primary/60" : "bg-muted"}`}
        />
      ))}
    </div>
  );
}

function GradeBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(value, 100)}%` }} />
    </div>
  );
}

export default function SemesterReportDialog({
  open,
  onClose,
  students,
}: {
  open: boolean;
  onClose: () => void;
  students: StudentOption[];
}) {
  const [, navigate] = useLocation();
  const [step, setStep] = useState(0);
  const [studentId, setStudentId] = useState<string>("");
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 5);
    return d.toISOString().split("T")[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split("T")[0]);
  const [comments, setComments] = useState("");
  const [previewData, setPreviewData] = useState<SemesterReportData | null>(null);

  const previewQuery = useQuery<SemesterReportData>({
    queryKey: ["/api/semester-report/preview", studentId, dateFrom, dateTo],
    queryFn: () =>
      apiRequest(`/api/semester-report/preview?studentId=${studentId}&from=${dateFrom}&to=${dateTo}`),
    enabled: false,
  });

  const saveMutation = useMutation({
    mutationFn: (data: any) =>
      apiRequest("/api/progress-reports", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: (report: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/progress-reports/teacher"] });
      toast({ title: "Report saved", description: "Semester performance report has been created." });
      onClose();
      navigate(`/reports/${report.id}/view`);
    },
    onError: () => toast({ title: "Error", description: "Failed to save report.", variant: "destructive" }),
  });

  const selectedStudent = students.find((s) => String(s.id) === studentId);

  function handleClose() {
    setStep(0);
    setStudentId("");
    setComments("");
    setPreviewData(null);
    onClose();
  }

  async function handlePreview() {
    const result = await previewQuery.refetch();
    if (result.data) {
      setPreviewData(result.data);
      setStep(2);
    } else {
      toast({ title: "Preview failed", description: "Could not load report data.", variant: "destructive" });
    }
  }

  function handleSave() {
    if (!previewData || !selectedStudent) return;
    const today = new Date().toISOString().split("T")[0];
    saveMutation.mutate({
      studentId: parseInt(studentId),
      period: `${formatDate(dateFrom)} – ${formatDate(dateTo)}`,
      content: comments,
      date: today,
      grades: previewData.overallGpa !== null ? { Overall: previewData.overallGpa } : {},
      semesterData: previewData,
    });
  }

  function formatDate(d: string) {
    return new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  const gradeColor = (g: number | null) =>
    g === null ? "bg-muted-foreground/30" : g >= 70 ? "bg-green-500" : g >= 50 ? "bg-amber-500" : "bg-red-500";

  const gradeText = (g: number | null) =>
    g === null ? "text-muted-foreground" : g >= 70 ? "text-green-600" : g >= 50 ? "text-amber-600" : "text-red-600";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-lg w-[calc(100vw-2rem)] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            {step === 0 && "Generate Semester Report"}
            {step === 1 && "Select Date Range"}
            {step === 2 && "Preview & Save"}
          </DialogTitle>
        </DialogHeader>

        <StepIndicator current={step} total={3} />

        {/* Step 0: Pick student */}
        {step === 0 && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-sm">Student</Label>
              <Select value={studentId} onValueChange={setStudentId}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select a student…" />
                </SelectTrigger>
                <SelectContent>
                  {students.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end">
              <Button disabled={!studentId} onClick={() => setStep(1)}>
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 1: Date range */}
        {step === 1 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Report will cover all assignments and attendance for{" "}
              <span className="font-medium text-foreground">{selectedStudent?.name}</span>{" "}
              within the selected period.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm">From</Label>
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-10" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">To</Label>
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-10" />
              </div>
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(0)}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <Button
                onClick={handlePreview}
                disabled={!dateFrom || !dateTo || previewQuery.isFetching}
              >
                {previewQuery.isFetching ? (
                  <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Loading…</>
                ) : (
                  <>Preview <ChevronRight className="h-4 w-4 ml-1" /></>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Preview + comment + save */}
        {step === 2 && previewData && (
          <div className="space-y-4">
            {/* Summary strip */}
            <div className="rounded-xl bg-primary/8 border border-primary/20 px-4 py-3 grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">Grade</p>
                <p className={`text-lg font-bold ${gradeText(previewData.overallGpa)}`}>
                  {previewData.overallGpa !== null ? `${previewData.overallGpa}%` : "—"}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">Completion</p>
                <p className="text-lg font-bold text-foreground">{previewData.completionRate}%</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">Attendance</p>
                <p className="text-lg font-bold text-foreground">
                  {previewData.classrooms[0]?.attendance.total > 0
                    ? `${Math.round((previewData.classrooms[0].attendance.present / previewData.classrooms[0].attendance.total) * 100)}%`
                    : "—"}
                </p>
              </div>
            </div>

            {/* Per-classroom breakdown */}
            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {previewData.classrooms.map((c) => (
                <div key={c.id} className="rounded-xl border border-border px-3 py-2.5 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <BookOpen className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-sm font-medium truncate">{c.name}</span>
                      {c.subject && <span className="text-xs text-muted-foreground shrink-0">· {c.subject}</span>}
                    </div>
                    <span className={`text-sm font-bold shrink-0 ${gradeText(c.weightedGrade)}`}>
                      {c.weightedGrade !== null ? `${c.weightedGrade}%` : "—"}
                    </span>
                  </div>
                  <GradeBar value={c.weightedGrade ?? 0} color={gradeColor(c.weightedGrade)} />
                  <div className="flex gap-3 text-[11px] text-muted-foreground">
                    <span>{c.completedAssignments}/{c.totalAssignments} assignments</span>
                    <span>·</span>
                    <span>{c.completionRate}% completion</span>
                  </div>
                </div>
              ))}
              {previewData.classrooms.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No classrooms enrolled.</p>
              )}
            </div>

            {/* Teacher comments */}
            <div className="space-y-1.5">
              <Label className="text-sm">Comments (optional)</Label>
              <Textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Add overall notes, highlights, or recommendations for this student…"
                rows={3}
                className="resize-none text-sm"
              />
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <Button onClick={handleSave} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Saving…</>
                ) : (
                  <><CheckCircle2 className="h-4 w-4 mr-1.5" /> Save Report</>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

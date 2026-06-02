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
import { Loader2, ChevronRight, ChevronLeft, CheckCircle2, BookOpen, Users } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { SemesterReportData } from "@shared/schema";

type StudentOption = { id: number; name: string };

const TOTAL_STEPS = 4;

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-1.5 mb-5">
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <div
          key={i}
          className={`h-1.5 rounded-full flex-1 transition-colors ${
            i < current ? "bg-primary" : i === current ? "bg-primary/60" : "bg-muted"
          }`}
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
  const [period, setPeriod] = useState("");
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
      handleClose();
      navigate(`/reports/${report.id}/view`);
    },
    onError: () =>
      toast({ title: "Error", description: "Failed to save report.", variant: "destructive" }),
  });

  const selectedStudent = students.find((s) => String(s.id) === studentId);

  function handleClose() {
    setStep(0);
    setStudentId("");
    setPeriod("");
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
      toast({
        title: "Preview failed",
        description: "Could not load report data.",
        variant: "destructive",
      });
    }
  }

  function handleSave() {
    if (!previewData || !selectedStudent) return;
    const today = new Date().toISOString().split("T")[0];
    const resolvedPeriod =
      period.trim() ||
      `${formatDate(dateFrom)} – ${formatDate(dateTo)}`;
    saveMutation.mutate({
      studentId: parseInt(studentId),
      period: resolvedPeriod,
      content: comments,
      date: today,
      grades: previewData.overallGpa !== null ? { Overall: previewData.overallGpa } : {},
      semesterData: previewData,
    });
  }

  function formatDate(d: string) {
    return new Date(d + "T12:00:00").toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  const gradeColor = (g: number | null) =>
    g === null
      ? "bg-muted-foreground/30"
      : g >= 70
        ? "bg-green-500"
        : g >= 50
          ? "bg-amber-500"
          : "bg-red-500";

  const gradeText = (g: number | null) =>
    g === null
      ? "text-muted-foreground"
      : g >= 70
        ? "text-green-600"
        : g >= 50
          ? "text-amber-600"
          : "text-red-600";

  const attendancePct =
    previewData?.attendance && previewData.attendance.total > 0
      ? Math.round((previewData.attendance.present / previewData.attendance.total) * 100)
      : null;

  const stepTitle = ["Select Student", "Date Range", "Preview Data", "Add Notes & Save"][step];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-lg w-[calc(100vw-2rem)] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">{stepTitle}</DialogTitle>
        </DialogHeader>

        <StepIndicator current={step} />

        {/* ── Step 0: Student + optional period label ──────────────────── */}
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

            <div className="space-y-1.5">
              <Label className="text-sm">
                Period label
                <span className="ml-1 text-xs text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Input
                placeholder="e.g. Fall 2025, Spring Semester…"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="h-10"
              />
              <p className="text-[11px] text-muted-foreground">
                If left blank, the date range will be used as the period label.
              </p>
            </div>

            <div className="flex justify-end">
              <Button disabled={!studentId} onClick={() => setStep(1)}>
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 1: Date range ────────────────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Only assignments with a due date inside this window will be included for{" "}
              <span className="font-medium text-foreground">{selectedStudent?.name}</span>.
            </p>
            {/* Stack on mobile, side-by-side on sm+ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm">From</Label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="h-10 w-full"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">To</Label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="h-10 w-full"
                />
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
                  <>
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Loading…
                  </>
                ) : (
                  <>
                    Preview <ChevronRight className="h-4 w-4 ml-1" />
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 2: Preview ───────────────────────────────────────────── */}
        {step === 2 && previewData && (
          <div className="space-y-4">
            {/* Summary strip — single col on mobile, 3-col on sm+ */}
            <div className="rounded-xl bg-primary/8 border border-primary/20 px-4 py-3 grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">
                  Overall Grade
                </p>
                <p className={`text-lg font-bold ${gradeText(previewData.overallGpa)}`}>
                  {previewData.overallGpa !== null ? `${previewData.overallGpa}%` : "—"}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">
                  Completion
                </p>
                <p className="text-lg font-bold text-foreground">{previewData.completionRate}%</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">
                  Attendance
                </p>
                <p className="text-lg font-bold text-foreground">
                  {attendancePct !== null ? `${attendancePct}%` : "—"}
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
                      {c.subject && (
                        <span className="text-xs text-muted-foreground shrink-0">· {c.subject}</span>
                      )}
                    </div>
                    <span className={`text-sm font-bold shrink-0 ${gradeText(c.weightedGrade)}`}>
                      {c.weightedGrade !== null ? `${c.weightedGrade}%` : "—"}
                    </span>
                  </div>
                  <GradeBar value={c.weightedGrade ?? 0} color={gradeColor(c.weightedGrade)} />
                  <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                    <span>{c.completedAssignments}/{c.totalAssignments} assignments</span>
                    <span>·</span>
                    <span>{c.completionRate}% completion</span>
                    {c.totalAssignments === 0 && (
                      <span className="italic">No assignments in period</span>
                    )}
                  </div>
                </div>
              ))}
              {previewData.classrooms.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No classrooms found for this student in the selected period.
                </p>
              )}
            </div>

            {/* Global attendance note */}
            {previewData.attendance.total > 0 ? (
              <div className="rounded-xl border border-border px-3 py-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Users className="h-3.5 w-3.5 shrink-0" />
                <span className="font-medium text-foreground">Overall attendance:</span>
                <span className="text-green-600 font-medium">
                  {previewData.attendance.present} present
                </span>
                <span>·</span>
                <span className="text-red-500 font-medium">
                  {previewData.attendance.absent} absent
                </span>
                {previewData.attendance.late > 0 && (
                  <>
                    <span>·</span>
                    <span className="text-amber-500 font-medium">
                      {previewData.attendance.late} late
                    </span>
                  </>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">No attendance records in this period.</p>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <Button onClick={() => setStep(3)}>
                Add Notes <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 3: Notes + save ──────────────────────────────────────── */}
        {step === 3 && previewData && (
          <div className="space-y-4">
            {/* Brief summary reminder */}
            <div className="rounded-xl bg-muted/40 px-3 py-2.5 text-sm flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
              <span className="font-medium text-foreground">{selectedStudent?.name}</span>
              <span>
                Grade:{" "}
                <span className={`font-semibold ${gradeText(previewData.overallGpa)}`}>
                  {previewData.overallGpa !== null ? `${previewData.overallGpa}%` : "—"}
                </span>
              </span>
              <span>· Completion: <span className="font-semibold text-foreground">{previewData.completionRate}%</span></span>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">Teacher Comments <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Add overall notes, highlights, or recommendations for the student and family…"
                rows={5}
                className="resize-none text-sm"
              />
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <Button onClick={handleSave} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Saving…
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-1.5" /> Save Report
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

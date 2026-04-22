import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useGoBack } from "@/hooks/useGoBack";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Paperclip, ExternalLink, Zap } from "lucide-react";
import ModernSidebar from "@/components/ModernSidebar";
import Breadcrumb from "@/components/Breadcrumb";
import { toast } from "@/hooks/use-toast";
import type { Classroom, ClassroomAssignment, ClassroomSubmission } from "@shared/schema";
import FormResponse from "@/components/FormResponse";
import StatusBadge from "./StatusBadge";

type FullSubmission = ClassroomSubmission & {
  studentName: string;
  assignment: ClassroomAssignment;
};

export default function SubmissionReviewPage() {
  const [, params] = useRoute("/classrooms/:slug/submissions/:submissionId/review");
  const [, navigate] = useLocation();

  const classroomSlug = params?.slug ?? "";
  const submissionId = parseInt(params?.submissionId ?? "0");

  const [gradeVal, setGradeVal] = useState("");
  const [feedbackVal, setFeedbackVal] = useState("");

  const { data: classroom, isLoading: classroomLoading } = useQuery<Classroom>({
    queryKey: ["/api/classrooms", classroomSlug],
    queryFn: () => apiRequest(`/api/classrooms/${classroomSlug}`),
    enabled: !!classroomSlug,
  });

  const classroomId = classroom?.id ?? 0;

  const { data: submission, isLoading: submissionLoading } = useQuery<FullSubmission>({
    queryKey: ["/api/classrooms", classroomId, "submissions", submissionId],
    queryFn: () => apiRequest(`/api/classrooms/${classroomId}/submissions/${submissionId}`),
    enabled: !!classroomId && !!submissionId,
  });

  useEffect(() => {
    if (submission) {
      setGradeVal(submission.grade !== null && submission.grade !== undefined ? String(submission.grade) : "");
      setFeedbackVal(submission.feedback ?? "");
    }
  }, [submission?.id]);

  const gradeMutation = useMutation({
    mutationFn: () =>
      apiRequest(`/api/classrooms/${classroomId}/submissions/${submissionId}/grade`, {
        method: "PATCH",
        body: JSON.stringify({ grade: parseInt(gradeVal), feedback: feedbackVal || null }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/classrooms", classroomId, "assignments", submission?.assignmentId, "submissions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/classrooms", classroomId, "submissions", submissionId] });
      queryClient.invalidateQueries({ queryKey: ["/api/teacher/classroom-stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/classroom-notifications/total"] });
      toast({ title: "Grade saved", type: "success" });
      navigate(`/classrooms/${classroomSlug}/assignments`);
    },
    onError: () => toast({ title: "Couldn't save the grade — try again.", type: "error" }),
  });

  const assignment = submission?.assignment;
  const backUrl = `/classrooms/${classroomSlug}/assignments`;
  const goBack = useGoBack(backUrl);
  const isLoading = classroomLoading || submissionLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <ModernSidebar />
        <div className="md:ml-[228px] flex items-center justify-center min-h-screen">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  if (!classroom || !submission || !assignment) {
    return (
      <div className="min-h-screen bg-background">
        <ModernSidebar />
        <div className="md:ml-[228px] flex flex-col items-center justify-center gap-3 min-h-screen">
          <p className="text-gray-500 text-sm">Submission not found.</p>
          <Button variant="outline" size="sm" onClick={goBack}>
            Back to Classroom
          </Button>
        </div>
      </div>
    );
  }

  const canGrade = gradeVal !== "" && !gradeMutation.isPending;

  return (
    <div className="min-h-screen bg-background">
      <ModernSidebar />
      <div className="md:ml-[228px]">
        <div className="p-4 sm:p-5 pt-18 md:pt-5 max-w-4xl mx-auto space-y-5">
          {/* Breadcrumbs */}
          <Breadcrumb crumbs={[
            { label: "Classrooms", href: "/classrooms" },
            ...(classroom.gradeFolderId && classroom.gradeFolderName
              ? [{ label: classroom.gradeFolderName, href: `/classrooms/folders/${classroom.gradeFolderId}`, current: false as const }]
              : []),
            { label: classroom.name, href: `/classrooms/${classroomSlug}/feed`, current: false },
            { label: "Assignments & Tests", href: `/classrooms/${classroomSlug}/assignments`, current: false },
            { label: `${submission.studentName}'s Submission`, current: true },
          ]} />

          {/* Header */}
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-gray-900">{assignment.title}</h1>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-gray-500">{submission.studentName}</span>
              <StatusBadge status={submission.status} />
              {submission.grade !== null && submission.grade !== undefined && (
                <span className="text-sm font-semibold text-green-700">
                  {submission.grade}/{assignment.points} pts
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400">Due {assignment.dueDate} · {assignment.points} points</p>
          </div>

          {/* Submission content */}
          <div className="bg-white rounded-2xl border border-border shadow-sm p-6 space-y-5">
            {assignment.formSchema && assignment.formSchema.length > 0 && submission.formAnswers ? (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Form Responses</p>
                <div className="rounded-xl border border-border bg-muted/30 px-4 py-4">
                  <FormResponse
                    questions={assignment.formSchema}
                    answers={submission.formAnswers as Record<string, string | string[]>}
                    onChange={() => {}}
                    disabled
                    answerKey={assignment.answerKey ?? undefined}
                  />
                </div>
              </div>
            ) : submission.content ? (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Student Answer</p>
                <div className="rounded-xl border border-border bg-muted/30 px-4 py-4 text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                  {submission.content}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">No text answer submitted.</p>
            )}

            {submission.fileUrl && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Submitted File</p>
                <a
                  href={submission.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-primary hover:underline font-medium"
                >
                  <Paperclip className="h-4 w-4" />View submission file<ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            )}

            {/* Attachment on the assignment itself */}
            {assignment.fileUrl && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Assignment Resource</p>
                <a
                  href={assignment.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary hover:underline"
                >
                  <Paperclip className="h-4 w-4" />View attached resource<ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            )}
          </div>

          {/* Grading section */}
          <div className="bg-white rounded-2xl border border-border shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <p className="text-sm font-semibold text-foreground">
                {submission.status === "graded" ? "Update Grade" : "Grade Submission"}
              </p>
              {submission.grade !== null && submission.grade !== undefined && submission.status !== "graded" && assignment.answerKey && (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-violet-700 bg-violet-50 border border-violet-100 px-2.5 py-1 rounded-full">
                  <Zap className="h-3 w-3" />
                  Auto-scored: {submission.grade}/{assignment.points} pts — review and save to confirm
                </span>
              )}
            </div>

            {submission.feedback && (
              <div className="rounded-lg bg-amber-50 border border-amber-100 px-3.5 py-2.5">
                <p className="text-xs font-semibold text-amber-700 mb-0.5">Current Feedback</p>
                <p className="text-sm text-amber-800 italic">"{submission.feedback}"</p>
              </div>
            )}

            <div className="flex gap-4 items-start">
              <div className="w-36 shrink-0 space-y-1.5">
                <Label htmlFor="grade" className="text-sm font-medium">
                  Score <span className="text-gray-400 font-normal">(0–{assignment.points})</span>
                </Label>
                <Input
                  id="grade"
                  type="number"
                  min={0}
                  max={assignment.points}
                  placeholder={`0–${assignment.points}`}
                  value={gradeVal}
                  onChange={(e) => setGradeVal(e.target.value)}
                  className="text-sm"
                />
              </div>
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="feedback" className="text-sm font-medium">
                  Feedback <span className="text-gray-400 font-normal">(optional)</span>
                </Label>
                <Textarea
                  id="feedback"
                  placeholder="Leave feedback for the student…"
                  value={feedbackVal}
                  onChange={(e) => setFeedbackVal(e.target.value)}
                  rows={4}
                  className="text-sm resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-1">
              <Button variant="outline" onClick={goBack}>
                Cancel
              </Button>
              <Button disabled={!canGrade} onClick={() => gradeMutation.mutate()}>
                {gradeMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Save Grade
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

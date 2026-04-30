import React, { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useGoBack } from "@/hooks/useGoBack";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest, apiUpload } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, CheckCircle2, Clock, FileText, Upload, BookOpen, ExternalLink, ClipboardList, Link2, Info } from "lucide-react";
import DOMPurify from "dompurify";
import ModernSidebar from "@/components/ModernSidebar";
import Breadcrumb, { buildClassroomCrumbs } from "@/components/Breadcrumb";
import { toast } from "@/hooks/use-toast";
import { getAttachmentKind } from "@/lib/classroomUtils";
import type { Classroom, ClassroomAssignment, ClassroomSubmission, ClassroomMaterial } from "@shared/schema";
import FormResponse from "@/components/FormResponse";
import StatusBadge from "./classroom/StatusBadge";

type SubmissionWithName = ClassroomSubmission & { studentName: string };

function TeacherPanel({ assignment, classroomId }: { assignment: ClassroomAssignment; classroomId: number }) {
  const [gradeInputs, setGradeInputs] = useState<Record<number, { grade: string; feedback: string }>>({});
  const [showFormPreview, setShowFormPreview] = useState(false);

  const { data: submissions = [], isLoading } = useQuery<SubmissionWithName[]>({
    queryKey: ["/api/classrooms", classroomId, "assignments", assignment.id, "submissions"],
    queryFn: () => apiRequest(`/api/classrooms/${classroomId}/assignments/${assignment.id}/submissions`),
    enabled: !!classroomId,
  });

  const gradeMutation = useMutation({
    mutationFn: ({ submissionId, grade, feedback }: { submissionId: number; grade: number; feedback: string }) =>
      apiRequest(`/api/classrooms/${classroomId}/submissions/${submissionId}/grade`, {
        method: "PATCH",
        body: JSON.stringify({ grade, feedback }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/classrooms", classroomId, "assignments", assignment.id, "submissions"] });
      toast({ title: "Grade saved", type: "success" });
    },
    onError: () => toast({ title: "Couldn't save the grade — try again.", type: "error" }),
  });

  if (isLoading) {
    return <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-gray-400" /></div>;
  }

  return (
    <div className="space-y-4">
      {assignment.formSchema && assignment.formSchema.length > 0 && (
        <Card>
          <CardHeader className="pb-2 px-4 pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-violet-500" />
                <CardTitle className="text-sm font-semibold">Form Preview</CardTitle>
                <span className="text-[11px] text-violet-600 bg-violet-50 border border-violet-100 px-1.5 py-0.5 rounded-full font-medium">
                  {assignment.formSchema.length} {assignment.formSchema.length === 1 ? "question" : "questions"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowFormPreview((v) => !v)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {showFormPreview ? "Hide" : "Show form"}
              </button>
            </div>
          </CardHeader>
          {showFormPreview && (
            <CardContent className="px-4 pb-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <FormResponse
                  questions={assignment.formSchema}
                  answers={{}}
                  onChange={() => {}}
                  disabled
                />
              </div>
            </CardContent>
          )}
        </Card>
      )}

      <h2 className="text-base font-semibold text-gray-800">Student Submissions ({submissions.length})</h2>
      {submissions.length === 0 ? (
        <p className="text-sm text-gray-400 py-6 text-center">No submissions yet.</p>
      ) : (
        submissions.map((sub) => {
          const inputs = gradeInputs[sub.id] ?? { grade: sub.grade?.toString() ?? "", feedback: sub.feedback ?? "" };
          const setInput = (field: "grade" | "feedback", value: string) =>
            setGradeInputs((prev) => ({ ...prev, [sub.id]: { ...inputs, [field]: value } }));

          return (
            <Card key={sub.id} className="overflow-hidden">
              <CardHeader className="pb-2 px-4 pt-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-sm text-gray-900">{sub.studentName}</p>
                    {sub.submittedAt && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        <Clock className="h-3 w-3 inline mr-1" />
                        Submitted {new Date(sub.submittedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <StatusBadge status={sub.status} />
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-3">
                {assignment.formSchema && assignment.formSchema.length > 0 && sub.formAnswers ? (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Form Responses</p>
                    <div className="bg-gray-50 rounded p-3">
                      <FormResponse
                        questions={assignment.formSchema}
                        answers={sub.formAnswers as Record<string, string | string[]>}
                        onChange={() => {}}
                        disabled
                      />
                    </div>
                  </div>
                ) : sub.content ? (
                  <div className="bg-gray-50 rounded p-3 text-sm text-gray-700 whitespace-pre-wrap">
                    {sub.content}
                  </div>
                ) : null}
                {sub.fileUrl && (
                  <a href={sub.fileUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs text-primary hover:underline">
                    <FileText className="h-3.5 w-3.5" />View attached file
                  </a>
                )}
                {(sub.status === "submitted" || sub.status === "graded" || sub.status === "late") && (
                  <div className="border-t pt-3 space-y-2">
                    <div className="flex gap-2 items-end">
                      <div className="w-24">
                        <Label className="text-xs text-gray-500 mb-1 block">Grade / {assignment.points}</Label>
                        <Input
                          type="number"
                          min={0}
                          max={assignment.points}
                          value={inputs.grade}
                          onChange={(e) => setInput("grade", e.target.value)}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="flex-1">
                        <Label className="text-xs text-gray-500 mb-1 block">Feedback</Label>
                        <Input
                          value={inputs.feedback}
                          onChange={(e) => setInput("feedback", e.target.value)}
                          placeholder="Optional feedback…"
                          className="h-8 text-sm"
                        />
                      </div>
                      <Button
                        size="sm"
                        className="h-8"
                        disabled={
                          gradeMutation.isPending ||
                          !inputs.grade ||
                          isNaN(parseInt(inputs.grade, 10)) ||
                          parseInt(inputs.grade, 10) < 0 ||
                          parseInt(inputs.grade, 10) > assignment.points
                        }
                        onClick={() =>
                          gradeMutation.mutate({
                            submissionId: sub.id,
                            grade: parseInt(inputs.grade, 10),
                            feedback: inputs.feedback,
                          })
                        }
                      >
                        {gradeMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save"}
                      </Button>
                    </div>
                    {sub.grade !== null && (
                      <p className="text-xs text-green-600 flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Current grade: {sub.grade}/{assignment.points}
                      </p>
                    )}
                  </div>
                )}
                {sub.status === "pending" && (
                  <p className="text-xs text-gray-400 italic">Student has not submitted yet.</p>
                )}
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}

function StudentPanel({ assignment, classroomId, studentId }: { assignment: ClassroomAssignment; classroomId: number; studentId: number }) {
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [formAnswers, setFormAnswers] = useState<Record<string, string | string[]>>({});

  const { data: submissions = [] } = useQuery<ClassroomSubmission[]>({
    queryKey: ["/api/classrooms", classroomId, "my-submissions"],
    queryFn: () => apiRequest(`/api/classrooms/${classroomId}/my-submissions`),
    enabled: !!classroomId,
  });

  const mySubmission = submissions.find((s) => s.assignmentId === assignment.id);

  const hasFormSchema = !!(assignment.formSchema && assignment.formSchema.length > 0);

  const missingRequiredQuestions = hasFormSchema
    ? (assignment.formSchema ?? []).filter((q) => {
        if (!q.required) return false;
        const answer = formAnswers[q.id];
        if (q.type === "checkbox") return !Array.isArray(answer) || answer.length === 0;
        return !answer || (typeof answer === "string" && !answer.trim());
      })
    : [];

  const submitMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.append("content", text);
      if (file) formData.append("file", file);
      if (hasFormSchema && Object.keys(formAnswers).length > 0) {
        formData.append("formAnswers", JSON.stringify(formAnswers));
      }
      return apiUpload(`/api/classrooms/${classroomId}/assignments/${assignment.id}/submit`, formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/classrooms", classroomId, "my-submissions"] });
      setText("");
      setFile(null);
      setFormAnswers({});
      toast({ title: "Submitted!", type: "success" });
    },
    onError: () => toast({ title: "Couldn't submit — try again.", type: "error" }),
  });

  const isReturned = mySubmission?.status === "returned";
  const isSubmitted = mySubmission && (mySubmission.status === "submitted" || mySubmission.status === "graded" || mySubmission.status === "late");

  return (
    <div className="space-y-4">
      {isReturned && mySubmission.returnNote && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3.5 space-y-1">
          <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Returned for revision</p>
          <p className="text-sm text-amber-800">{mySubmission.returnNote}</p>
          <p className="text-xs text-amber-600 mt-1">Please revise your work and resubmit below.</p>
        </div>
      )}

      {mySubmission && (
        <Card>
          <CardHeader className="pb-2 px-4 pt-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Your Submission</CardTitle>
              <StatusBadge status={mySubmission.status} />
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-2">
            {hasFormSchema && mySubmission.formAnswers ? (
              <div className="bg-gray-50 rounded p-3">
                <FormResponse
                  questions={assignment.formSchema!}
                  answers={mySubmission.formAnswers as Record<string, string | string[]>}
                  onChange={() => {}}
                  disabled
                  answerKey={mySubmission.status !== "pending"
                    ? (assignment.answerKey ?? undefined)
                    : undefined}
                  hideNeedsReview
                />
              </div>
            ) : mySubmission.content ? (
              <div className="bg-gray-50 rounded p-3 text-sm text-gray-700 whitespace-pre-wrap">{mySubmission.content}</div>
            ) : null}
            {mySubmission.fileUrl && (
              <a href={mySubmission.fileUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs text-primary hover:underline">
                <FileText className="h-3.5 w-3.5" />View your file
              </a>
            )}
            {mySubmission.status !== "graded" && mySubmission.grade !== null && assignment.answerKey && (
              <div className="rounded-lg border border-blue-100 bg-blue-50 px-3.5 py-2.5 flex gap-2.5 items-start mt-2">
                <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-blue-700">Your score so far: {mySubmission.grade}/{assignment.points} pts</p>
                  <p className="text-[11px] text-blue-500 mt-0.5">This is not your final grade yet — your teacher will look at your answers and give you your real score soon.</p>
                </div>
              </div>
            )}
            {mySubmission.status === "graded" && mySubmission.grade !== null && (
              <div className="flex items-center gap-2 pt-1">
                <span className="text-sm font-medium text-green-700">{mySubmission.grade}/{assignment.points} pts</span>
                {mySubmission.feedback && <span className="text-xs text-gray-500">— {mySubmission.feedback}</span>}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {!isSubmitted && (
        <Card>
          <CardHeader className="pb-2 px-4 pt-4">
            <CardTitle className="text-sm font-semibold">{isReturned ? "Resubmit Your Work" : "Submit Your Work"}</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-3">
            {hasFormSchema ? (
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 mb-2">
                  <ClipboardList className="h-3.5 w-3.5 text-primary" />
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Assignment Form</p>
                </div>
                <FormResponse
                  questions={assignment.formSchema!}
                  answers={formAnswers}
                  onChange={setFormAnswers}
                  stepByStep
                />
              </div>
            ) : (
              <div>
                <Label className="text-xs text-gray-500 mb-1.5 block">Response</Label>
                <Textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Type your answer or notes here…"
                  rows={5}
                  className="resize-none text-sm"
                />
              </div>
            )}
            <div>
              <Label className="text-xs text-gray-500 mb-1.5 block">Attach File (optional)</Label>
              <label className="flex items-center gap-2 cursor-pointer border border-dashed rounded px-3 py-2 text-sm text-gray-500 hover:border-primary/50 hover:text-primary transition-colors">
                <Upload className="h-4 w-4" />
                {file ? file.name : "Choose a file…"}
                <input type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              </label>
            </div>
            {missingRequiredQuestions.length > 0 && (
              <p className="text-xs text-red-500">
                Please answer required question{missingRequiredQuestions.length > 1 ? "s" : ""}:{" "}
                {missingRequiredQuestions.map((q) => q.label || "Untitled").join(", ")}
              </p>
            )}
            <Button
              className="w-full"
              disabled={
                submitMutation.isPending ||
                missingRequiredQuestions.length > 0 ||
                (!hasFormSchema && !text.trim() && !file)
              }
              onClick={() => submitMutation.mutate()}
            >
              {submitMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {isReturned ? "Resubmit Assignment" : "Submit Assignment"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ParentPanel({ assignment, classroomId, studentId }: { assignment: ClassroomAssignment; classroomId: number; studentId: number }) {
  const { data: submissions = [] } = useQuery<ClassroomSubmission[]>({
    queryKey: ["/api/classrooms", classroomId, "my-submissions", studentId],
    queryFn: () => apiRequest(`/api/classrooms/${classroomId}/my-submissions?studentId=${studentId}`),
    enabled: !!classroomId && !!studentId,
  });

  const mySubmission = submissions.find((s) => s.assignmentId === assignment.id);

  return (
    <div className="space-y-4">
      {!mySubmission ? (
        <p className="text-sm text-gray-400 py-6 text-center">No submission yet.</p>
      ) : (
        <Card>
          <CardHeader className="pb-2 px-4 pt-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Submission</CardTitle>
              <StatusBadge status={mySubmission.status} />
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-2">
            {assignment.formSchema && assignment.formSchema.length > 0 && mySubmission.formAnswers ? (
              <div className="bg-gray-50 rounded p-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Form Responses</p>
                <FormResponse
                  questions={assignment.formSchema}
                  answers={mySubmission.formAnswers as Record<string, string | string[]>}
                  onChange={() => {}}
                  disabled
                />
              </div>
            ) : mySubmission.content ? (
              <div className="bg-gray-50 rounded p-3 text-sm text-gray-700 whitespace-pre-wrap">{mySubmission.content}</div>
            ) : null}
            {mySubmission.fileUrl && (
              <a href={mySubmission.fileUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs text-primary hover:underline">
                <FileText className="h-3.5 w-3.5" />View file
              </a>
            )}
            {mySubmission.status === "graded" && mySubmission.grade !== null ? (
              <div className="flex items-center gap-2 pt-1">
                <span className="text-sm font-medium text-green-700">{mySubmission.grade}/{assignment.points} pts</span>
                {mySubmission.feedback && <span className="text-xs text-gray-500">— {mySubmission.feedback}</span>}
              </div>
            ) : (
              <p className="text-xs text-gray-400">Not graded yet.</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function ClassworkDetail() {
  const [, params] = useRoute("/classrooms/:slug/classwork/:classworkSlug");
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [materialDialogOpen, setMaterialDialogOpen] = useState<ClassroomMaterial | null>(null);

  const classroomSlug = params?.slug ?? "";
  const classworkSlug = params?.classworkSlug ?? "";
  const goBack = useGoBack(`/classrooms/${classroomSlug}/assignments`);

  const searchParams = new URLSearchParams(window.location.search);
  const parentStudentId = parseInt(searchParams.get("studentId") ?? "0");

  const { data: classroom, isLoading: classroomLoading } = useQuery<Classroom>({
    queryKey: ["/api/classrooms", classroomSlug],
    queryFn: () => apiRequest(`/api/classrooms/${classroomSlug}`),
    enabled: !!classroomSlug,
  });

  const classroomId = classroom?.id ?? 0;

  const { data: assignment, isLoading: assignmentLoading } = useQuery<ClassroomAssignment>({
    queryKey: ["/api/classrooms", classroomId, "assignments", "slug", classworkSlug],
    queryFn: () => apiRequest(`/api/classrooms/${classroomId}/assignments/slug/${classworkSlug}`),
    enabled: !!classroomId && !!classworkSlug,
  });

  const { data: classworkMaterials = [] } = useQuery<ClassroomMaterial[]>({
    queryKey: ["/api/classrooms", classroomId, "materials"],
    queryFn: () => apiRequest(`/api/classrooms/${classroomId}/materials`),
    enabled: !!classroomId && !!assignment?.id,
  });

  const { data: studentData } = useQuery<{ id: number }>({
    queryKey: ["/api/students/me"],
    queryFn: () => apiRequest("/api/students/me"),
    enabled: user?.role === "student",
  });

  const isLoading = classroomLoading || assignmentLoading;

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

  if (!classroom || !assignment) {
    return (
      <div className="min-h-screen bg-background">
        <ModernSidebar />
        <div className="md:ml-[228px] flex flex-col items-center justify-center gap-3 min-h-screen">
          <p className="text-gray-500 text-sm">{!classroom ? "Classroom not found." : "Assignment not found."}</p>
          <Button variant="outline" size="sm" onClick={goBack}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const isTeacher = user?.role === "teacher" && classroom.teacherId === user.id;
  const isStudent = user?.role === "student";
  const isParent = user?.role === "parent";

  const linkedMaterials = classworkMaterials.filter((m) => (m.linkedAssignmentIds ?? []).includes(assignment?.id ?? -1));

  return (
    <div className="min-h-screen bg-background">
      <ModernSidebar />
      <div className="md:ml-[228px]">
        <div className="p-4 sm:p-5 pt-18 md:pt-5 max-w-4xl mx-auto space-y-5">
          {/* Breadcrumbs */}
          <Breadcrumb crumbs={buildClassroomCrumbs({
            role: user?.role ?? undefined,
            classroomName: classroom.name,
            classroomHref: `/classrooms/${classroomSlug}/feed`,
            tabLabel: "Assignments & Tests",
            tabHref: `/classrooms/${classroomSlug}/assignments${window.location.search}`,
            search: window.location.search,
            folderName: classroom.gradeFolderName ?? undefined,
            folderHref: classroom.gradeFolderId
              ? `/classrooms/folders/${classroom.gradeFolderId}${isParent && parentStudentId ? `?studentId=${parentStudentId}` : ""}`
              : undefined,
          }).concat({ label: assignment.title, current: true })} />

          {/* Assignment header */}
          <div className="space-y-1">
            <div className="flex items-start gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900">{assignment.title}</h1>
              {classroom.status === "archived" && <Badge variant="secondary" className="text-xs">Archived</Badge>}
              {assignment.formSchema && assignment.formSchema.length > 0 && (
                <span className="inline-flex items-center gap-1 text-[11px] text-violet-600 bg-violet-50 border border-violet-100 px-2 py-0.5 rounded-full font-medium self-center">
                  <ClipboardList className="h-3 w-3" />{assignment.formSchema.length} form {assignment.formSchema.length === 1 ? "question" : "questions"}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500">{classroom.name} · {classroom.subject}</p>
            <div className="flex flex-wrap gap-3 text-xs text-gray-500 pt-1">
              <span className="flex items-center gap-1"><Clock className="h-3 w-3" />Due {assignment.dueDate}</span>
              <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />{assignment.points} pts</span>
            </div>
          </div>

          {/* Description / Attachment */}
          {(assignment.description || assignment.fileUrl) && (
            <Card>
              <CardContent className="px-4 py-4 space-y-3">
                {assignment.description && (
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{assignment.description}</p>
                )}
                {assignment.fileUrl && (
                  <a
                    href={assignment.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 text-xs text-primary hover:underline"
                  >
                    <FileText className="h-3.5 w-3.5" />View attached resource
                  </a>
                )}
              </CardContent>
            </Card>
          )}

          {/* Assignment Link */}
          {assignment.linkUrl && (
            <Card>
              <CardContent className="px-4 py-3">
                <a
                  href={assignment.linkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 group"
                >
                  <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                    <Link2 className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground group-hover:text-blue-600 transition-colors truncate">
                      {assignment.linkUrl}
                    </p>
                    <p className="text-xs text-muted-foreground">Opens in a new tab</p>
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0 group-hover:text-blue-600 transition-colors" />
                </a>
              </CardContent>
            </Card>
          )}

          {/* Linked Classwork Materials */}
          {linkedMaterials.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-gray-800">Classwork Materials</h2>
              {linkedMaterials.map((material) => (
                <button
                  key={material.id}
                  type="button"
                  onClick={() => {
                    setMaterialDialogOpen(material);
                    if (!isTeacher) {
                      apiRequest(`/api/classrooms/${classroomId}/materials/${material.id}/seen`, { method: "POST" }).catch(() => {});
                    }
                  }}
                  className="w-full text-left"
                >
                  <Card className="hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer">
                    <CardContent className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <BookOpen className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-foreground">{material.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {new Date(material.uploadedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                            {(() => {
                              const atts = material.attachments ?? [];
                              const urlKind = material.url ? getAttachmentKind(material.url) : null;
                              const pdfCount = atts.length + (urlKind === "pdf" && !atts.includes(material.url!) ? 1 : 0);
                              if (pdfCount > 0) return ` · ${pdfCount} PDF${pdfCount > 1 ? "s" : ""} attached`;
                              if (urlKind === "link") return " · Link attached";
                              return "";
                            })()}
                          </p>
                        </div>
                        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      </div>
                    </CardContent>
                  </Card>
                </button>
              ))}
            </div>
          )}

          {/* Role panel */}
          {isTeacher && <TeacherPanel assignment={assignment} classroomId={classroomId} />}
          {isStudent && <StudentPanel assignment={assignment} classroomId={classroomId} studentId={studentData?.id ?? 0} />}
          {isParent && <ParentPanel assignment={assignment} classroomId={classroomId} studentId={parentStudentId} />}
        </div>
      </div>

      {/* Material preview dialog */}
      <Dialog open={materialDialogOpen !== null} onOpenChange={(v) => { if (!v) setMaterialDialogOpen(null); }}>
        <DialogContent className="max-w-2xl w-full p-0 gap-0 overflow-hidden flex flex-col max-h-[85vh]">
          <DialogHeader className="px-6 pt-5 pb-4 border-b border-border shrink-0">
            <DialogTitle className="text-base font-semibold leading-snug pr-6">
              {materialDialogOpen?.title}
            </DialogTitle>
            {materialDialogOpen?.uploadedAt && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {new Date(materialDialogOpen.uploadedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </p>
            )}
          </DialogHeader>

          <div className="flex-1 overflow-auto px-6 py-5 space-y-5">
            {materialDialogOpen?.description &&
              materialDialogOpen.description !== "<p></p>" &&
              materialDialogOpen.description.trim() !== "" && (
              <div
                className="prose prose-sm max-w-none text-foreground
                  prose-headings:font-semibold prose-headings:text-foreground
                  prose-h2:text-xl prose-h2:mt-4 prose-h2:mb-2
                  prose-p:leading-relaxed prose-p:my-1.5 prose-p:text-foreground/90
                  prose-ul:pl-5 prose-ol:pl-5 prose-li:my-0.5
                  prose-strong:font-semibold prose-strong:text-foreground
                  prose-em:text-foreground/80
                  prose-a:text-primary prose-a:underline
                  prose-hr:border-border prose-hr:my-5
                  prose-img:rounded-xl prose-img:my-4 prose-img:max-w-full"
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(materialDialogOpen.description, { USE_PROFILES: { html: true } }),
                }}
              />
            )}

            {materialDialogOpen && (() => {
              const urlKind = materialDialogOpen.url ? getAttachmentKind(materialDialogOpen.url) : null;
              const legacyPdf = urlKind === "pdf" ? materialDialogOpen.url! : null;
              const savedAtts = materialDialogOpen.attachments ?? [];
              const allPdfs = legacyPdf && !savedAtts.includes(legacyPdf)
                ? [legacyPdf, ...savedAtts]
                : savedAtts;
              return (
                <>
                  {/* Multiple PDF attachments */}
                  {allPdfs.map((pdfUrl, i) => (
                    <a
                      key={pdfUrl}
                      href={pdfUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border hover:bg-muted/50 transition-colors group"
                    >
                      <div className="h-9 w-9 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
                        <FileText className="h-4 w-4 text-red-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">
                          {allPdfs.length > 1 ? `Open PDF ${i + 1}` : "Open PDF"}
                        </p>
                      </div>
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground shrink-0" />
                    </a>
                  ))}
                  {/* External link */}
                  {urlKind === "link" && materialDialogOpen.url && (
                    <a
                      href={materialDialogOpen.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border hover:bg-muted/50 transition-colors group"
                    >
                      <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <ExternalLink className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">Open link</p>
                        <p className="text-xs text-muted-foreground truncate">{materialDialogOpen.url}</p>
                      </div>
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground shrink-0" />
                    </a>
                  )}
                </>
              );
            })()}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import React, { useState, useEffect, useRef } from "react";
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
import { Loader2, CheckCircle2, Clock, FileText, Upload, BookOpen, ExternalLink, ClipboardList, Link2, Info, AlertTriangle } from "lucide-react";
import DOMPurify from "dompurify";
import ModernSidebar from "@/components/ModernSidebar";
import Breadcrumb, { buildClassroomCrumbs } from "@/components/Breadcrumb";
import { toast } from "@/hooks/use-toast";
import { getAttachmentKind } from "@/lib/classroomUtils";
import type { Classroom, ClassroomAssignment, ClassroomSubmission, ClassroomMaterial } from "@shared/schema";
import FormResponse from "@/components/FormResponse";
import StatusBadge from "./classroom/StatusBadge";

type SubmissionWithName = ClassroomSubmission & { studentName: string };

function relativeTime(ts: string): string {
  const diffMs = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMs / 3600000);
  const days = Math.floor(diffMs / 86400000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}

function TeacherPanel({ assignment, classroomId }: { assignment: ClassroomAssignment; classroomId: number }) {
  const [gradeInputs, setGradeInputs] = useState<Record<number, { grade: string; feedback: string }>>({});
  const [expandedSubs, setExpandedSubs] = useState<Set<number>>(new Set());
  const toggleSub = (id: number) =>
    setExpandedSubs((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

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
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/classrooms", classroomId, "assignments", assignment.id, "submissions"] });
      toast({ title: "Grade saved", type: "success" });
      // Collapse the graded card and expand next ungraded
      setExpandedSubs((prev) => {
        const next = new Set(prev);
        next.delete(variables.submissionId);
        return next;
      });
    },
    onError: () => toast({ title: "Couldn't save the grade — try again.", type: "error" }),
  });

  if (isLoading) {
    return <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-gray-400" /></div>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-gray-800">Student Submissions ({submissions.length})</h2>
      {submissions.length === 0 ? (
        <p className="text-sm text-gray-400 py-6 text-center">No submissions yet.</p>
      ) : (
        submissions.map((sub) => {
          const inputs = gradeInputs[sub.id] ?? { grade: sub.grade?.toString() ?? "", feedback: sub.feedback ?? "" };
          const setInput = (field: "grade" | "feedback", value: string) =>
            setGradeInputs((prev) => ({ ...prev, [sub.id]: { ...inputs, [field]: value } }));
          const isExpanded = expandedSubs.has(sub.id);
          const canGrade = sub.status === "submitted" || sub.status === "graded" || sub.status === "late";

          return (
            <Card key={sub.id} className="overflow-hidden">
              <button
                type="button"
                className="w-full text-left px-4 py-3.5 flex items-center justify-between gap-2 hover:bg-muted/30 transition-colors"
                onClick={() => toggleSub(sub.id)}
              >
                <div>
                  <p className="font-medium text-sm text-gray-900">{sub.studentName}</p>
                  {sub.submittedAt && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Submitted {relativeTime(sub.submittedAt)}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <StatusBadge status={sub.status} />
                  <span className="text-xs text-muted-foreground">{isExpanded ? "▲" : "▼"}</span>
                </div>
              </button>

              {isExpanded && (
                <CardContent className="px-4 pb-4 pt-0 space-y-3 border-t border-border">
                  {assignment.formSchema && assignment.formSchema.length > 0 && sub.formAnswers ? (
                    <div className="bg-gray-50 rounded p-3 mt-3">
                      <FormResponse
                        questions={assignment.formSchema}
                        answers={sub.formAnswers as Record<string, string | string[]>}
                        onChange={() => {}}
                        disabled
                      />
                    </div>
                  ) : sub.content ? (
                    <div className="bg-gray-50 rounded p-3 mt-3 text-sm text-gray-700 whitespace-pre-wrap">
                      {sub.content}
                    </div>
                  ) : null}
                  {sub.fileUrl && (
                    <a href={sub.fileUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs text-primary hover:underline">
                      <FileText className="h-3.5 w-3.5" />View attached file
                    </a>
                  )}
                  {canGrade && (
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
                            autoFocus
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
                </CardContent>
              )}
            </Card>
          );
        })
      )}
    </div>
  );
}

const ACCEPTED_MIME = new Set([
  "image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
]);
const ACCEPTED_EXT = /\.(jpe?g|png|gif|webp|pdf|docx?|txt)$/i;
const MAX_FILE_BYTES = 10 * 1024 * 1024;

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function StudentPanel({ assignment, classroomId, studentId, isArchived }: {
  assignment: ClassroomAssignment; classroomId: number; studentId: number; isArchived: boolean;
}) {
  const draftKey = `draft:${classroomId}:${assignment.id}`;
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [formAnswers, setFormAnswers] = useState<Record<string, string | string[]>>({});
  const [draftRestored, setDraftRestored] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedStatusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef<string | null>(null);
  const isDirtyRef = useRef(false);
  const currentDraftRef = useRef<string | null>(null);
  const serverDraftAppliedRef = useRef(false);

  const { data: submissions = [] } = useQuery<ClassroomSubmission[]>({
    queryKey: ["/api/classrooms", classroomId, "my-submissions"],
    queryFn: () => apiRequest(`/api/classrooms/${classroomId}/my-submissions`),
    enabled: !!classroomId,
  });

  const mySubmission = submissions.find((s) => s.assignmentId === assignment.id);

  // Fetch server draft — source of truth across devices
  const { data: serverDraft, isSuccess: serverDraftLoaded } = useQuery<any | null>({
    queryKey: ["/api/classrooms", classroomId, "assignments", assignment.id, "draft"],
    queryFn: () => apiRequest(`/api/classrooms/${classroomId}/assignments/${assignment.id}/draft`),
    enabled: !!classroomId && !!assignment.id,
    retry: false,
    staleTime: Infinity,
  });

  useEffect(() => {
    if (mySubmission?.status === "returned") {
      if (mySubmission.content) setText(mySubmission.content);
      if (mySubmission.formAnswers) {
        setFormAnswers(mySubmission.formAnswers as Record<string, string | string[]>);
      }
    }
  }, [mySubmission?.id, mySubmission?.status]);

  // Restore from localStorage (fast, on mount)
  useEffect(() => {
    if (mySubmission && mySubmission.status !== "returned") return;
    const saved = localStorage.getItem(draftKey);
    if (!saved) return;
    try {
      const { text: savedText, formAnswers: savedAnswers } = JSON.parse(saved);
      if (savedText) { setText(savedText); setDraftRestored(true); }
      if (savedAnswers && Object.keys(savedAnswers).length > 0) {
        setFormAnswers(savedAnswers);
        setDraftRestored(true);
      }
      lastSavedRef.current = saved;
    } catch {}
  }, [draftKey]);

  // Auto-fade "Draft restored" banner after 3s
  useEffect(() => {
    if (!draftRestored) return;
    const t = setTimeout(() => setDraftRestored(false), 3000);
    return () => clearTimeout(t);
  }, [draftRestored]);

  // Apply server draft when it loads — server copy wins over localStorage
  useEffect(() => {
    if (!serverDraftLoaded) return;
    if (serverDraftAppliedRef.current) return;
    serverDraftAppliedRef.current = true;
    if (!serverDraft) return;
    if (mySubmission && mySubmission.status !== "returned") return;
    const serverContent = serverDraft.content ?? "";
    const serverAnswers = (serverDraft.formAnswers as Record<string, string | string[]>) ?? {};
    const hasServerContent = serverContent.trim().length > 0 || Object.keys(serverAnswers).length > 0;
    if (!hasServerContent) return;
    setText(serverContent);
    setFormAnswers(serverAnswers);
    setDraftRestored(true);
    const snapshot = JSON.stringify({ text: serverContent, formAnswers: serverAnswers });
    lastSavedRef.current = snapshot;
    localStorage.setItem(draftKey, snapshot);
  }, [serverDraftLoaded, serverDraft, mySubmission?.status, draftKey]);

  useEffect(() => {
    const currentSnapshot = JSON.stringify({ text, formAnswers });
    currentDraftRef.current = currentSnapshot;

    if (currentSnapshot === lastSavedRef.current) return;

    const submitted = mySubmission && (mySubmission.status === "submitted" || mySubmission.status === "graded" || mySubmission.status === "late");
    if (submitted) return;

    const hasContent = text.trim().length > 0 || Object.keys(formAnswers).length > 0;
    if (!hasContent) return;

    isDirtyRef.current = true;
    setAutoSaveStatus("saving");
    // "Saving…" auto-resets to idle after 3s even if debounce hasn't fired yet
    if (savingTimerRef.current) clearTimeout(savingTimerRef.current);
    savingTimerRef.current = setTimeout(() => {
      setAutoSaveStatus((prev) => (prev === "saving" ? "idle" : prev));
    }, 3000);

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      const snapshot = JSON.stringify({ text, formAnswers });
      localStorage.setItem(draftKey, snapshot);
      lastSavedRef.current = snapshot;
      isDirtyRef.current = false;
      setAutoSaveStatus("saved");
      if (savedStatusTimerRef.current) clearTimeout(savedStatusTimerRef.current);
      savedStatusTimerRef.current = setTimeout(() => setAutoSaveStatus("idle"), 2500);
      // Also persist to server (fire-and-forget, network failures are silent)
      apiRequest(`/api/classrooms/${classroomId}/assignments/${assignment.id}/draft`, {
        method: "PUT",
        body: JSON.stringify({ content: text, formAnswers: Object.keys(formAnswers).length > 0 ? formAnswers : null }),
      }).catch(() => {});
    }, 2000);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [text, formAnswers, draftKey, mySubmission?.status]);

  useEffect(() => {
    return () => {
      if (isDirtyRef.current && currentDraftRef.current !== null) {
        localStorage.setItem(draftKey, currentDraftRef.current);
      }
      if (savedStatusTimerRef.current) clearTimeout(savedStatusTimerRef.current);
      if (savingTimerRef.current) clearTimeout(savingTimerRef.current);
    };
  }, [draftKey]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirtyRef.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  const hasFormSchema = !!(assignment.formSchema && assignment.formSchema.length > 0);

  const missingRequiredQuestions = hasFormSchema
    ? (assignment.formSchema ?? []).filter((q) => {
        if (!q.required) return false;
        const answer = formAnswers[q.id];
        if (q.type === "checkbox") return !Array.isArray(answer) || answer.length === 0;
        return !answer || (typeof answer === "string" && !answer.trim());
      })
    : [];

  function validateAndSetFile(f: File | null | undefined) {
    setFileError(null);
    if (!f) return;
    if (!ACCEPTED_MIME.has(f.type) && !ACCEPTED_EXT.test(f.name)) {
      setFileError("Only images, PDFs, Word docs, and text files are allowed.");
      return;
    }
    if (f.size > MAX_FILE_BYTES) {
      setFileError("File must be 10 MB or smaller.");
      return;
    }
    setFile(f);
  }

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
      localStorage.removeItem(draftKey);
      lastSavedRef.current = null;
      isDirtyRef.current = false;
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (savedStatusTimerRef.current) clearTimeout(savedStatusTimerRef.current);
      // Delete server draft (fire-and-forget)
      apiRequest(`/api/classrooms/${classroomId}/assignments/${assignment.id}/draft`, { method: "DELETE" }).catch(() => {});
      queryClient.invalidateQueries({ queryKey: ["/api/classrooms", classroomId, "my-submissions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/classrooms", classroomId, "assignments", assignment.id, "draft"] });
      setText("");
      setFile(null);
      setFormAnswers({});
      setDraftRestored(false);
      setAutoSaveStatus("idle");
      toast({ title: "Submitted!", type: "success" });
    },
    onError: () => toast({ title: "Couldn't submit — try again.", type: "error" }),
  });

  const isReturned = mySubmission?.status === "returned";
  const isSubmitted = mySubmission && (mySubmission.status === "submitted" || mySubmission.status === "graded" || mySubmission.status === "late");

  return (
    <div className="space-y-3">
      {isReturned && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 flex gap-3 items-start">
          <div className="h-8 w-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
            <span className="text-base">✏️</span>
          </div>
          <div className="space-y-0.5 flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-800">Your teacher sent this back for you to fix</p>
            {mySubmission.returnNote && (
              <p className="text-sm text-amber-700">{mySubmission.returnNote}</p>
            )}
            <p className="text-xs text-amber-600">Make your changes below and turn it in again.</p>
          </div>
        </div>
      )}

      {mySubmission && (
        <Card>
          <CardHeader className="pb-2 px-4 pt-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Your answer</CardTitle>
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
              <a href={mySubmission.fileUrl} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline">
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

      {/* Archived notice — no submission form */}
      {isArchived && !isSubmitted && (
        <div className="rounded-xl border border-border bg-muted/40 px-4 py-5 text-center space-y-1">
          <p className="text-sm font-medium text-muted-foreground">Submissions are closed</p>
          <p className="text-xs text-muted-foreground/70">This classroom has been archived.</p>
        </div>
      )}

      {!isSubmitted && !isArchived && (
        <Card>
          <CardHeader className="pb-4 px-6 pt-6">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">
                {isReturned ? "Revise your answer" : "Your answer"}
              </CardTitle>
              <div className="flex items-center gap-1.5 min-h-[1rem]">
                {draftRestored && autoSaveStatus === "idle" && (
                  <span className="text-xs text-muted-foreground">Draft restored</span>
                )}
                {autoSaveStatus === "saving" && (
                  <span className="text-xs text-muted-foreground">Saving…</span>
                )}
                {autoSaveStatus === "saved" && (
                  <span className="text-xs text-muted-foreground">Saved</span>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-6 pb-6 space-y-5">

            {/* Step 1 — Answer */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="h-5 w-5 rounded-full bg-primary text-primary-foreground text-[11px] font-bold flex items-center justify-center shrink-0">1</span>
                <p className="text-xs font-semibold text-muted-foreground">
                  {hasFormSchema ? "Answer the questions" : "Write your answer"}
                </p>
              </div>
              {hasFormSchema ? (
                <FormResponse
                  questions={assignment.formSchema!}
                  answers={formAnswers}
                  onChange={setFormAnswers}
                  stepByStep
                />
              ) : (
                <Textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Write your answer here…"
                  rows={4}
                  className="resize-none text-sm"
                />
              )}
            </div>

            {/* Step 2 — File (optional) */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="h-5 w-5 rounded-full bg-muted text-muted-foreground text-[11px] font-bold flex items-center justify-center shrink-0">2</span>
                <p className="text-xs font-semibold text-muted-foreground">Attach a file</p>
              </div>
              {file ? (
                <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <FileText className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setFile(null); setFileError(null); }}
                    className="text-xs text-muted-foreground hover:text-destructive transition-colors px-2 py-1 rounded-md hover:bg-destructive/10 shrink-0"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <label
                  className={`flex flex-col items-center justify-center gap-2 cursor-pointer rounded-xl border-2 border-dashed px-4 py-6 transition-colors ${
                    dragOver
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/50 hover:text-primary/70"
                  }`}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    validateAndSetFile(e.dataTransfer.files?.[0]);
                  }}
                >
                  <Upload className="h-6 w-6" />
                  <span className="text-sm font-medium">Drop a file here or click to browse</span>
                  <span className="text-xs text-muted-foreground/70">Photos, PDFs, or Word docs — up to 10 MB</span>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*,.pdf,.doc,.docx,.txt"
                    onChange={(e) => validateAndSetFile(e.target.files?.[0])}
                  />
                </label>
              )}
              {fileError && (
                <p className="mt-1.5 text-xs text-destructive">{fileError}</p>
              )}
            </div>

            {missingRequiredQuestions.length > 0 && (
              <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                Still needed: {missingRequiredQuestions.map((q) => q.label || "Untitled").join(", ")}
              </p>
            )}

            {/* Step 3 — Submit */}
            <Button
              className="w-full h-11 text-base font-semibold"
              disabled={
                submitMutation.isPending ||
                missingRequiredQuestions.length > 0 ||
                (!hasFormSchema && !text.trim() && !file)
              }
              onClick={() => submitMutation.mutate()}
            >
              {submitMutation.isPending
                ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Turning in…</>
                : isReturned ? "Turn In Again" : "Turn In"
              }
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
                <p className="text-xs font-semibold text-muted-foreground mb-2">Your answers</p>
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
                <FileText className="h-3.5 w-3.5" />{mySubmission.fileUrl.split("/").pop()?.split("?")[0] || "View attached file"}
              </a>
            )}
            {mySubmission.status === "returned" && (
              <div className="flex items-start gap-2 rounded-md bg-amber-50 border border-amber-200 px-3 py-2.5 mt-1">
                <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-amber-700 mb-0.5">Returned for revision</p>
                  {mySubmission.returnNote ? (
                    <p className="text-xs text-amber-700">{mySubmission.returnNote}</p>
                  ) : (
                    <p className="text-xs text-amber-600 italic">Your child's teacher has sent this back for revision.</p>
                  )}
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
          <p className="text-muted-foreground text-sm">{!classroom ? "We couldn't find that classroom." : "We couldn't find that assignment."}</p>
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

  const isArchived = classroom.status === "archived";

  // Shared assignment info blocks reused in both layouts
  const assignmentInfoBlocks = (
    <>
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
                className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
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
          <h2 className="text-sm font-semibold text-foreground">Materials</h2>
          {linkedMaterials.map((material) => (
            <a
              key={material.id}
              href={`/classrooms/${classroomSlug}/materials/${material.slug}`}
              target="_blank"
              rel="noreferrer"
              onClick={() => {
                if (!isTeacher) {
                  apiRequest(`/api/classrooms/${classroomId}/materials/${material.id}/seen`, { method: "POST" }).catch(() => {});
                }
              }}
              className="w-full text-left block"
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
            </a>
          ))}
        </div>
      )}
    </>
  );

  // Shared assignment header
  const assignmentHeader = (
    <div className="space-y-1">
      <div className="flex items-start gap-2 flex-wrap">
        <h1 className="text-2xl font-bold text-gray-900">{assignment.title}</h1>
        {isArchived && <Badge variant="secondary" className="text-xs self-center">Archived</Badge>}
        {assignment.formSchema && assignment.formSchema.length > 0 && (
          <span className="inline-flex items-center gap-1 text-[11px] text-violet-600 bg-violet-50 border border-violet-100 px-2 py-0.5 rounded-full font-medium self-center">
            <ClipboardList className="h-3 w-3" />{assignment.formSchema.length} form {assignment.formSchema.length === 1 ? "question" : "questions"}
          </span>
        )}
      </div>
      <p className="text-sm text-gray-500">{classroom.name} · {classroom.subject}</p>
      <div className="flex flex-wrap gap-3 text-xs text-gray-500 pt-1">
        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />Due {assignment.dueDate}</span>
        {!isStudent && (
          <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />{assignment.points} pts</span>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <ModernSidebar />
      <div className="md:ml-[228px]">
        {isStudent ? (
          /* Two-column layout for students: info left, submission right */
          <div className="p-4 sm:p-6 pt-20 md:pt-6 max-w-6xl mx-auto space-y-5">
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

            {assignmentHeader}

            {/* Instructions — full width */}
            <div className="space-y-4">
              {assignmentInfoBlocks}
            </div>

            {/* Submission panel — centered */}
            <div className="max-w-xl mx-auto w-full">
              <StudentPanel
                assignment={assignment}
                classroomId={classroomId}
                studentId={studentData?.id ?? 0}
                isArchived={isArchived}
              />
            </div>
          </div>
        ) : (
          /* Single-column layout for teachers and parents */
          <div className="p-4 sm:p-5 pt-18 md:pt-5 max-w-4xl mx-auto space-y-5">
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

            {assignmentHeader}
            {assignmentInfoBlocks}

            {isTeacher && <TeacherPanel assignment={assignment} classroomId={classroomId} />}
            {isParent && <ParentPanel assignment={assignment} classroomId={classroomId} studentId={parentStudentId} />}
          </div>
        )}
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

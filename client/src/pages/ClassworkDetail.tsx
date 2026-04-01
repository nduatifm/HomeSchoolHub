import React, { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, ChevronLeft, CheckCircle2, Clock, FileText, Upload } from "lucide-react";
import ModernSidebar from "@/components/ModernSidebar";
import { toast } from "@/hooks/use-toast";
import type { Classroom, ClassroomAssignment, ClassroomSubmission } from "@shared/schema";

type SubmissionWithName = ClassroomSubmission & { studentName: string };

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-gray-100 text-gray-600",
    submitted: "bg-blue-100 text-blue-700",
    late: "bg-amber-100 text-amber-700",
    graded: "bg-green-100 text-green-700",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${map[status] ?? "bg-gray-100 text-gray-600"}`}>
      {status}
    </span>
  );
}

function TeacherPanel({ assignment, classroomId }: { assignment: ClassroomAssignment; classroomId: number }) {
  const [gradeInputs, setGradeInputs] = useState<Record<number, { grade: string; feedback: string }>>({});

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
    onError: (e: any) => toast({ title: "Error saving grade", description: e.message, type: "error" }),
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
                {sub.content && (
                  <div className="bg-gray-50 rounded p-3 text-sm text-gray-700 whitespace-pre-wrap">
                    {sub.content}
                  </div>
                )}
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
                        disabled={gradeMutation.isPending || !inputs.grade}
                        onClick={() =>
                          gradeMutation.mutate({
                            submissionId: sub.id,
                            grade: parseInt(inputs.grade),
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

  const { data: submissions = [] } = useQuery<ClassroomSubmission[]>({
    queryKey: ["/api/classrooms", classroomId, "my-submissions"],
    queryFn: () => apiRequest(`/api/classrooms/${classroomId}/my-submissions`),
    enabled: !!classroomId,
  });

  const mySubmission = submissions.find((s) => s.assignmentId === assignment.id);

  const submitMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.append("content", text);
      if (file) formData.append("file", file);
      const res = await fetch(`/api/classrooms/${classroomId}/assignments/${assignment.id}/submit`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Submit failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/classrooms", classroomId, "my-submissions"] });
      setText("");
      setFile(null);
      toast({ title: "Submitted!", type: "success" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, type: "error" }),
  });

  const isSubmitted = mySubmission && (mySubmission.status === "submitted" || mySubmission.status === "graded" || mySubmission.status === "late");

  return (
    <div className="space-y-4">
      {mySubmission && (
        <Card>
          <CardHeader className="pb-2 px-4 pt-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Your Submission</CardTitle>
              <StatusBadge status={mySubmission.status} />
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-2">
            {mySubmission.content && (
              <div className="bg-gray-50 rounded p-3 text-sm text-gray-700 whitespace-pre-wrap">{mySubmission.content}</div>
            )}
            {mySubmission.fileUrl && (
              <a href={mySubmission.fileUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs text-primary hover:underline">
                <FileText className="h-3.5 w-3.5" />View your file
              </a>
            )}
            {mySubmission.grade !== null && (
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
            <CardTitle className="text-sm font-semibold">Submit Your Work</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-3">
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
            <div>
              <Label className="text-xs text-gray-500 mb-1.5 block">Attach File (optional)</Label>
              <label className="flex items-center gap-2 cursor-pointer border border-dashed rounded px-3 py-2 text-sm text-gray-500 hover:border-primary/50 hover:text-primary transition-colors">
                <Upload className="h-4 w-4" />
                {file ? file.name : "Choose a file…"}
                <input type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              </label>
            </div>
            <Button
              className="w-full"
              disabled={submitMutation.isPending || (!text.trim() && !file)}
              onClick={() => submitMutation.mutate()}
            >
              {submitMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Submit Assignment
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
            {mySubmission.content && (
              <div className="bg-gray-50 rounded p-3 text-sm text-gray-700 whitespace-pre-wrap">{mySubmission.content}</div>
            )}
            {mySubmission.fileUrl && (
              <a href={mySubmission.fileUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs text-primary hover:underline">
                <FileText className="h-3.5 w-3.5" />View file
              </a>
            )}
            {mySubmission.grade !== null ? (
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

  const classroomSlug = params?.slug ?? "";
  const classworkSlug = params?.classworkSlug ?? "";

  const searchParams = new URLSearchParams(window.location.search);
  const parentStudentId = parseInt(searchParams.get("studentId") ?? "0");

  const { data: classroom, isLoading: classroomLoading } = useQuery<Classroom>({
    queryKey: ["/api/classrooms", classroomSlug],
    queryFn: () => apiRequest(`/api/classrooms/${classroomSlug}`),
    enabled: !!classroomSlug,
  });

  const classroomId = classroom?.id ?? 0;

  const { data: assignments = [], isLoading: assignmentsLoading } = useQuery<ClassroomAssignment[]>({
    queryKey: ["/api/classrooms", classroomId, "assignments"],
    queryFn: () => apiRequest(`/api/classrooms/${classroomId}/assignments`),
    enabled: !!classroomId,
  });

  const { data: studentData } = useQuery<{ id: number }>({
    queryKey: ["/api/students/me"],
    queryFn: () => apiRequest("/api/students/me"),
    enabled: user?.role === "student",
  });

  const isLoading = classroomLoading || assignmentsLoading;
  const assignment = assignments.find((a) => a.slug === classworkSlug);

  if (isLoading) {
    return (
      <div className="flex min-h-screen">
        <ModernSidebar />
        <div className="flex-1 md:ml-[228px] flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  if (!classroom || !assignment) {
    return (
      <div className="flex min-h-screen">
        <ModernSidebar />
        <div className="flex-1 md:ml-[228px] flex flex-col items-center justify-center gap-3">
          <p className="text-gray-500 text-sm">{!classroom ? "Classroom not found." : "Assignment not found."}</p>
          <Button variant="outline" size="sm" onClick={() => navigate("/dashboard")}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const isTeacher = user?.role === "teacher" && classroom.teacherId === user.id;
  const isStudent = user?.role === "student";
  const isParent = user?.role === "parent";

  return (
    <div className="flex min-h-screen bg-gray-50">
      <ModernSidebar />
      <div className="flex-1 md:ml-[228px] overflow-auto">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-20 pb-8 md:pt-8 space-y-6">
          {/* Breadcrumb */}
          <div className="space-y-1">
            <button
              onClick={() => navigate(`/classrooms/${classroomSlug}`)}
              className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              <ChevronLeft className="h-3.5 w-3.5" />Back to {classroom.name}
            </button>
          </div>

          {/* Assignment header */}
          <div className="space-y-1">
            <div className="flex items-start gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900">{assignment.title}</h1>
              {classroom.status === "archived" && <Badge variant="secondary" className="text-xs">Archived</Badge>}
            </div>
            <p className="text-sm text-gray-500">{classroom.name} · {classroom.subject}</p>
            <div className="flex flex-wrap gap-3 text-xs text-gray-500 pt-1">
              <span className="flex items-center gap-1"><Clock className="h-3 w-3" />Due {assignment.dueDate}</span>
              <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />{assignment.points} pts</span>
            </div>
          </div>

          {/* Description */}
          {assignment.description && (
            <Card>
              <CardContent className="px-4 py-4">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{assignment.description}</p>
                {assignment.fileUrl && (
                  <a
                    href={assignment.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 text-xs text-primary hover:underline mt-3"
                  >
                    <FileText className="h-3.5 w-3.5" />View attached resource
                  </a>
                )}
              </CardContent>
            </Card>
          )}

          {/* Role panel */}
          {isTeacher && <TeacherPanel assignment={assignment} classroomId={classroomId} />}
          {isStudent && <StudentPanel assignment={assignment} classroomId={classroomId} studentId={studentData?.id ?? 0} />}
          {isParent && <ParentPanel assignment={assignment} classroomId={classroomId} studentId={parentStudentId} />}
        </div>
      </div>
    </div>
  );
}

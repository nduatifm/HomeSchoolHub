import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueries, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest, apiUpload } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { School, ChevronRight, Folder, Loader2, BookOpen, Clock } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import ModernSidebar from "@/components/ModernSidebar";
import ClassroomCard from "@/components/ClassroomCard";
import type { ClassroomNotificationsMap } from "@/lib/classroomNotifications";
import type { Classroom, ClassroomAssignment, ClassroomSubmission, Assignment, StudentAssignment } from "@shared/schema";

type AssignmentWithStatus = Assignment & { studentAssignment: StudentAssignment | null };

type PendingTask = {
  key: string;
  title: string;
  subtitle: string;
  dueDate: string;
  type: "classwork" | "legacy";
  classroomSlug?: string;
  assignmentSlug?: string;
  assignmentId?: number;
  studentAssignmentId?: number;
  hasStudentAssignment?: boolean;
};

export default function StudentClassroomsPage() {
  const { user, student } = useAuth();
  const [, navigate] = useLocation();

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = user?.name?.split(" ")[0] || "there";

  const [submitDialogAssignmentId, setSubmitDialogAssignmentId] = useState<number | null>(null);
  const [submissionForm, setSubmissionForm] = useState({
    assignmentId: 0,
    studentAssignmentId: 0,
    submission: "",
    notes: "",
    hasStudentAssignment: false,
  });
  const [submissionFile, setSubmissionFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: classrooms = [], isLoading: classroomsLoading } = useQuery<Classroom[]>({ queryKey: ["/api/classrooms"] });

  const { data: legacyAssignments = [], isLoading: assignmentsLoading } = useQuery<AssignmentWithStatus[]>({
    queryKey: ["/api/assignments/student", student?.id],
    enabled: !!student,
  });

  const classroomAssignmentQueries = useQueries({
    queries: classrooms.map(c => ({
      queryKey: ["/api/classrooms", c.id, "assignments"],
      queryFn: () => apiRequest(`/api/classrooms/${c.id}/assignments`),
      enabled: classrooms.length > 0,
    })),
  });

  const classroomSubmissionQueries = useQueries({
    queries: classrooms.map(c => ({
      queryKey: ["/api/classrooms", c.id, "my-submissions"],
      queryFn: () => apiRequest(`/api/classrooms/${c.id}/my-submissions`),
      enabled: classrooms.length > 0,
    })),
  });

  const { data: notifMap = {} as ClassroomNotificationsMap } = useQuery<ClassroomNotificationsMap>({
    queryKey: ["/api/students", student?.id, "classroom-notifications"],
    queryFn: () => apiRequest(`/api/students/${student!.id}/classroom-notifications`),
    enabled: !!student,
  });

  const pendingClassworkItems = classrooms.flatMap((c, i) => {
    const cwAssignments: ClassroomAssignment[] = (classroomAssignmentQueries[i]?.data as ClassroomAssignment[]) ?? [];
    const cwSubmissions: ClassroomSubmission[] = (classroomSubmissionQueries[i]?.data as ClassroomSubmission[]) ?? [];
    return cwAssignments
      .map(a => {
        const sub = cwSubmissions.find(s => s.assignmentId === a.id);
        return {
          id: a.id,
          title: a.title,
          slug: a.slug ?? String(a.id),
          classroomName: c.name,
          classroomSlug: c.slug ?? String(c.id),
          dueDate: a.dueDate,
          status: sub?.status ?? "pending",
        };
      })
      .filter(item => item.status === "pending");
  }).sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  const pendingLegacy = (legacyAssignments as AssignmentWithStatus[]).filter(
    a => a.studentAssignment?.status === "pending" || !a.studentAssignment,
  );

  const allPendingItems: PendingTask[] = [
    ...pendingClassworkItems.map(a => ({
      key: `cw-${a.id}`,
      title: a.title,
      subtitle: a.classroomName,
      dueDate: a.dueDate,
      type: "classwork" as const,
      classroomSlug: a.classroomSlug,
      assignmentSlug: a.slug,
    })),
    ...pendingLegacy.map(a => ({
      key: `legacy-${a.id}`,
      title: a.title,
      subtitle: (a as any).subject,
      dueDate: a.dueDate,
      type: "legacy" as const,
      assignmentId: a.id,
      studentAssignmentId: a.studentAssignment?.id ?? 0,
      hasStudentAssignment: !!a.studentAssignment,
    })),
  ].sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  const isTasksLoading = assignmentsLoading || classroomsLoading || classroomAssignmentQueries.some(q => q.isLoading);

  const submitAssignmentMutation = useMutation({
    mutationFn: async ({
      assignmentId,
      studentAssignmentId,
      submission,
      notes,
      hasStudentAssignment,
      file,
    }: typeof submissionForm & { file: File | null }) => {
      setIsSubmitting(true);
      const formData = new FormData();
      formData.append("submission", submission);
      if (notes) formData.append("notes", notes);
      if (file) formData.append("file", file);

      if (hasStudentAssignment) {
        return apiUpload(`/api/student-assignments/${studentAssignmentId}/submit`, formData, { method: "PATCH" });
      } else {
        formData.append("studentId", String(student?.id));
        return apiUpload(`/api/assignments/${assignmentId}/submit`, formData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assignments/student", student?.id] });
      toast({ title: "Assignment submitted!", type: "success" });
      setSubmissionForm({ assignmentId: 0, studentAssignmentId: 0, submission: "", notes: "", hasStudentAssignment: false });
      setSubmissionFile(null);
      setSubmitDialogAssignmentId(null);
      setIsSubmitting(false);
    },
    onError: () => {
      setIsSubmitting(false);
      toast({ title: "Couldn't submit — try again.", type: "error" });
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <ModernSidebar />
      <div className="md:ml-[228px]">
        <main className="p-4 sm:p-5 pt-18 md:pt-5 max-w-4xl mx-auto">
          <div className="mb-5">
            <h1 className="text-xl font-semibold text-foreground">{greeting}, {firstName} 👋</h1>
            <p className="text-sm text-muted-foreground">
              {isTasksLoading
                ? "Loading your tasks…"
                : allPendingItems.length > 0
                  ? `You have ${allPendingItems.length} thing${allPendingItems.length === 1 ? "" : "s"} to do.`
                  : "Nothing due — you're ahead of the game!"}
            </p>
          </div>

          {/* Pending tasks panel */}
          {!isTasksLoading && allPendingItems.length > 0 && (
            <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-amber-200">
                <Clock className="h-4 w-4 text-amber-600 shrink-0" />
                <span className="text-sm font-semibold text-amber-800">Things to do</span>
              </div>
              <ul className="divide-y divide-amber-100">
                {allPendingItems.slice(0, 8).map(item => (
                  <li
                    key={item.key}
                    className="flex items-center justify-between px-4 py-3 hover:bg-amber-100/60 cursor-pointer transition-colors group"
                    onClick={() => {
                      if (item.type === "classwork" && item.classroomSlug && item.assignmentSlug) {
                        navigate(`/classrooms/${item.classroomSlug}/classwork/${item.assignmentSlug}`);
                      } else if (item.type === "legacy" && item.assignmentId) {
                        setSubmitDialogAssignmentId(item.assignmentId);
                        setSubmissionForm({
                          assignmentId: item.assignmentId,
                          studentAssignmentId: item.studentAssignmentId ?? 0,
                          submission: "",
                          notes: "",
                          hasStudentAssignment: item.hasStudentAssignment ?? false,
                        });
                      }
                    }}
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <BookOpen className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-amber-900 truncate">{item.title}</p>
                        <p className="text-xs text-amber-700">{item.subtitle} · Due {item.dueDate}</p>
                      </div>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 text-amber-400 shrink-0 group-hover:text-amber-600 transition-colors" />
                  </li>
                ))}
              </ul>
            </div>
          )}

          <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
            <School className="h-4 w-4 text-primary" /> All Classes
          </h2>

          {classroomsLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : classrooms.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm rounded-2xl border border-dashed border-border">
              You have not been enrolled in any classrooms yet.
            </div>
          ) : (() => {
            const folderMap = new Map<number, { id: number; name: string; classrooms: Classroom[] }>();
            const ungrouped: Classroom[] = [];
            for (const c of classrooms) {
              if (c.gradeFolderId && c.gradeFolderName) {
                if (!folderMap.has(c.gradeFolderId)) {
                  folderMap.set(c.gradeFolderId, { id: c.gradeFolderId, name: c.gradeFolderName, classrooms: [] });
                }
                folderMap.get(c.gradeFolderId)!.classrooms.push(c);
              } else {
                ungrouped.push(c);
              }
            }
            const folders = Array.from(folderMap.values());
            const hasGroups = folders.length > 0;
            return (
              <div className="space-y-6">
                {folders.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {folders.map(folder => {
                      const pending = folder.classrooms.reduce((sum, c) => sum + (notifMap[c.id]?.pendingCount ?? 0), 0);
                      const hasDue = folder.classrooms.some(c => (notifMap[c.id]?.dueCount ?? 0) > 0 || (notifMap[c.id]?.newPostsCount ?? 0) > 0);
                      const hasDueSoon = folder.classrooms.some(c => (notifMap[c.id]?.dueSoonCount ?? 0) > 0);
                      const hasNew = folder.classrooms.some(c => (notifMap[c.id]?.newCount ?? 0) > 0 || (notifMap[c.id]?.newMaterialsCount ?? 0) > 0);
                      const badgeBg = hasDue ? "bg-red-500" : hasDueSoon ? "bg-amber-500" : hasNew ? "bg-green-500" : "bg-primary";
                      return (
                        <div key={folder.id} className="relative group/folder">
                          <button
                            onClick={() => navigate(`/classrooms/folders/${folder.id}`)}
                            className="relative w-full text-left rounded-2xl border border-border overflow-hidden flex flex-col cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 active:scale-[0.985] bg-card"
                          >
                            {pending > 0 && (
                              <span className={`absolute top-2.5 right-2.5 z-10 min-w-[22px] h-[22px] px-1.5 rounded-full text-[11px] font-bold text-white flex items-center justify-center shadow-sm ${badgeBg}`}>
                                {pending > 9 ? "9+" : pending}
                              </span>
                            )}
                            <div className="w-full h-24 shrink-0 bg-primary/10 flex items-center justify-center">
                              <Folder className="h-10 w-10 text-primary opacity-70" />
                            </div>
                            <div className="px-4 py-3 flex flex-col gap-1 flex-1">
                              <h3 className="font-bold text-sm text-foreground leading-snug">{folder.name}</h3>
                              <span className="text-xs text-muted-foreground">
                                {folder.classrooms.length} {folder.classrooms.length === 1 ? "subject" : "subjects"}
                              </span>
                              <div className="mt-auto pt-3 flex items-center justify-between">
                                <span className="text-xs font-semibold text-primary group-hover/folder:underline">Open Folder</span>
                                <ChevronRight className="h-3.5 w-3.5 text-primary opacity-60 group-hover/folder:opacity-100 transition-opacity" />
                              </div>
                            </div>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
                {ungrouped.length > 0 && (
                  <div>
                    {hasGroups && (
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Other Classes</h3>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {ungrouped.map(c => (
                        <ClassroomCard
                          key={c.id}
                          classroom={c}
                          href={`/classrooms/${c.slug ?? c.id}`}
                          notification={notifMap[c.id] ?? null}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </main>
      </div>

      {/* Submit legacy assignment dialog */}
      <Dialog
        open={submitDialogAssignmentId !== null}
        onOpenChange={(open) => { if (!open) setSubmitDialogAssignmentId(null); }}
      >
        <DialogContent>
          <DialogHeader><DialogTitle>Submit Assignment</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Your answer or response..."
              value={submissionForm.submission}
              onChange={(e) => setSubmissionForm({ ...submissionForm, submission: e.target.value })}
              rows={5}
            />
            <Textarea
              placeholder="Notes for your teacher (optional)"
              value={submissionForm.notes}
              onChange={(e) => setSubmissionForm({ ...submissionForm, notes: e.target.value })}
              rows={2}
            />
            <div>
              <label className="text-sm font-medium block mb-1">Attach file (optional)</label>
              <input
                type="file"
                onChange={(e) => setSubmissionFile(e.target.files?.[0] ?? null)}
                className="text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubmitDialogAssignmentId(null)}>Cancel</Button>
            <Button
              disabled={!submissionForm.submission || isSubmitting}
              onClick={() => submitAssignmentMutation.mutate({ ...submissionForm, file: submissionFile })}
            >
              {isSubmitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Submitting...</> : "Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

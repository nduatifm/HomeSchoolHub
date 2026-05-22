import { useState, useEffect, useRef, useMemo } from "react";
import { useRoute, useLocation } from "wouter";
import { useGoBack } from "@/hooks/useGoBack";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest, apiUpload } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Loader2,
  ChevronLeft,
  Paperclip,
  ClipboardList,
  X,
  Plus,
  Calendar,
  Trophy,
  ExternalLink,
  Link2,
} from "lucide-react";
import ModernSidebar from "@/components/ModernSidebar";
import Breadcrumb from "@/components/Breadcrumb";
import ConfirmDialog from "@/components/ConfirmDialog";
import { toast } from "@/hooks/use-toast";
import { BookOpen, Check } from "lucide-react";
import type { Classroom, ClassroomAssignment, ClassroomMaterial, FormQuestion, ItemType } from "@shared/schema";

const typeLabel: Record<string, string> = {
  short: "Short answer",
  paragraph: "Paragraph",
  multiple_choice: "Multiple choice",
  checkbox: "Checkboxes",
  true_false: "True / False",
};

const typePill: Record<string, string> = {
  short: "bg-sky-100 text-sky-700",
  paragraph: "bg-violet-100 text-violet-700",
  multiple_choice: "bg-emerald-100 text-emerald-700",
  checkbox: "bg-amber-100 text-amber-700",
  true_false: "bg-pink-100 text-pink-700",
};

function getDraftKey(draftId: string) {
  return `lyra_form_draft_${draftId}`;
}

function getAnswerKeyDraftKey(draftId: string) {
  return `lyra_form_answerkey_${draftId}`;
}

export default function EditAssignmentPage() {
  const [, params] = useRoute("/classrooms/:slug/assignments/:assignmentSlug/edit");
  const [, navigate] = useLocation();
  const { user } = useAuth();

  const classroomSlug = params?.slug ?? "";
  const assignmentSlug = params?.assignmentSlug ?? "";

  const [form, setForm] = useState({ title: "", description: "", dueDate: "", points: "100" });
  const [assignmentType, setAssignmentType] = useState<ItemType>("assignment");
  const [linkUrl, setLinkUrl] = useState("");
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [clearFile, setClearFile] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedMaterialIds, setSelectedMaterialIds] = useState<number[]>([]);
  const [materialSearch, setMaterialSearch] = useState("");
  const [formQuestions, setFormQuestions] = useState<FormQuestion[]>([]);
  const [answerKey, setAnswerKey] = useState<Record<string, string | string[]>>({});
  const [initialized, setInitialized] = useState(false);
  // Snapshot of form values as they were when the assignment data was first loaded.
  // isDirty compares current state against the snapshot so reversions clear the flag.
  const [snapshot, setSnapshot] = useState<{
    form: { title: string; description: string; dueDate: string; points: string };
    assignmentType: ItemType;
    linkUrl: string;
    formQuestions: FormQuestion[];
    answerKey: Record<string, string | string[]>;
    clearFile: boolean;
  } | null>(null);

  const titleRef = useRef<HTMLTextAreaElement>(null);
  const draftId = useRef(Math.random().toString(36).slice(2, 14));
  const pendingLeave = useRef<(() => void) | null>(null);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const serverDraftAppliedRef = useRef(false);
  const serverDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showRestorePrompt, setShowRestorePrompt] = useState(false);

  // True only when current state differs from the original seeded snapshot.
  const isDirty = useMemo(() => {
    if (attachedFile) return true;
    if (!snapshot) return false;
    return (
      JSON.stringify(form) !== JSON.stringify(snapshot.form) ||
      assignmentType !== snapshot.assignmentType ||
      linkUrl !== snapshot.linkUrl ||
      JSON.stringify(formQuestions) !== JSON.stringify(snapshot.formQuestions) ||
      JSON.stringify(answerKey) !== JSON.stringify(snapshot.answerKey) ||
      clearFile !== snapshot.clearFile
    );
  }, [snapshot, form, assignmentType, linkUrl, formQuestions, answerKey, attachedFile, clearFile]);

  function autoGrowTitle() {
    const el = titleRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }

  function formatDueDate(dateStr: string): string {
    if (!dateStr) return "";
    const d = new Date(dateStr + "T00:00:00");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.round((d.getTime() - today.getTime()) / 86400000);
    const formatted = d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
    if (diffDays === 0) return `Today · ${formatted}`;
    if (diffDays === 1) return `Tomorrow · ${formatted}`;
    if (diffDays < 0) return `Overdue · ${formatted}`;
    if (diffDays <= 7) return `In ${diffDays} days · ${formatted}`;
    return formatted;
  }

  const { data: classroom, isLoading: classroomLoading } = useQuery<Classroom>({
    queryKey: ["/api/classrooms", classroomSlug],
    queryFn: () => apiRequest(`/api/classrooms/${classroomSlug}`),
    enabled: !!classroomSlug,
  });

  const classroomId = classroom?.id ?? 0;

  const { data: materials = [] } = useQuery<ClassroomMaterial[]>({
    queryKey: ["/api/classrooms", classroomId, "materials"],
    queryFn: () => apiRequest(`/api/classrooms/${classroomId}/materials`),
    enabled: !!classroomId,
  });

  const { data: assignment, isLoading: assignmentLoading } = useQuery<ClassroomAssignment>({
    queryKey: ["/api/classrooms", classroomId, "assignments", "slug", assignmentSlug],
    queryFn: () => apiRequest(`/api/classrooms/${classroomId}/assignments/slug/${assignmentSlug}`),
    enabled: !!classroomId && !!assignmentSlug,
  });

  // Fetch server edit draft for this assignment
  const { data: serverDraft, isSuccess: serverDraftLoaded } = useQuery<any | null>({
    queryKey: ["/api/classrooms", classroomId, "assignment-draft", assignment?.id],
    queryFn: () => apiRequest(`/api/classrooms/${classroomId}/assignment-draft/${assignment!.id}`),
    enabled: !!classroomId && !!assignment?.id,
    retry: false,
    staleTime: Infinity,
  });

  // Seed form state + snapshot once assignment is loaded
  useEffect(() => {
    if (!assignment || initialized) return;
    const seedForm = {
      title: assignment.title,
      description: assignment.description ?? "",
      dueDate: assignment.dueDate,
      points: String(assignment.points),
    };
    const seedType = (assignment.assignmentType as ItemType) ?? "assignment";
    const seedLink = assignment.linkUrl ?? "";
    const existing = (assignment.formSchema as FormQuestion[] | null) ?? [];
    const existingKey = (assignment.answerKey as Record<string, string | string[]> | null) ?? {};
    setForm(seedForm);
    setAssignmentType(seedType);
    setLinkUrl(seedLink);
    setFormQuestions(existing);
    setAnswerKey(existingKey);
    setSelectedMaterialIds(assignment.linkedMaterialIds ?? []);
    localStorage.setItem(getDraftKey(draftId.current), JSON.stringify(existing));
    localStorage.setItem(getAnswerKeyDraftKey(draftId.current), JSON.stringify(existingKey));
    // Snapshot captured here — isDirty compares against this baseline
    setSnapshot({ form: seedForm, assignmentType: seedType, linkUrl: seedLink, formQuestions: existing, answerKey: existingKey, clearFile: false });
    setInitialized(true);
    setTimeout(autoGrowTitle, 0);
  }, [assignment, initialized]);

  // Keep localStorage in sync when formQuestions change
  useEffect(() => {
    if (!initialized) return;
    localStorage.setItem(getDraftKey(draftId.current), JSON.stringify(formQuestions));
  }, [formQuestions, initialized]);

  // Keep localStorage in sync when answerKey changes
  useEffect(() => {
    if (!initialized) return;
    localStorage.setItem(getAnswerKeyDraftKey(draftId.current), JSON.stringify(answerKey));
  }, [answerKey, initialized]);

  // After initialization, check if server draft differs from published — offer to restore
  useEffect(() => {
    if (!initialized || !serverDraftLoaded || serverDraftAppliedRef.current) return;
    serverDraftAppliedRef.current = true;
    if (!serverDraft || !assignment) return;
    const d = serverDraft;
    // Broader hasContent — any saved field counts
    const hasContent =
      (d.title ?? "").trim() ||
      (d.description ?? "").trim() ||
      d.dueDate ||
      d.assignmentType ||
      (d.linkUrl ?? "").trim() ||
      (d.linkedMaterialIds?.length ?? 0) > 0 ||
      (d.formSchema?.length ?? 0) > 0 ||
      (d.answerKey && Object.keys(d.answerKey).length > 0);
    if (!hasContent) return;
    // Compare server draft against every field in the published snapshot
    const pubForm = {
      title: assignment.title,
      description: assignment.description ?? "",
      dueDate: assignment.dueDate,
      points: String(assignment.points),
    };
    const pubType = (assignment.assignmentType as ItemType) ?? "assignment";
    const pubLink = assignment.linkUrl ?? "";
    const pubMaterials = assignment.linkedMaterialIds ?? [];
    const pubSchema = (assignment.formSchema as FormQuestion[] | null) ?? [];
    const pubKey = (assignment.answerKey as Record<string, string | string[]> | null) ?? {};
    const draftForm = {
      title: d.title ?? pubForm.title,
      description: d.description ?? pubForm.description,
      dueDate: d.dueDate ?? pubForm.dueDate,
      points: d.points != null ? String(d.points) : pubForm.points,
    };
    const serverDiffersFromPublished =
      JSON.stringify(draftForm) !== JSON.stringify(pubForm) ||
      ((d.assignmentType as ItemType) ?? pubType) !== pubType ||
      (d.linkUrl ?? pubLink) !== pubLink ||
      JSON.stringify(d.linkedMaterialIds ?? pubMaterials) !== JSON.stringify(pubMaterials) ||
      JSON.stringify(d.formSchema ?? pubSchema) !== JSON.stringify(pubSchema) ||
      JSON.stringify(d.answerKey ?? pubKey) !== JSON.stringify(pubKey);
    if (!serverDiffersFromPublished) return;
    // Surface restore prompt — user must explicitly choose to restore
    setShowRestorePrompt(true);
  }, [initialized, serverDraftLoaded, serverDraft, assignment]);

  // Apply the server draft when the user clicks "Restore"
  function applyServerDraft() {
    if (!serverDraft || !assignment) return;
    const d = serverDraft;
    setForm({
      title: d.title ?? assignment.title,
      description: d.description ?? assignment.description ?? "",
      dueDate: d.dueDate ?? assignment.dueDate,
      points: d.points != null ? String(d.points) : String(assignment.points),
    });
    if (d.assignmentType) setAssignmentType(d.assignmentType as ItemType);
    if (d.linkUrl !== undefined) setLinkUrl(d.linkUrl ?? "");
    if (d.linkedMaterialIds?.length) setSelectedMaterialIds(d.linkedMaterialIds);
    if (d.formSchema?.length) {
      setFormQuestions(d.formSchema);
      localStorage.setItem(getDraftKey(draftId.current), JSON.stringify(d.formSchema));
    }
    if (d.answerKey && Object.keys(d.answerKey).length) {
      setAnswerKey(d.answerKey);
      localStorage.setItem(getAnswerKeyDraftKey(draftId.current), JSON.stringify(d.answerKey));
    }
    setShowRestorePrompt(false);
    setTimeout(autoGrowTitle, 0);
  }

  // Debounce server save when fields change (only after initialization)
  useEffect(() => {
    if (!initialized || !classroomId || !assignment?.id) return;
    if (!isDirty) return;
    if (serverDebounceTimerRef.current) clearTimeout(serverDebounceTimerRef.current);
    serverDebounceTimerRef.current = setTimeout(() => {
      apiRequest(`/api/classrooms/${classroomId}/assignment-draft/${assignment.id}`, {
        method: "PUT",
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          dueDate: form.dueDate,
          points: parseInt(form.points, 10) || 100,
          assignmentType,
          linkUrl: linkUrl || null,
          formSchema: formQuestions.length > 0 ? formQuestions : null,
          answerKey: Object.keys(answerKey).length > 0 ? answerKey : null,
          linkedMaterialIds: selectedMaterialIds,
        }),
      }).catch(() => {});
    }, 2000);
    return () => { if (serverDebounceTimerRef.current) clearTimeout(serverDebounceTimerRef.current); };
  }, [form, assignmentType, linkUrl, formQuestions, answerKey, selectedMaterialIds, initialized, classroomId, assignment?.id, isDirty]);

  // Listen for storage events from the FormBuilderPage tab
  useEffect(() => {
    function handleStorage(e: StorageEvent) {
      if (e.key === getDraftKey(draftId.current)) {
        try {
          const updated = JSON.parse(e.newValue ?? "[]") as FormQuestion[];
          setFormQuestions(updated);
        } catch { }
      } else if (e.key === getAnswerKeyDraftKey(draftId.current)) {
        try {
          const updated = JSON.parse(e.newValue ?? "{}") as Record<string, string | string[]>;
          setAnswerKey(updated);
        } catch { }
      }
    }
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  function openFormBuilder() {
    const label = classroom
      ? `${classroom.name} · ${form.title || assignment?.title || "Edit Assignment"}`
      : "Edit Assignment";
    const url = `/form-builder?draft=${draftId.current}&label=${encodeURIComponent(label)}`;
    window.open(url, "_blank");
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      let fileUrl: string | null | undefined = undefined;
      if (attachedFile) {
        const fd = new FormData();
        fd.append("file", attachedFile);
        fd.append("folder", "classroom-assignments");
        const uploaded = await apiUpload("/api/upload", fd);
        fileUrl = uploaded.url as string;
      } else if (clearFile) {
        fileUrl = null;
      }
      return apiRequest(`/api/classrooms/${classroomId}/assignments/${assignment!.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          dueDate: form.dueDate,
          points: parseInt(form.points, 10),
          assignmentType,
          ...(fileUrl !== undefined ? { fileUrl } : {}),
          linkUrl: linkUrl.trim() || null,
          formSchema: formQuestions.length > 0 ? formQuestions : null,
          answerKey: formQuestions.length > 0 && Object.keys(answerKey).length > 0 ? answerKey : null,
          materialIds: selectedMaterialIds,
        }),
      });
    },
    onSuccess: () => {
      localStorage.removeItem(getDraftKey(draftId.current));
      localStorage.removeItem(getAnswerKeyDraftKey(draftId.current));
      // Delete server draft (fire-and-forget)
      if (assignment) {
        apiRequest(`/api/classrooms/${classroomId}/assignment-draft/${assignment.id}`, { method: "DELETE" }).catch(() => {});
      }
      queryClient.invalidateQueries({ queryKey: ["/api/classrooms", classroomId, "assignments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/classrooms", classroomId, "assignment-draft", assignment?.id] });
      toast({ title: "Assignment updated", type: "success" });
      navigate(`/classrooms/${classroomSlug}/assignments`);
    },
    onError: () => toast({ title: "Couldn't save — try again.", type: "error" }),
  });

  const didSave = saveMutation.isSuccess;
  const pointsNum = Number(form.points);
  const pointsValid = !!form.points && Number.isInteger(pointsNum) && pointsNum >= 1 && pointsNum <= 10000;
  const canSave = !!form.title.trim() && !!form.dueDate && pointsValid && !!assignment && !saveMutation.isPending;
  const backUrl = `/classrooms/${classroomSlug}/assignments`;
  const goBack = useGoBack(backUrl);

  function safeNavigate() {
    if (isDirty && !didSave) {
      pendingLeave.current = () => {
        localStorage.removeItem(getDraftKey(draftId.current));
        localStorage.removeItem(getAnswerKeyDraftKey(draftId.current));
        if (classroomId && assignment?.id) {
          apiRequest(`/api/classrooms/${classroomId}/assignment-draft/${assignment.id}`, { method: "DELETE" }).catch(() => {});
        }
        goBack();
      };
      setLeaveDialogOpen(true);
      return;
    }
    localStorage.removeItem(getDraftKey(draftId.current));
    localStorage.removeItem(getAnswerKeyDraftKey(draftId.current));
    goBack();
  }

  function handleFileDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files?.[0] ?? null;
    if (f) { setAttachedFile(f); setClearFile(false); }
  }

  const isLoading = classroomLoading || assignmentLoading || !initialized;

  if (isLoading && !assignment) {
    return (
      <div className="min-h-screen bg-background">
        <ModernSidebar />
        <div className="md:ml-[228px] flex items-center justify-center min-h-screen">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!classroom || (!assignmentLoading && !assignment)) {
    return (
      <div className="min-h-screen bg-background">
        <ModernSidebar />
        <div className="md:ml-[228px] flex flex-col items-center justify-center gap-3 min-h-screen">
          <p className="text-muted-foreground text-sm">{!classroom ? "Classroom not found." : "Assignment not found."}</p>
          <Button variant="outline" size="sm" onClick={goBack}>Back to Dashboard</Button>
        </div>
      </div>
    );
  }

  if (user?.role !== "teacher") { navigate(backUrl); return null; }

  const existingFileUrl = assignment?.fileUrl;
  const showExistingFile = !!existingFileUrl && !clearFile && !attachedFile;

  return (
    <>
    <div className="min-h-screen bg-background">
      <ModernSidebar />
      <div className="md:ml-[228px] flex flex-col">

        {/* ── Sticky top bar ── */}
        <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <button
            onClick={safeNavigate}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">{classroom.name}</span>
            <span className="sm:hidden">Back</span>
          </button>

          <div className="flex items-center gap-2.5">
            {saveMutation.isPending && (
              <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Loader2 className="h-3 w-3 animate-spin" /> Saving…
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={safeNavigate}
              disabled={saveMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!canSave}
              onClick={() => saveMutation.mutate()}
              className="h-8 px-5"
            >
              {saveMutation.isPending
                ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />Saving…</>
                : "Save Changes"}
            </Button>
          </div>
        </div>

        {/* ── Page body ── */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-8 pb-16">
            <Breadcrumb crumbs={[
              { label: "Classrooms", href: "/classrooms" },
              ...(classroom.gradeFolderId && classroom.gradeFolderName
                ? [{ label: classroom.gradeFolderName, href: `/classrooms/folders/${classroom.gradeFolderId}`, current: false as const }]
                : []),
              { label: classroom.name, href: `/classrooms/${classroomSlug}/feed`, current: false },
              { label: "Assignments & Tests", href: `/classrooms/${classroomSlug}/assignments`, current: false },
              { label: "Edit Assignment", current: true },
            ]} className="mb-6" />

            {/* Page heading */}
            <div className="mb-7">
              <h1 className="text-xl font-bold text-foreground">Edit Assignment</h1>
              <p className="text-sm text-muted-foreground mt-0.5">{classroom.name} · {classroom.subject}</p>
            </div>

            {showRestorePrompt && (
              <div className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5">
                <span className="text-sm text-amber-800 font-medium flex-1">You have unsaved changes from another session — restore them?</span>
                <button
                  type="button"
                  onClick={applyServerDraft}
                  className="text-xs font-semibold text-primary underline underline-offset-2 hover:opacity-80"
                >
                  Restore
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowRestorePrompt(false);
                    if (classroomId && assignment?.id) {
                      apiRequest(`/api/classrooms/${classroomId}/assignment-draft/${assignment.id}`, { method: "DELETE" }).catch(() => {});
                    }
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* ── Two-column layout ── */}
            <div className="flex flex-col lg:flex-row gap-6 items-start">

              {/* ── Left — main content ── */}
              <div className="flex-1 min-w-0 space-y-4">

                {/* Title + Instructions */}
                <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
                  <div className="space-y-1.5">
                    <Label htmlFor="title" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Title <span className="text-destructive">*</span>
                    </Label>
                    <textarea
                      ref={titleRef}
                      id="title"
                      value={form.title}
                      onChange={(e) => { setForm({ ...form, title: e.target.value }); autoGrowTitle(); }}
                      onInput={autoGrowTitle}
                      placeholder="Assignment title…"
                      rows={1}
                      autoFocus
                      className="w-full text-xl font-bold text-foreground placeholder:text-muted-foreground/30 bg-transparent border-none outline-none resize-none leading-snug overflow-hidden"
                      style={{ minHeight: "2rem" }}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="description" className="text-sm font-medium">
                      Instructions
                      <span className="text-muted-foreground font-normal ml-1.5 text-xs">(optional)</span>
                    </Label>
                    <Textarea
                      id="description"
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      placeholder="What should students do for this assignment?"
                      rows={5}
                      className="text-sm resize-none"
                    />
                  </div>
                </div>

                {/* Due date + points — mobile only */}
                <div className="rounded-2xl border border-border bg-card p-5 space-y-4 lg:hidden">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Details</p>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Type</Label>
                    <Select value={assignmentType} onValueChange={(v) => setAssignmentType(v as ItemType)}>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder="Select a type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="assignment">Assignment</SelectItem>
                        <SelectItem value="test">Test</SelectItem>
                        <SelectItem value="quiz">Quiz</SelectItem>
                        <SelectItem value="project">Project</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <MobileDetails form={form} setForm={setForm} formatDueDate={formatDueDate} />
                </div>

                {/* Classwork — mobile only */}
                {materials.length > 0 && (
                  <div className="rounded-2xl border border-border bg-card p-5 space-y-3 lg:hidden">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <BookOpen className="h-3.5 w-3.5" /> Classwork
                      <span className="normal-case font-normal tracking-normal ml-1 text-muted-foreground/60 text-xs">optional</span>
                    </p>
                    {selectedMaterialIds.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {selectedMaterialIds.map((mid) => {
                          const m = materials.find((x) => x.id === mid);
                          if (!m) return null;
                          return (
                            <span key={mid} className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary text-xs font-medium px-2.5 py-0.5">
                              {m.title}
                              <button type="button" onClick={() => setSelectedMaterialIds((prev) => prev.filter((id) => id !== mid))} className="ml-0.5 hover:text-primary/70">
                                <X className="h-3 w-3" />
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    )}
                    {materials.length > 3 && (
                      <input
                        type="search"
                        placeholder="Search classwork…"
                        value={materialSearch}
                        onChange={(e) => setMaterialSearch(e.target.value)}
                        className="w-full h-8 rounded-lg border border-input bg-background px-3 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                    )}
                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-0.5">
                      {materials
                        .filter((m) => m.title.toLowerCase().includes(materialSearch.toLowerCase()))
                        .map((m) => {
                          const selected = selectedMaterialIds.includes(m.id);
                          return (
                            <button key={m.id} type="button"
                              onClick={() => setSelectedMaterialIds((prev) => selected ? prev.filter((id) => id !== m.id) : [...prev, m.id])}
                              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left transition-all text-sm ${selected ? "border-primary bg-primary/5 text-foreground" : "border-border bg-transparent text-muted-foreground hover:text-foreground hover:border-primary/40"}`}
                            >
                              <span className={`shrink-0 h-4 w-4 rounded border flex items-center justify-center transition-colors ${selected ? "bg-primary border-primary" : "border-border"}`}>
                                {selected && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                              </span>
                              <span className="truncate">{m.title}</span>
                            </button>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* ── Link card ── */}
                <div className="rounded-2xl border border-border bg-card p-6 space-y-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                      <Link2 className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">Link</p>
                      <p className="text-xs text-muted-foreground">Optional — a URL students can open alongside this assignment</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="url"
                      value={linkUrl}
                      onChange={(e) => setLinkUrl(e.target.value)}
                      placeholder="https://…"
                      className="text-sm h-9"
                    />
                    {linkUrl.trim() && (
                      <button
                        type="button"
                        onClick={() => setLinkUrl("")}
                        className="shrink-0 h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  {linkUrl.trim() && (
                    <a
                      href={linkUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Preview link
                    </a>
                  )}
                </div>

                {/* ── Form Questions card ── */}
                <div className="rounded-2xl border border-border bg-card">

                  {/* Card header */}
                  <div className="px-6 py-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                        <ClipboardList className="h-4 w-4 text-emerald-700" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground">Form Questions</p>
                        <p className="text-xs text-muted-foreground">
                          {formQuestions.length > 0
                            ? `${formQuestions.length} question${formQuestions.length === 1 ? "" : "s"}`
                            : "Optional — students answer directly in LyraPrep"}
                        </p>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1.5 shrink-0"
                      onClick={openFormBuilder}
                    >
                      {formQuestions.length > 0
                        ? <><ClipboardList className="h-3.5 w-3.5" />Edit Form<ExternalLink className="h-3 w-3 ml-0.5 opacity-60" /></>
                        : <><Plus className="h-3.5 w-3.5" />Add Form<ExternalLink className="h-3 w-3 ml-0.5 opacity-60" /></>}
                    </Button>
                  </div>

                  {/* Question list */}
                  {formQuestions.length > 0 && (
                    <div className="border-t border-border px-6 py-4 space-y-1.5">
                      {formQuestions.map((q, i) => (
                        <div key={q.id} className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-muted/40">
                          <span className="text-[10px] font-semibold text-muted-foreground w-4 shrink-0 tabular-nums">
                            {i + 1}
                          </span>
                          <span className="text-xs text-foreground flex-1 truncate">
                            {q.label || <span className="italic text-muted-foreground">Untitled question</span>}
                          </span>
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0 ${
                            typePill[q.type] ?? "bg-muted text-muted-foreground"
                          }`}>
                            {typeLabel[q.type] ?? q.type}
                          </span>
                        </div>
                      ))}
                      <div className="flex items-center justify-between pt-0.5">
                        <button
                          type="button"
                          onClick={openFormBuilder}
                          className="text-xs text-primary hover:underline"
                        >
                          Edit questions
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormQuestions([])}
                          className="text-xs text-red-500 hover:underline"
                        >
                          Remove form
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* ── Right sidebar — desktop only ── */}
              <div className="hidden lg:flex w-72 xl:w-80 shrink-0 flex-col gap-4 sticky top-20 self-start">

                {/* Due date + points */}
                <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Details</p>

                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Type</Label>
                    <Select value={assignmentType} onValueChange={(v) => setAssignmentType(v as ItemType)}>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder="Select a type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="assignment">Assignment</SelectItem>
                        <SelectItem value="test">Test</SelectItem>
                        <SelectItem value="quiz">Quiz</SelectItem>
                        <SelectItem value="project">Project</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="dueDate" className="text-sm font-medium flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      Due Date <span className="text-destructive text-xs">*</span>
                    </Label>
                    <input
                      id="dueDate"
                      type="date"
                      value={form.dueDate}
                      onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    />
                    {form.dueDate && (
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {formatDueDate(form.dueDate)}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="points" className="text-sm font-medium flex items-center gap-1.5">
                      <Trophy className="h-3.5 w-3.5 text-muted-foreground" />
                      Points
                    </Label>
                    <Input
                      id="points"
                      type="number"
                      min={1}
                      value={form.points}
                      onChange={(e) => setForm({ ...form, points: e.target.value })}
                      className="h-9 text-sm"
                    />
                  </div>
                </div>

                {/* Attachment */}
                <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Attachment
                    <span className="normal-case font-normal tracking-normal ml-1.5 text-muted-foreground/60 text-xs">optional</span>
                  </p>

                  {showExistingFile && (
                    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-border bg-muted/30">
                      <Paperclip className="h-4 w-4 text-primary shrink-0" />
                      <a
                        href={existingFileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline flex-1 truncate"
                      >
                        Current attachment
                      </a>
                      <button
                        type="button"
                        onClick={() => setClearFile(true)}
                        className="shrink-0 h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-muted transition-colors"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}

                  {clearFile && !attachedFile && (
                    <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                      <span>Attachment will be removed on save.</span>
                      <button
                        type="button"
                        onClick={() => setClearFile(false)}
                        className="text-primary hover:underline ml-2"
                      >
                        Undo
                      </button>
                    </div>
                  )}

                  {attachedFile ? (
                    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-border bg-muted/30">
                      <Paperclip className="h-4 w-4 text-primary shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{attachedFile.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(attachedFile.size / (1024 * 1024)).toFixed(1)} MB
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAttachedFile(null)}
                        className="shrink-0 h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <label
                      className={`flex flex-col items-center gap-2 px-4 py-5 rounded-xl border-2 border-dashed cursor-pointer transition-all text-center ${
                        isDragging
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/40 hover:bg-muted/30"
                      }`}
                      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={handleFileDrop}
                    >
                      <Paperclip className={`h-5 w-5 ${isDragging ? "text-primary" : "text-muted-foreground"}`} />
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {showExistingFile ? "Replace file or " : "Drop a file or "}
                          <span className="text-primary">browse</span>
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">PDF, image, Word, or text</p>
                      </div>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*,.pdf,.doc,.docx,.txt"
                        onChange={(e) => { setAttachedFile(e.target.files?.[0] ?? null); setClearFile(false); }}
                      />
                    </label>
                  )}
                </div>

                {/* Classwork */}
                {materials.length > 0 && (
                  <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <BookOpen className="h-3.5 w-3.5" /> Classwork
                      <span className="normal-case font-normal tracking-normal ml-1 text-muted-foreground/60 text-xs">optional</span>
                    </p>
                    {selectedMaterialIds.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {selectedMaterialIds.map((mid) => {
                          const m = materials.find((x) => x.id === mid);
                          if (!m) return null;
                          return (
                            <span key={mid} className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary text-xs font-medium px-2.5 py-0.5">
                              {m.title}
                              <button type="button" onClick={() => setSelectedMaterialIds((prev) => prev.filter((id) => id !== mid))} className="ml-0.5 hover:text-primary/70">
                                <X className="h-3 w-3" />
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    )}
                    {materials.length > 3 && (
                      <input
                        type="search"
                        placeholder="Search classwork…"
                        value={materialSearch}
                        onChange={(e) => setMaterialSearch(e.target.value)}
                        className="w-full h-8 rounded-lg border border-input bg-background px-3 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                    )}
                    <div className="space-y-1.5 max-h-52 overflow-y-auto pr-0.5">
                      {materials
                        .filter((m) => m.title.toLowerCase().includes(materialSearch.toLowerCase()))
                        .map((m) => {
                          const selected = selectedMaterialIds.includes(m.id);
                          return (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() =>
                                setSelectedMaterialIds((prev) =>
                                  selected ? prev.filter((id) => id !== m.id) : [...prev, m.id]
                                )
                              }
                              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left transition-all text-sm ${
                                selected
                                  ? "border-primary bg-primary/5 text-foreground"
                                  : "border-border bg-transparent text-muted-foreground hover:text-foreground hover:border-primary/40"
                              }`}
                            >
                              <span className={`shrink-0 h-4 w-4 rounded border flex items-center justify-center transition-colors ${selected ? "bg-primary border-primary" : "border-border"}`}>
                                {selected && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                              </span>
                              <span className="truncate">{m.title}</span>
                            </button>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* Validation nudges */}
                {!form.dueDate && (
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
                    A due date is required to save the assignment.
                  </p>
                )}
                {!pointsValid && (
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
                    Points must be a number between 1 and 10,000.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <ConfirmDialog
      open={leaveDialogOpen}
      title="Leave without saving?"
      description="Your changes will be lost."
      confirmLabel="Leave"
      cancelLabel="Keep editing"
      destructive={false}
      onConfirm={() => { setLeaveDialogOpen(false); pendingLeave.current?.(); }}
      onCancel={() => setLeaveDialogOpen(false)}
    />
    </>
  );
}

function MobileDetails({
  form,
  setForm,
  formatDueDate,
}: {
  form: { dueDate: string; points: string };
  setForm: (f: any) => void;
  formatDueDate: (s: string) => string;
}) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-1.5">
        <Label htmlFor="dueDateMobile" className="text-sm font-medium flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
          Due Date <span className="text-destructive text-xs">*</span>
        </Label>
        <input
          id="dueDateMobile"
          type="date"
          value={form.dueDate}
          onChange={(e) => setForm((f: any) => ({ ...f, dueDate: e.target.value }))}
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        {form.dueDate && (
          <p className="text-xs text-muted-foreground">{formatDueDate(form.dueDate)}</p>
        )}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="pointsMobile" className="text-sm font-medium flex items-center gap-1.5">
          <Trophy className="h-3.5 w-3.5 text-muted-foreground" />
          Points
        </Label>
        <Input
          id="pointsMobile"
          type="number"
          min={1}
          value={form.points}
          onChange={(e) => setForm((f: any) => ({ ...f, points: e.target.value }))}
          className="h-9 text-sm"
        />
      </div>
    </div>
  );
}

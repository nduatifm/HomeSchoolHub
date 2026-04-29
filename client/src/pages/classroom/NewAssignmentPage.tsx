import { useState, useEffect, useRef } from "react";
import { useRoute, useLocation } from "wouter";
import { useGoBack } from "@/hooks/useGoBack";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
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
import type { Classroom, ClassroomMaterial, FormQuestion, ItemType } from "@shared/schema";

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

export default function NewAssignmentPage() {
  const [, params] = useRoute("/classrooms/:slug/assignments/new");
  const [, navigate] = useLocation();
  const { user } = useAuth();

  const classroomSlug = params?.slug ?? "";

  const [form, setForm] = useState({ title: "", description: "", dueDate: "", points: "100" });
  const [assignmentType, setAssignmentType] = useState<ItemType | "">("");
  const [linkUrl, setLinkUrl] = useState("");
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [selectedMaterialIds, setSelectedMaterialIds] = useState<number[]>([]);
  const [materialSearch, setMaterialSearch] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [formQuestions, setFormQuestions] = useState<FormQuestion[]>([]);
  const [answerKey, setAnswerKey] = useState<Record<string, string | string[]>>({});
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const draftId = useRef(Math.random().toString(36).slice(2, 14));
  const pendingLeave = useRef<(() => void) | null>(null);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);

  const isDirty = !!(form.title.trim() || form.description.trim() || form.dueDate || attachedFile || formQuestions.length > 0 || linkUrl.trim());

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

  // Write formQuestions to localStorage whenever they change so FormBuilderPage can read them
  useEffect(() => {
    localStorage.setItem(getDraftKey(draftId.current), JSON.stringify(formQuestions));
  }, [formQuestions]);

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
    const label = classroom ? `${classroom.name} · ${form.title || "New Assignment"}` : "New Assignment";
    const url = `/form-builder?draft=${draftId.current}&label=${encodeURIComponent(label)}`;
    window.open(url, "_blank");
  }

  const createMutation = useMutation({
    mutationFn: () => {
      const fd = new FormData();
      fd.append("title", form.title);
      fd.append("description", form.description);
      fd.append("dueDate", form.dueDate);
      fd.append("points", form.points);
      fd.append("assignmentType", assignmentType);
      if (linkUrl.trim()) fd.append("linkUrl", linkUrl.trim());
      if (attachedFile) fd.append("file", attachedFile);
      if (formQuestions.length > 0) {
        fd.append("formSchema", JSON.stringify(formQuestions));
      }
      if (formQuestions.length > 0 && Object.keys(answerKey).length > 0) {
        fd.append("answerKey", JSON.stringify(answerKey));
      }
      if (selectedMaterialIds.length > 0) {
        fd.append("materialIds", JSON.stringify(selectedMaterialIds));
      }
      const token = localStorage.getItem("sessionId");
      return fetch(`/api/classrooms/${classroomId}/assignments/with-file`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      }).then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error ?? "Failed to create assignment");
        return data;
      });
    },
    onSuccess: () => {
      localStorage.removeItem(getDraftKey(draftId.current));
      localStorage.removeItem(getAnswerKeyDraftKey(draftId.current));
      queryClient.invalidateQueries({ queryKey: ["/api/classrooms", classroomId, "assignments"] });
      toast({ title: "Assignment created", type: "success" });
      navigate(`/classrooms/${classroomSlug}/assignments`);
    },
    onError: () => toast({ title: "Couldn't save — try again.", type: "error" }),
  });

  const didSubmit = createMutation.isSuccess;
  const pointsNum = Number(form.points);
  const pointsValid = !!form.points && Number.isInteger(pointsNum) && pointsNum >= 1 && pointsNum <= 10000;
  const canSave = !!form.title.trim() && !!form.dueDate && pointsValid && !!assignmentType && !createMutation.isPending;
  const backUrl = `/classrooms/${classroomSlug}/assignments`;
  const goBack = useGoBack(backUrl);

  function safeNavigate() {
    if (isDirty && !didSubmit) {
      pendingLeave.current = () => {
        localStorage.removeItem(getDraftKey(draftId.current));
        localStorage.removeItem(getAnswerKeyDraftKey(draftId.current));
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
    if (f) setAttachedFile(f);
  }

  if (classroomLoading) {
    return (
      <div className="min-h-screen bg-background">
        <ModernSidebar />
        <div className="md:ml-[228px] flex items-center justify-center min-h-screen">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!classroom) {
    return (
      <div className="min-h-screen bg-background">
        <ModernSidebar />
        <div className="md:ml-[228px] flex flex-col items-center justify-center gap-3 min-h-screen">
          <p className="text-muted-foreground text-sm">Classroom not found.</p>
          <Button variant="outline" size="sm" onClick={goBack}>Back to Dashboard</Button>
        </div>
      </div>
    );
  }

  if (user?.role !== "teacher") { navigate(backUrl); return null; }

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
            {createMutation.isPending && (
              <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Loader2 className="h-3 w-3 animate-spin" /> Creating…
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={safeNavigate}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!canSave}
              onClick={() => createMutation.mutate()}
              className="h-8 px-5"
            >
              {createMutation.isPending
                ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />Creating…</>
                : "Create Assignment"}
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
              { label: "New Assignment", current: true },
            ]} className="mb-6" />

            {/* Page heading */}
            <div className="mb-7">
              <h1 className="text-xl font-bold text-foreground">New Assignment</h1>
              <p className="text-sm text-muted-foreground mt-0.5">{classroom.name} · {classroom.subject}</p>
            </div>

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
                    <Label className="text-sm font-medium">Type <span className="text-destructive text-xs">*</span></Label>
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
                    {!assignmentType && !!form.title.trim() && (
                      <p className="text-xs text-destructive">A type is required to save this assignment.</p>
                    )}
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
                            ? `${formQuestions.length} question${formQuestions.length === 1 ? "" : "s"} added`
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
                      <button
                        type="button"
                        onClick={openFormBuilder}
                        className="text-xs text-primary hover:underline pt-0.5"
                      >
                        Edit questions
                      </button>
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
                    <Label className="text-sm font-medium">Type <span className="text-destructive text-xs">*</span></Label>
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
                    {!assignmentType && !!form.title.trim() && (
                      <p className="text-xs text-destructive">A type is required to save this assignment.</p>
                    )}
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
                          Drop a file or <span className="text-primary">browse</span>
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">PDF, image, Word, or text</p>
                      </div>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*,.pdf,.doc,.docx,.txt"
                        onChange={(e) => setAttachedFile(e.target.files?.[0] ?? null)}
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
                    A due date is required to create the assignment.
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

// ── Mobile details component ──────────────────────────────────────────────────

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

import { useState, useEffect, useRef } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  ChevronLeft,
  Paperclip,
  ClipboardList,
  X,
  Plus,
  Calendar,
  Trophy,
} from "lucide-react";
import ModernSidebar from "@/components/ModernSidebar";
import { toast } from "@/hooks/use-toast";
import type { Classroom, FormQuestion } from "@shared/schema";
import FormBuilder from "@/components/FormBuilder";

export default function NewAssignmentPage() {
  const [, params] = useRoute("/classrooms/:slug/assignments/new");
  const [, navigate] = useLocation();
  const { user } = useAuth();

  const classroomSlug = params?.slug ?? "";

  const [form, setForm] = useState({ title: "", description: "", dueDate: "", points: "100" });
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [formQuestions, setFormQuestions] = useState<FormQuestion[]>([]);
  const [showFormBuilder, setShowFormBuilder] = useState(false);
  const titleRef = useRef<HTMLTextAreaElement>(null);

  // Track whether the teacher has entered anything worth warning about
  const isDirty = !!(form.title.trim() || form.description.trim() || form.dueDate || attachedFile || formQuestions.length > 0);
  const didSubmit = createMutation.isSuccess;

  // Warn on browser/tab close
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty && !didSubmit) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty, didSubmit]);

  // Auto-grow title textarea
  function autoGrowTitle() {
    const el = titleRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }

  // Friendly due date display
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

  // Warn on in-app navigation (Cancel / back)
  function safeNavigate(url: string) {
    if (isDirty && !didSubmit) {
      if (!window.confirm("You have unsaved changes. Leave without creating the assignment?")) return;
    }
    navigate(url);
  }

  // Question type labels for preview
  const typeLabel: Record<string, string> = {
    short: "Short answer",
    paragraph: "Paragraph",
    multiple_choice: "Multiple choice",
    checkbox: "Checkboxes",
    true_false: "True / False",
  };

  const { data: classroom, isLoading: classroomLoading } = useQuery<Classroom>({
    queryKey: ["/api/classrooms", classroomSlug],
    queryFn: () => apiRequest(`/api/classrooms/${classroomSlug}`),
    enabled: !!classroomSlug,
  });

  const classroomId = classroom?.id ?? 0;

  const createMutation = useMutation({
    mutationFn: () => {
      const fd = new FormData();
      fd.append("title", form.title);
      fd.append("description", form.description);
      fd.append("dueDate", form.dueDate);
      fd.append("points", form.points);
      if (attachedFile) fd.append("file", attachedFile);
      if (showFormBuilder && formQuestions.length > 0) {
        fd.append("formSchema", JSON.stringify(formQuestions));
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
      queryClient.invalidateQueries({ queryKey: ["/api/classrooms", classroomId, "assignments"] });
      toast({ title: "Assignment created", type: "success" });
      navigate(`/classrooms/${classroomSlug}`);
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, type: "error" }),
  });

  const canSave = !!form.title.trim() && !!form.dueDate && !createMutation.isPending;
  const backUrl = `/classrooms/${classroomSlug}`;

  function handleFileDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files?.[0] ?? null;
    if (f) setAttachedFile(f);
  }

  if (classroomLoading) {
    return (
      <div className="flex min-h-screen">
        <ModernSidebar />
        <div className="flex-1 md:ml-[228px] flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!classroom) {
    return (
      <div className="flex min-h-screen">
        <ModernSidebar />
        <div className="flex-1 md:ml-[228px] flex flex-col items-center justify-center gap-3">
          <p className="text-muted-foreground text-sm">Classroom not found.</p>
          <Button variant="outline" size="sm" onClick={() => navigate("/dashboard")}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (user?.role !== "teacher") {
    navigate(backUrl);
    return null;
  }

  return (
    <div className="flex min-h-screen bg-background">
      <ModernSidebar />
      <div className="flex-1 md:ml-[228px] flex flex-col">

        {/* ── Sticky top bar ── */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <button
            onClick={() => safeNavigate(backUrl)}
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
              onClick={() => safeNavigate(backUrl)}
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
              Create Assignment
            </Button>
          </div>
        </div>

        {/* ── Page body ── */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-8 pb-16">

            {/* Page title */}
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-foreground">New Assignment</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {classroom.name} · {classroom.subject}
              </p>
            </div>

            {/* ── Two-column layout ── */}
            <div className="flex flex-col lg:flex-row gap-6 items-start">

              {/* Left — main content */}
              <div className="flex-1 min-w-0 space-y-5">

                {/* Title + Instructions card */}
                <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
                  <div className="space-y-1">
                    <label htmlFor="title" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Title <span className="text-destructive">*</span>
                    </label>
                    <textarea
                      ref={titleRef}
                      id="title"
                      value={form.title}
                      onChange={(e) => { setForm({ ...form, title: e.target.value }); autoGrowTitle(); }}
                      onInput={autoGrowTitle}
                      placeholder="Assignment title…"
                      rows={1}
                      autoFocus
                      className="w-full text-2xl font-bold text-foreground placeholder:text-muted-foreground/30 bg-transparent border-none outline-none resize-none leading-snug overflow-hidden"
                      style={{ minHeight: "2.25rem" }}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="description" className="text-sm font-medium">
                      Instructions
                      <span className="text-muted-foreground font-normal ml-1.5">optional</span>
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

                {/* Form builder card */}
                <div className="rounded-2xl border border-border bg-card overflow-hidden">
                  {/* Header — always visible */}
                  <div className="px-6 py-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                        <ClipboardList className="h-4 w-4 text-emerald-700" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground">Form Questions</p>
                        <p className="text-xs text-muted-foreground">
                          {showFormBuilder || formQuestions.length === 0
                            ? "Optional — students answer directly in LyraPrep"
                            : `${formQuestions.length} question${formQuestions.length === 1 ? "" : "s"}`}
                        </p>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant={showFormBuilder ? "destructive" : "outline"}
                      size="sm"
                      className="h-8 gap-1.5 shrink-0"
                      onClick={() => {
                        if (!showFormBuilder && formQuestions.length === 0) {
                          setFormQuestions([{
                            id: Math.random().toString(36).slice(2, 10),
                            type: "short",
                            label: "",
                            required: false,
                          }]);
                        }
                        setShowFormBuilder(!showFormBuilder);
                      }}
                    >
                      {showFormBuilder ? (
                        <><X className="h-3.5 w-3.5" /> Remove</>
                      ) : (
                        <><Plus className="h-3.5 w-3.5" /> Add Form</>
                      )}
                    </Button>
                  </div>

                  {/* Collapsed preview — show question titles when builder is hidden */}
                  {!showFormBuilder && formQuestions.length > 0 && (
                    <div className="px-6 pb-4 space-y-1.5">
                      {formQuestions.map((q, i) => (
                        <div key={q.id} className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-muted/40">
                          <span className="text-[10px] font-semibold text-muted-foreground w-4 shrink-0 tabular-nums">
                            {i + 1}
                          </span>
                          <span className="text-xs text-foreground flex-1 truncate">
                            {q.label || <span className="italic text-muted-foreground">Untitled question</span>}
                          </span>
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0 ${
                            q.type === "short" ? "bg-sky-100 text-sky-700" :
                            q.type === "paragraph" ? "bg-violet-100 text-violet-700" :
                            q.type === "multiple_choice" ? "bg-emerald-100 text-emerald-700" :
                            q.type === "checkbox" ? "bg-amber-100 text-amber-700" :
                            "bg-pink-100 text-pink-700"
                          }`}>
                            {typeLabel[q.type] ?? q.type}
                          </span>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => setShowFormBuilder(true)}
                        className="text-xs text-primary hover:underline pt-0.5"
                      >
                        Edit questions
                      </button>
                    </div>
                  )}

                  {/* Builder — conditionally shown */}
                  {showFormBuilder && (
                    <div className="border-t border-border px-6 py-5 bg-muted/20">
                      <FormBuilder questions={formQuestions} onChange={setFormQuestions} />
                    </div>
                  )}
                </div>
              </div>

              {/* Right — metadata sidebar */}
              <div className="w-full lg:w-72 xl:w-80 shrink-0 space-y-4">

                {/* Due date + points */}
                <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Details
                  </p>

                  <div className="space-y-1.5">
                    <Label htmlFor="dueDate" className="text-sm font-medium flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      Due Date <span className="text-destructive">*</span>
                    </Label>
                    {/* Friendly date display — clicking opens the native date picker */}
                    <label
                      htmlFor="dueDate"
                      className={`flex items-center gap-2 h-9 px-3 rounded-lg border cursor-pointer transition-colors ${
                        form.dueDate
                          ? "border-border bg-card hover:border-primary/40"
                          : "border-dashed border-border hover:border-primary/40 hover:bg-muted/20"
                      }`}
                    >
                      {form.dueDate ? (
                        <span className="text-sm text-foreground flex-1 leading-none">
                          {formatDueDate(form.dueDate)}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground flex-1">Pick a date…</span>
                      )}
                      {form.dueDate && (
                        <button
                          type="button"
                          onClick={(e) => { e.preventDefault(); setForm({ ...form, dueDate: "" }); }}
                          className="shrink-0 h-5 w-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </label>
                    <input
                      id="dueDate"
                      type="date"
                      value={form.dueDate}
                      onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                      className="sr-only"
                    />
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
                    <span className="normal-case font-normal tracking-normal ml-1.5 text-muted-foreground/60">optional</span>
                  </p>

                  {attachedFile ? (
                    /* File selected — pill display */
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
                    /* Drop zone */
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
                        <p className="text-xs text-muted-foreground mt-0.5">
                          PDF, image, Word, or text
                        </p>
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

                {/* Validation hint */}
                {!form.dueDate && (
                  <p className="text-xs text-muted-foreground px-1">
                    A due date is required before you can create the assignment.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
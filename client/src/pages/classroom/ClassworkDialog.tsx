import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Loader2, Link2, Upload, Paperclip, X, BookOpen, Plus } from "lucide-react";
import type { ClassroomAssignment, ClassroomMaterial } from "@shared/schema";

type DialogMode = "create" | "edit";

export default function ClassworkDialog({
  mode, open, onOpenChange, initial, classroomId, assignments, isArchived, onSuccess,
}: {
  mode: DialogMode; open: boolean; onOpenChange: (v: boolean) => void;
  initial?: ClassroomMaterial; classroomId: number;
  assignments: ClassroomAssignment[]; isArchived: boolean; onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    title: initial?.title ?? "",
    description: initial?.description ?? "",
    url: initial?.url ?? "",
    assignmentId: initial?.assignmentId ? String(initial.assignmentId) : "",
  });
  const [showUrl, setShowUrl] = useState(!!(initial?.url));
  const [file, setFile] = useState<File | null>(null);
  const [showFile, setShowFile] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      setFile(null);
      setIsDragging(false);
      setShowUrl(!!(initial?.url));
      setShowFile(false);
      setForm({
        title: initial?.title ?? "",
        description: initial?.description ?? "",
        url: initial?.url ?? "",
        assignmentId: initial?.assignmentId ? String(initial.assignmentId) : "",
      });
    }
  }, [open]);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["/api/classrooms", classroomId, "materials"] });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem("sessionId");
      const method = mode === "create" ? "POST" : "PATCH";

      // File present — use multipart endpoint (also accepts url + assignmentId)
      if (file) {
        const endpoint = mode === "create"
          ? `/api/classrooms/${classroomId}/materials/with-file`
          : `/api/classrooms/${classroomId}/materials/${initial!.id}/with-file`;
        const fd = new FormData();
        fd.append("file", file);
        fd.append("title", form.title);
        fd.append("description", form.description);
        if (showUrl && form.url) fd.append("url", form.url);
        if (form.assignmentId) fd.append("assignmentId", form.assignmentId);
        return fetch(endpoint, {
          method,
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: fd,
        }).then(async (r) => {
          const d = await r.json();
          if (!r.ok) throw new Error(d.error ?? "Upload failed");
          return d;
        });
      }

      // JSON path — url only or neither
      const endpoint = mode === "create"
        ? `/api/classrooms/${classroomId}/materials`
        : `/api/classrooms/${classroomId}/materials/${initial!.id}`;
      return apiRequest(endpoint, {
        method,
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          url: showUrl && form.url ? form.url : null,
          assignmentId: form.assignmentId ? Number(form.assignmentId) : null,
        }),
      });
    },
    onSuccess: () => {
      onOpenChange(false);
      invalidate();
      toast({ title: mode === "create" ? "Classwork added" : "Classwork updated", type: "success" });
      onSuccess();
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, type: "error" }),
  });

  function handleFileDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files?.[0] ?? null;
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum file size is 10 MB.", type: "error" });
      return;
    }
    setFile(f);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum file size is 10 MB.", type: "error" });
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    setFile(f);
  }

  const canSubmit = form.title.trim().length > 0 && !submitMutation.isPending && !isArchived;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 gap-0 flex flex-col max-h-[90vh]">

        {/* Header */}
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-border shrink-0">
          <DialogTitle className="text-base font-semibold">
            {mode === "create" ? "Add Classwork" : "Edit Classwork"}
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            {mode === "create"
              ? "Add a resource, file, or link for your students."
              : "Update the details of this classwork item."}
          </p>
        </DialogHeader>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* ── Basic info ── */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Reading Chapter 5"
                className="h-10"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">
                Description
                <span className="text-xs text-muted-foreground font-normal ml-1.5">optional</span>
              </Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
                placeholder="Add instructions or notes for students…"
                className="resize-none text-sm"
              />
            </div>
          </div>

          {/* ── Attachments ── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">
                Attachments
                <span className="text-xs text-muted-foreground font-normal ml-1.5">optional</span>
              </Label>
              <div className="flex items-center gap-1.5">
                {!showUrl && (
                  <button
                    type="button"
                    onClick={() => setShowUrl(true)}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground border border-border rounded-lg px-2.5 py-1 hover:bg-muted/50 transition-colors"
                  >
                    <Plus className="h-3 w-3" />
                    <Link2 className="h-3 w-3 ml-0.5" />
                    URL
                  </button>
                )}
                {!showFile && (
                  <button
                    type="button"
                    onClick={() => setShowFile(true)}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground border border-border rounded-lg px-2.5 py-1 hover:bg-muted/50 transition-colors"
                  >
                    <Plus className="h-3 w-3" />
                    <Upload className="h-3 w-3 ml-0.5" />
                    File
                  </button>
                )}
              </div>
            </div>

            {!showUrl && !showFile && (
              <p className="text-xs text-muted-foreground">
                Use the buttons above to attach a URL, a file, or both.
              </p>
            )}

            {/* URL field */}
            {showUrl && (
              <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <Link2 className="h-3.5 w-3.5 text-primary" />
                    URL link
                  </div>
                  <button
                    type="button"
                    onClick={() => { setShowUrl(false); setForm({ ...form, url: "" }); }}
                    className="h-6 w-6 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <Input
                  type="url"
                  placeholder="https://…"
                  value={form.url}
                  onChange={(e) => setForm({ ...form, url: e.target.value })}
                  className="h-9 font-mono text-sm bg-background"
                />
              </div>
            )}

            {/* File field */}
            {showFile && (
              <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <Upload className="h-3.5 w-3.5 text-primary" />
                    File upload
                  </div>
                  <button
                    type="button"
                    onClick={() => { setShowFile(false); setFile(null); if (fileRef.current) fileRef.current.value = ""; }}
                    className="h-6 w-6 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                <input ref={fileRef} type="file" className="hidden" onChange={handleFileInput} />

                {file ? (
                  <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border bg-background">
                    <Paperclip className="h-4 w-4 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                      <p className="text-xs text-muted-foreground">{(file.size / (1024 * 1024)).toFixed(1)} MB</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = ""; }}
                      className="shrink-0 h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleFileDrop}
                    className={`w-full flex flex-col items-center gap-2 px-4 py-5 rounded-lg border-2 border-dashed transition-all text-center ${
                      isDragging
                        ? "border-primary bg-primary/5 scale-[1.01]"
                        : "border-border hover:border-primary/40 hover:bg-background"
                    }`}
                  >
                    <Upload className={`h-5 w-5 ${isDragging ? "text-primary" : "text-muted-foreground"}`} />
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Drop a file or <span className="text-primary">browse</span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">Max 10 MB</p>
                    </div>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* ── Link to assignment ── */}
          {assignments.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">
                Link to assignment
                <span className="text-xs text-muted-foreground font-normal ml-1.5">optional</span>
              </Label>
              <Select
                value={form.assignmentId || "none"}
                onValueChange={(v) => setForm({ ...form, assignmentId: v === "none" ? "" : v })}
              >
                <SelectTrigger className="h-10 gap-2">
                  <BookOpen className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <SelectValue placeholder="No linked assignment" />
                </SelectTrigger>
                {/* side="top" opens upward so footer never clips it */}
                <SelectContent side="top" sideOffset={6}>
                  <SelectItem value="none">No linked assignment</SelectItem>
                  {assignments.map((a) => (
                    <SelectItem key={a.id} value={String(a.id)}>{a.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

        </div>

        {/* Footer — shrink-0 keeps it anchored */}
        <div className="shrink-0 px-6 py-4 border-t border-border bg-muted/20 flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={!canSubmit}
            onClick={() => submitMutation.mutate()}
            className="gap-1.5 min-w-[120px]"
          >
            {submitMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {mode === "create" ? "Add Classwork" : "Save Changes"}
          </Button>
        </div>

      </DialogContent>
    </Dialog>
  );
}
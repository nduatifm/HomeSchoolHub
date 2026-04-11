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
import { Loader2, Link2, FileUp, Paperclip } from "lucide-react";
import type { ClassroomAssignment, ClassroomMaterial } from "@shared/schema";

type AttachType = "url" | "file";
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
    attachType: (initial?.url ? "url" : "file") as AttachType,
    url: initial?.url ?? "",
    assignmentId: initial?.assignmentId ? String(initial.assignmentId) : "",
  });
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      setFile(null);
      setForm({
        title: initial?.title ?? "",
        description: initial?.description ?? "",
        attachType: (initial?.url ? "url" : "file") as AttachType,
        url: initial?.url ?? "",
        assignmentId: initial?.assignmentId ? String(initial.assignmentId) : "",
      });
    }
  }, [open]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["/api/classrooms", classroomId, "materials"] });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const hasFile = form.attachType === "file" && file;
      const token = localStorage.getItem("sessionId");
      const method = mode === "create" ? "POST" : "PATCH";
      if (hasFile) {
        const endpoint = mode === "create"
          ? `/api/classrooms/${classroomId}/materials/with-file`
          : `/api/classrooms/${classroomId}/materials/${initial!.id}/with-file`;
        const fd = new FormData();
        fd.append("file", file!);
        fd.append("title", form.title);
        fd.append("description", form.description);
        if (form.assignmentId) fd.append("assignmentId", form.assignmentId);
        return fetch(endpoint, { method, headers: token ? { Authorization: `Bearer ${token}` } : {}, body: fd })
          .then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error ?? "Upload failed"); return d; });
      }
      const endpoint = mode === "create"
        ? `/api/classrooms/${classroomId}/materials`
        : `/api/classrooms/${classroomId}/materials/${initial!.id}`;
      return apiRequest(endpoint, { method, body: JSON.stringify({ title: form.title, description: form.description, url: form.url || null, assignmentId: form.assignmentId ? Number(form.assignmentId) : null }) });
    },
    onSuccess: () => { onOpenChange(false); invalidate(); toast({ title: mode === "create" ? "Classwork added" : "Classwork updated", type: "success" }); onSuccess(); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, type: "error" }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{mode === "create" ? "Add Classwork" : "Edit Classwork"}</DialogTitle></DialogHeader>
        <div className="space-y-4 pt-1">
          <div><Label>Title <span className="text-destructive">*</span></Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Reading Chapter 5" /></div>
          <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} placeholder="Optional notes for students…" /></div>
          <div>
            <Label>Attachment <span className="text-xs text-muted-foreground ml-1">(optional)</span></Label>
            <div className="flex gap-2 mt-1 mb-2">
              <Button type="button" size="sm" variant={form.attachType === "url" ? "default" : "outline"} className="gap-1.5"
                onClick={() => { setFile(null); setForm({ ...form, attachType: "url" }); }}>
                <Link2 className="h-3.5 w-3.5" />URL
              </Button>
              <Button type="button" size="sm" variant={form.attachType === "file" ? "default" : "outline"} className="gap-1.5"
                onClick={() => setForm({ ...form, attachType: "file", url: "" })}>
                <FileUp className="h-3.5 w-3.5" />Upload file
              </Button>
            </div>
            {form.attachType === "url"
              ? <Input type="url" placeholder="https://…" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
              : (
                <>
                  <input ref={fileRef} type="file" className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0] ?? null;
                      if (f && f.size > 10 * 1024 * 1024) { toast({ title: "File too large", description: "Maximum file size is 10 MB.", type: "error" }); if (fileRef.current) fileRef.current.value = ""; return; }
                      setFile(f);
                    }} />
                  <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => fileRef.current?.click()}>
                    <Paperclip className="h-3.5 w-3.5" />{file ? file.name : "Choose file"}
                  </Button>
                  {file && <span className="text-xs text-muted-foreground ml-2">{(file.size / (1024 * 1024)).toFixed(1)} MB</span>}
                  <p className="text-[11px] text-muted-foreground mt-1">Max 10 MB</p>
                </>
              )}
          </div>
          {assignments.length > 0 && (
            <div>
              <Label>Link to assignment <span className="text-xs text-muted-foreground ml-1">(optional)</span></Label>
              <Select value={form.assignmentId || "none"} onValueChange={(v) => setForm({ ...form, assignmentId: v === "none" ? "" : v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="No linked assignment" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No linked assignment</SelectItem>
                  {assignments.map((a) => <SelectItem key={a.id} value={String(a.id)}>{a.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <Button className="w-full" disabled={!form.title.trim() || submitMutation.isPending || isArchived} onClick={() => submitMutation.mutate()}>
            {submitMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {mode === "create" ? "Add Classwork" : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

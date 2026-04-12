import { useState, useRef, useEffect, useCallback, useReducer } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import LinkExtension from "@tiptap/extension-link";
import ImageExtension from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import DOMPurify from "dompurify";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import {
  Loader2,
  ChevronLeft,
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading2,
  Link2,
  Paperclip,
  FileText,
  ExternalLink,
  Upload,
  X,
  Plus,
  ArrowRight,
  BookOpen,
  ImageIcon,
  Minus,
  Calendar,
  GraduationCap,
} from "lucide-react";
import ModernSidebar from "@/components/ModernSidebar";
import type { Classroom, ClassroomAssignment, ClassroomMaterial } from "@shared/schema";
import { getAttachmentKind } from "@/lib/classroomUtils";

function sanitize(html: string): string {
  return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
}

// ─── Rich content renderer ───────────────────────────────────────────────────

function RichContent({ html }: { html: string }) {
  return (
    <div
      className="prose prose-sm max-w-none text-foreground
        prose-headings:font-semibold prose-headings:text-foreground
        prose-h2:text-xl prose-h2:mt-6 prose-h2:mb-2
        prose-p:leading-relaxed prose-p:my-2 prose-p:text-foreground/90
        prose-ul:pl-5 prose-ol:pl-5 prose-li:my-0.5
        prose-strong:font-semibold prose-strong:text-foreground
        prose-em:text-foreground/80
        prose-a:text-primary prose-a:underline
        prose-hr:border-border prose-hr:my-6
        prose-img:rounded-xl prose-img:my-4 prose-img:max-w-full"
      dangerouslySetInnerHTML={{ __html: sanitize(html) }}
    />
  );
}

// ─── Upload image ────────────────────────────────────────────────────────────

async function uploadImageToCloudinary(file: File): Promise<string> {
  const token = localStorage.getItem("sessionId");
  const fd = new FormData();
  fd.append("file", file);
  fd.append("folder", "classwork-images");
  const r = await fetch("/api/upload", {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: fd,
  });
  const data = await r.json();
  if (!r.ok || !data.url) throw new Error(data.error ?? "Image upload failed");
  return data.url as string;
}

// ─── Teacher editor ──────────────────────────────────────────────────────────

function TeacherEditor({
  classroomSlug,
  classroom,
  classroomId,
  initial,
  isEdit,
}: {
  classroomSlug: string;
  classroom: Classroom;
  classroomId: number;
  initial?: ClassroomMaterial;
  isEdit: boolean;
}) {
  const [, navigate] = useLocation();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [assignmentId, setAssignmentId] = useState(
    initial?.assignmentId ? String(initial.assignmentId) : "",
  );
  const initialUrlKind = initial?.url ? getAttachmentKind(initial.url) : null;
  const [showUrl, setShowUrl] = useState(initialUrlKind === "link");
  const [externalUrl, setExternalUrl] = useState(
    initialUrlKind === "link" ? (initial?.url ?? "") : "",
  );
  const [keepExistingPdf, setKeepExistingPdf] = useState(initialUrlKind === "pdf");

  // Force a re-render whenever the editor selection or content changes so
  // toolbar active-state highlights (bold, italic, heading, link…) stay current.
  const [, forceUpdate] = useReducer((n: number) => n + 1, 0);
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linkDialogUrl, setLinkDialogUrl] = useState("");

  const { data: assignments = [] } = useQuery<ClassroomAssignment[]>({
    queryKey: ["/api/classrooms", classroomId, "assignments"],
    queryFn: () => apiRequest(`/api/classrooms/${classroomId}/assignments`),
  });

  const editor = useEditor({
    extensions: [
      StarterKit,
      LinkExtension.configure({
        openOnClick: false,
        HTMLAttributes: { class: "text-primary underline" },
      }),
      ImageExtension.configure({
        HTMLAttributes: { class: "rounded-xl max-w-full" },
      }),
      Placeholder.configure({
        placeholder: "Write instructions, notes, or lesson content…",
      }),
    ],
    content: initial?.description ?? "",
    // Re-render the parent (and therefore toolbar buttons) whenever the
    // selection moves or content changes so isActive() stays accurate.
    onSelectionUpdate: () => forceUpdate(),
    onUpdate: () => forceUpdate(),
    editorProps: {
      attributes: {
        class: "min-h-[280px] px-5 py-4 outline-none text-sm leading-relaxed",
      },
    },
  });

  const handleInsertLink = useCallback(() => {
    setLinkDialogUrl(editor?.getAttributes("link").href ?? "");
    setShowLinkDialog(true);
  }, [editor]);

  const applyLink = () => {
    if (!editor) return;
    const url = linkDialogUrl.trim();

    if (!url) {
      // Clear any existing link mark
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      const { from, to } = editor.state.selection;
      const hasSelection = from !== to;

      if (hasSelection) {
        // Wrap the selected text in a link
        editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
      } else {
        // No text selected — insert the URL as visible link text
        editor.chain().focus().insertContent({
          type: "text",
          marks: [{ type: "link", attrs: { href: url } }],
          text: url,
        }).run();
      }
    }
    setShowLinkDialog(false);
    setLinkDialogUrl("");
  };

  function pickFile(f: File | null) {
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 10 MB.", type: "error" });
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    setFile(f);
  }

  async function handleInsertImage() {
    if (!file || !editor) return;
    const kind = getAttachmentKind(file.name);
    if (kind !== "image") return;
    setIsUploadingImage(true);
    try {
      const url = await uploadImageToCloudinary(file);
      editor.chain().focus().setImage({ src: url }).run();
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Upload failed";
      toast({ title: "Image upload failed", description: msg, type: "error" });
    } finally {
      setIsUploadingImage(false);
    }
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem("sessionId");
      const rawHtml = editor?.getHTML() ?? "";
      const description = sanitize(rawHtml);

      if (file) {
        const kind = getAttachmentKind(file.name);
        if (kind === "image") {
          throw new Error("Please use 'Insert into content' before saving the image.");
        }
        const fd = new FormData();
        fd.append("file", file);
        fd.append("title", title);
        fd.append("description", description);
        if (showUrl && externalUrl) fd.append("url", externalUrl);
        if (assignmentId) fd.append("assignmentId", assignmentId);
        const endpoint = isEdit
          ? `/api/classrooms/${classroomId}/materials/${initial!.id}/with-file`
          : `/api/classrooms/${classroomId}/materials/with-file`;
        const r = await fetch(endpoint, {
          method: isEdit ? "PATCH" : "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: fd,
        });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error ?? "Upload failed");
        return d as ClassroomMaterial;
      }

      const resolvedUrl = showUrl && externalUrl
        ? externalUrl
        : keepExistingPdf && initial?.url
        ? initial.url
        : null;

      const endpoint = isEdit
        ? `/api/classrooms/${classroomId}/materials/${initial!.id}`
        : `/api/classrooms/${classroomId}/materials`;
      return apiRequest(endpoint, {
        method: isEdit ? "PATCH" : "POST",
        body: JSON.stringify({
          title,
          description,
          url: resolvedUrl,
          assignmentId: assignmentId ? Number(assignmentId) : null,
        }),
      }) as Promise<ClassroomMaterial>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/classrooms", classroomId, "materials"] });
      toast({ title: isEdit ? "Classwork updated" : "Classwork created", type: "success" });
      navigate(`/classrooms/${classroomSlug}?tab=classwork`);
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, type: "error" }),
  });

  const canSave = title.trim().length > 0 && !saveMutation.isPending && !isUploadingImage;
  const existingPdfUrl = keepExistingPdf && initial?.url ? initial.url : null;
  const fileKind = file ? getAttachmentKind(file.name) : null;

  return (
    <div className="min-h-screen bg-white dark:bg-background">

      {/* ── Minimal top bar — full width, no sidebar ── */}
      <div className="fixed top-0 left-0 right-0 z-20 bg-white/95 dark:bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          {/* Left: back crumb */}
          <button
            type="button"
            onClick={() => navigate(`/classrooms/${classroomSlug}?tab=classwork`)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline font-medium">{classroom.name}</span>
            <span className="sm:hidden font-medium">Back</span>
          </button>

          {/* Center: floating toolbar */}
          <div className="flex-1 flex justify-center">
            <div className="flex items-center gap-0.5 bg-muted/50 rounded-xl px-2 py-1.5">
              {editor && <>
                {[
                  { active: editor.isActive("bold"), fn: () => editor.chain().focus().toggleBold().run(), icon: <Bold className="h-3.5 w-3.5" />, title: "Bold" },
                  { active: editor.isActive("italic"), fn: () => editor.chain().focus().toggleItalic().run(), icon: <Italic className="h-3.5 w-3.5" />, title: "Italic" },
                ].map((b, i) => (
                  <button key={i} type="button" title={b.title}
                    onMouseDown={(e) => { e.preventDefault(); b.fn(); }}
                    className={`h-7 w-7 rounded-lg flex items-center justify-center transition-colors ${b.active ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}>
                    {b.icon}
                  </button>
                ))}
                <div className="w-px h-4 bg-border mx-1" />
                {[
                  { active: editor.isActive("heading", { level: 2 }), fn: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), icon: <Heading2 className="h-3.5 w-3.5" />, title: "Heading" },
                  { active: editor.isActive("bulletList"), fn: () => editor.chain().focus().toggleBulletList().run(), icon: <List className="h-3.5 w-3.5" />, title: "Bullet list" },
                  { active: editor.isActive("orderedList"), fn: () => editor.chain().focus().toggleOrderedList().run(), icon: <ListOrdered className="h-3.5 w-3.5" />, title: "Numbered list" },
                ].map((b, i) => (
                  <button key={i} type="button" title={b.title}
                    onMouseDown={(e) => { e.preventDefault(); b.fn(); }}
                    className={`h-7 w-7 rounded-lg flex items-center justify-center transition-colors ${b.active ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}>
                    {b.icon}
                  </button>
                ))}
                <div className="w-px h-4 bg-border mx-1" />
                {[
                  { active: editor.isActive("link"), fn: handleInsertLink, icon: <Link2 className="h-3.5 w-3.5" />, title: "Link" },
                  { active: false, fn: () => editor.chain().focus().setHorizontalRule().run(), icon: <Minus className="h-3.5 w-3.5" />, title: "Divider" },
                ].map((b, i) => (
                  <button key={i} type="button" title={b.title}
                    onMouseDown={(e) => { e.preventDefault(); b.fn(); }}
                    className={`h-7 w-7 rounded-lg flex items-center justify-center transition-colors ${b.active ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}>
                    {b.icon}
                  </button>
                ))}
              </>}
            </div>
          </div>

          {/* Right: save state + publish */}
          <div className="flex items-center gap-3">
            {saveMutation.isPending && (
              <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Loader2 className="h-3 w-3 animate-spin" /> Saving…
              </span>
            )}
            <Button
              disabled={!canSave}
              onClick={() => saveMutation.mutate()}
              className="h-8 px-5 text-sm font-medium rounded-full"
            >
              {isEdit ? "Save" : "Publish"}
            </Button>
          </div>
        </div>
      </div>

      {/* ── Page body: writing canvas + right panel ── */}
      <div className="pt-14 flex min-h-screen">

        {/* Writing canvas — centered, Substack-width */}
        <main className="flex-1 flex justify-center">
          <div className="w-full max-w-[680px] px-5 sm:px-8 pt-16 pb-40">

            {/* Title */}
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title"
              className="w-full text-4xl sm:text-5xl font-bold text-foreground placeholder:text-muted-foreground/25 bg-transparent border-none outline-none leading-tight mb-3 tracking-tight"
              autoFocus={!isEdit}
            />

            {/* Thin divider */}
            <div className="border-t border-border mb-8" />

            {/* Body — no border, no card, just text */}
            <EditorContent editor={editor} />
          </div>
        </main>

        {/* Right settings panel — sticky, Substack-style */}
        <aside className="hidden lg:flex flex-col w-72 xl:w-80 shrink-0 border-l border-border bg-background/60 min-h-screen sticky top-14 self-start max-h-[calc(100vh-3.5rem)] overflow-y-auto">
          <div className="px-5 py-6 space-y-6">

            {/* Panel header */}
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Settings</p>

            {/* Attachments */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">Attachments</p>
                <div className="flex items-center gap-1.5">
                  {!showUrl && (
                    <button type="button" onClick={() => setShowUrl(true)}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground border border-border rounded-md px-2 py-0.5 hover:bg-muted/50 transition-colors">
                      <Plus className="h-3 w-3" /><Link2 className="h-3 w-3" />
                    </button>
                  )}
                  <button type="button" onClick={() => fileRef.current?.click()}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground border border-border rounded-md px-2 py-0.5 hover:bg-muted/50 transition-colors">
                    <Plus className="h-3 w-3" /><Upload className="h-3 w-3" />
                  </button>
                  <input ref={fileRef} type="file" className="hidden"
                    onChange={(e) => pickFile(e.target.files?.[0] ?? null)} />
                </div>
              </div>

              {/* Existing PDF */}
              {existingPdfUrl && !file && (
                <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-border bg-muted/20">
                  <FileText className="h-4 w-4 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground">Attached PDF</p>
                    <a href={existingPdfUrl} target="_blank" rel="noopener noreferrer"
                      className="text-[11px] text-primary hover:underline">Open PDF</a>
                  </div>
                  <button type="button" onClick={() => setKeepExistingPdf(false)}
                    className="shrink-0 h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:text-red-500 transition-colors">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              {/* External URL */}
              {showUrl && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-foreground flex items-center gap-1.5">
                      <Link2 className="h-3 w-3 text-primary" /> URL link
                    </span>
                    <button type="button" onClick={() => { setShowUrl(false); setExternalUrl(""); }}
                      className="h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground transition-colors">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                  <Input type="url" placeholder="https://…" value={externalUrl}
                    onChange={(e) => setExternalUrl(e.target.value)}
                    className="h-8 font-mono text-xs" />
                </div>
              )}

              {/* Staged file */}
              {file && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-border bg-muted/20">
                    {fileKind === "pdf"
                      ? <FileText className="h-4 w-4 text-primary shrink-0" />
                      : <ImageIcon className="h-4 w-4 text-primary shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{file.name}</p>
                      <p className="text-[11px] text-muted-foreground">{(file.size / (1024 * 1024)).toFixed(1)} MB</p>
                    </div>
                    <button type="button" onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = ""; }}
                      className="shrink-0 h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {fileKind === "image" && (
                    <Button size="sm" variant="outline" className="w-full gap-1.5 h-7 text-xs"
                      onClick={handleInsertImage} disabled={isUploadingImage}>
                      {isUploadingImage
                        ? <><Loader2 className="h-3 w-3 animate-spin" /> Uploading…</>
                        : <><ImageIcon className="h-3 w-3" /> Insert into content</>}
                    </Button>
                  )}
                  {fileKind === "pdf" && (
                    <p className="text-[11px] text-muted-foreground">Will appear as an attachment for students.</p>
                  )}
                </div>
              )}

              {/* Drop zone */}
              {!showUrl && !file && !existingPdfUrl && (
                <div
                  className={`w-full flex flex-col items-center gap-1.5 px-3 py-5 rounded-xl border-2 border-dashed transition-all text-center cursor-pointer ${
                    isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 hover:bg-muted/20"
                  }`}
                  onClick={() => fileRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => { e.preventDefault(); setIsDragging(false); pickFile(e.dataTransfer.files?.[0] ?? null); }}
                >
                  <Upload className={`h-4 w-4 ${isDragging ? "text-primary" : "text-muted-foreground"}`} />
                  <p className="text-xs text-muted-foreground">
                    Drop or <span className="text-primary">browse</span>
                  </p>
                  <p className="text-[10px] text-muted-foreground/60">Images · PDFs · Max 10 MB</p>
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="border-t border-border" />

            {/* Link to assignment */}
            {assignments.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Link to assignment</p>
                <Select value={assignmentId || "none"} onValueChange={(v) => setAssignmentId(v === "none" ? "" : v)}>
                  <SelectTrigger className="h-9 gap-2 text-sm">
                    <BookOpen className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent side="top">
                    <SelectItem value="none">No linked assignment</SelectItem>
                    {assignments.map((a) => (
                      <SelectItem key={a.id} value={String(a.id)}>{a.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </aside>

        {/* Mobile settings — bottom sheet feel, shown below canvas */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-10 border-t border-border bg-background/95 backdrop-blur-sm px-4 py-3">
          <details className="group">
            <summary className="flex items-center justify-between text-sm font-medium text-foreground cursor-pointer list-none">
              <span className="flex items-center gap-2">
                <Upload className="h-4 w-4 text-muted-foreground" />
                Attachments & settings
              </span>
              <ChevronLeft className="h-4 w-4 text-muted-foreground rotate-[-90deg] group-open:rotate-90 transition-transform" />
            </summary>
            <div className="pt-4 pb-2 space-y-4">
              {/* Mobile: URL + File buttons */}
              <div className="flex gap-2">
                {!showUrl && (
                  <button type="button" onClick={() => setShowUrl(true)}
                    className="flex-1 flex items-center justify-center gap-1.5 text-xs border border-border rounded-lg py-2 hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground">
                    <Link2 className="h-3.5 w-3.5" /> Add URL
                  </button>
                )}
                <button type="button" onClick={() => fileRef.current?.click()}
                  className="flex-1 flex items-center justify-center gap-1.5 text-xs border border-border rounded-lg py-2 hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground">
                  <Upload className="h-3.5 w-3.5" /> Upload file
                </button>
              </div>
              {showUrl && (
                <Input type="url" placeholder="https://…" value={externalUrl}
                  onChange={(e) => setExternalUrl(e.target.value)}
                  className="h-9 font-mono text-sm" />
              )}
              {file && (
                <div className="space-y-2">
                  <div className="flex items-center gap-3 px-3 py-2 rounded-lg border border-border">
                    {fileKind === "pdf"
                      ? <FileText className="h-4 w-4 text-primary shrink-0" />
                      : <ImageIcon className="h-4 w-4 text-primary shrink-0" />}
                    <p className="text-sm flex-1 truncate">{file.name}</p>
                    <button type="button" onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = ""; }}>
                      <X className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </div>
                  {fileKind === "image" && (
                    <Button size="sm" variant="outline" className="w-full gap-1.5 h-8 text-xs"
                      onClick={handleInsertImage} disabled={isUploadingImage}>
                      {isUploadingImage
                        ? <><Loader2 className="h-3 w-3 animate-spin" /> Uploading…</>
                        : <><ImageIcon className="h-3 w-3" /> Insert into content</>}
                    </Button>
                  )}
                  {fileKind === "pdf" && (
                    <p className="text-[11px] text-muted-foreground">Will appear as an attachment for students.</p>
                  )}
                </div>
              )}
              {assignments.length > 0 && (
                <Select value={assignmentId || "none"} onValueChange={(v) => setAssignmentId(v === "none" ? "" : v)}>
                  <SelectTrigger className="h-9 gap-2">
                    <BookOpen className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <SelectValue placeholder="No linked assignment" />
                  </SelectTrigger>
                  <SelectContent side="top">
                    <SelectItem value="none">No linked assignment</SelectItem>
                    {assignments.map((a) => (
                      <SelectItem key={a.id} value={String(a.id)}>{a.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Button disabled={!canSave} onClick={() => saveMutation.mutate()} className="w-full rounded-xl">
                {saveMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
                {isEdit ? "Save changes" : "Publish"}
              </Button>
            </div>
          </details>
        </div>
      </div>

      {/* ── Link insertion dialog ── */}
      {showLinkDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setShowLinkDialog(false)}>
          <div className="bg-background rounded-2xl border border-border shadow-xl p-5 w-full max-w-sm mx-4"
            onClick={(e) => e.stopPropagation()}>
            <p className="text-sm font-semibold mb-3 text-foreground">Insert link</p>
            <Input type="url" placeholder="https://…" value={linkDialogUrl}
              onChange={(e) => setLinkDialogUrl(e.target.value)}
              className="h-9 font-mono text-sm mb-3" autoFocus
              onKeyDown={(e) => { if (e.key === "Enter") applyLink(); if (e.key === "Escape") setShowLinkDialog(false); }} />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setShowLinkDialog(false)}>Cancel</Button>
              <Button size="sm" onClick={applyLink}>Apply</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Read view ───────────────────────────────────────────────────────────────

function ReadView({
  classroomSlug,
  classroom,
  classroomId,
  material,
  isParent,
  isTeacher,
}: {
  classroomSlug: string;
  classroom: Classroom;
  classroomId: number;
  material: ClassroomMaterial;
  isParent: boolean;
  isTeacher: boolean;
}) {
  const [, navigate] = useLocation();
  const sp = new URLSearchParams(window.location.search);
  const parentStudentId = sp.get("studentId") ?? "";

  const backHref = `/classrooms/${classroomSlug}?tab=classwork${
    isParent && parentStudentId ? `&studentId=${parentStudentId}` : ""
  }`;

  useEffect(() => {
    if (isTeacher) return;
    apiRequest(`/api/classrooms/${classroomId}/materials/${material.id}/seen`, { method: "POST" }).catch(() => {});
  }, [classroomId, material.id, isTeacher]);

  const urlKind = material.url ? getAttachmentKind(material.url) : null;
  const assignmentHref = material.linkedAssignment
    ? `/classrooms/${classroomSlug}/classwork/${material.linkedAssignment.slug ?? material.linkedAssignment.id}`
    : null;

  const hasBody = material.description &&
    material.description !== "<p></p>" &&
    material.description.trim() !== "";

  return (
    <div className="flex min-h-screen bg-background">
      <ModernSidebar />
      <div className="flex-1 md:ml-[228px] overflow-auto">
        <div className="max-w-3xl mx-auto px-4 sm:px-8 pt-20 pb-20 md:pt-10">

          {/* Back */}
          <button
            type="button"
            onClick={() => navigate(backHref)}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to {classroom.name}
          </button>

          {/* Title block */}
          <div className="mb-8 pb-6 border-b border-border">
            <h1 className="text-3xl font-bold text-foreground leading-tight mb-3">
              {material.title}
            </h1>
            {/* Meta chips */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <GraduationCap className="h-3.5 w-3.5" />
                <span>{classroom.name}</span>
                {classroom.subject && (
                  <><span className="text-border">·</span><span>{classroom.subject}</span></>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                <span>
                  {new Date(material.uploadedAt).toLocaleDateString("en-US", {
                    month: "long", day: "numeric", year: "numeric",
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* Body */}
          {hasBody && (
            <div className="mb-10">
              <RichContent html={material.description!} />
            </div>
          )}

          {/* Attachment card */}
          {(urlKind === "pdf" || urlKind === "link") && material.url && (
            <div className="mb-6 rounded-2xl border border-border bg-card p-4 flex items-center gap-3 shadow-sm">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${urlKind === "pdf" ? "bg-red-50 text-red-600" : "bg-sky-50 text-sky-600"}`}>
                {urlKind === "pdf"
                  ? <FileText className="h-4 w-4" />
                  : <Paperclip className="h-4 w-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">
                  {urlKind === "pdf" ? "PDF Attachment" : "Link"}
                </p>
                <a
                  href={material.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-primary hover:underline flex items-center gap-1"
                >
                  {urlKind === "pdf" ? "Open PDF" : "View attachment"}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          )}

          {/* Linked assignment CTA */}
          {assignmentHref && (
            <div className="rounded-2xl border border-primary/25 bg-primary/5 p-5 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-1">
                  Linked Assignment
                </p>
                <p className="text-base font-semibold text-foreground leading-snug truncate">
                  {material.linkedAssignment!.title}
                </p>
              </div>
              <Button
                size="sm"
                className="gap-1.5 shrink-0 h-9 px-4"
                onClick={() => navigate(assignmentHref)}
              >
                Start <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Root ────────────────────────────────────────────────────────────────────

export default function ClassroomMaterialPage() {
  const [matchNew, paramsNew] = useRoute("/classrooms/:slug/materials/new");
  const [matchEdit, paramsEdit] = useRoute("/classrooms/:slug/materials/:materialSlug/edit");
  const [matchMaterial, paramsMaterial] = useRoute("/classrooms/:slug/materials/:materialSlug");
  const [, navigate] = useLocation();
  const { user } = useAuth();

  const isNew = !!matchNew;
  const isEdit = !!matchEdit;

  const classroomSlug =
    (matchNew ? paramsNew?.slug : matchEdit ? paramsEdit?.slug : paramsMaterial?.slug) ?? "";
  const materialSlug = matchEdit
    ? (paramsEdit?.materialSlug ?? "")
    : matchMaterial
    ? (paramsMaterial?.materialSlug ?? "")
    : "";

  const { data: classroom, isLoading: classroomLoading } = useQuery<Classroom>({
    queryKey: ["/api/classrooms", classroomSlug],
    queryFn: () => apiRequest(`/api/classrooms/${classroomSlug}`),
    enabled: !!classroomSlug,
  });

  const classroomId = classroom?.id ?? 0;

  const { data: material, isLoading: materialLoading } = useQuery<ClassroomMaterial>({
    queryKey: ["/api/classrooms", classroomId, "materials", "slug", materialSlug],
    queryFn: () => apiRequest(`/api/classrooms/${classroomId}/materials/slug/${materialSlug}`),
    enabled: !!classroomId && !isNew && !!materialSlug,
  });

  const isLoading = classroomLoading || (!isNew && materialLoading);

  if (isLoading) {
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
          <p className="text-sm text-muted-foreground">Classroom not found.</p>
          <Button variant="outline" size="sm" onClick={() => navigate("/dashboard")}>Back to Dashboard</Button>
        </div>
      </div>
    );
  }

  if (!isNew && !material) {
    return (
      <div className="flex min-h-screen">
        <ModernSidebar />
        <div className="flex-1 md:ml-[228px] flex flex-col items-center justify-center gap-3">
          <p className="text-sm text-muted-foreground">Classwork not found.</p>
          <Button variant="outline" size="sm" onClick={() => navigate(`/classrooms/${classroomSlug}?tab=classwork`)}>
            Back to {classroom.name}
          </Button>
        </div>
      </div>
    );
  }

  const isTeacher = user?.role === "teacher" && classroom.teacherId === user.id;
  const isParent = user?.role === "parent";

  if (isNew || isEdit) {
    if (!isTeacher) { navigate(`/classrooms/${classroomSlug}`); return null; }
    return (
      <TeacherEditor
        classroomSlug={classroomSlug}
        classroom={classroom}
        classroomId={classroomId}
        initial={isEdit ? material : undefined}
        isEdit={isEdit}
      />
    );
  }

  return (
    <ReadView
      classroomSlug={classroomSlug}
      classroom={classroom}
      classroomId={classroomId}
      material={material!}
      isParent={isParent}
      isTeacher={isTeacher}
    />
  );
}
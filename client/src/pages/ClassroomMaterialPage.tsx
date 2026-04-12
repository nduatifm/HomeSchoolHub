import { useState, useRef, useEffect, useCallback } from "react";
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
} from "lucide-react";
import ModernSidebar from "@/components/ModernSidebar";
import type { Classroom, ClassroomAssignment, ClassroomMaterial } from "@shared/schema";

// ─── Attachment kind detection ───────────────────────────────────────────────

export function getAttachmentKind(url: string): "image" | "pdf" | "link" {
  if (url.includes("/image/upload/")) return "image";
  if (url.includes("/raw/upload/") || /\.pdf(\?|$)/i.test(url)) return "pdf";
  const lower = url.toLowerCase();
  if (/\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/.test(lower)) return "image";
  return "link";
}

// ─── Sanitize HTML for safe rendering ───────────────────────────────────────

function sanitize(html: string): string {
  return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
}

// ─── Tiptap toolbar ─────────────────────────────────────────────────────────

function Toolbar({
  editor,
  onInsertLink,
}: {
  editor: ReturnType<typeof useEditor>;
  onInsertLink: () => void;
}) {
  if (!editor) return null;

  const btn = (
    active: boolean,
    onClick: () => void,
    icon: React.ReactNode,
    title: string,
  ) => (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      className={`h-7 w-7 rounded flex items-center justify-center transition-colors ${
        active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:text-foreground hover:bg-muted"
      }`}
    >
      {icon}
    </button>
  );

  return (
    <div className="flex items-center gap-0.5 px-3 py-2 border-b border-border bg-muted/30">
      {btn(editor.isActive("bold"), () => editor.chain().focus().toggleBold().run(), <Bold className="h-3.5 w-3.5" />, "Bold")}
      {btn(editor.isActive("italic"), () => editor.chain().focus().toggleItalic().run(), <Italic className="h-3.5 w-3.5" />, "Italic")}
      <div className="w-px h-4 bg-border mx-1" />
      {btn(editor.isActive("heading", { level: 2 }), () => editor.chain().focus().toggleHeading({ level: 2 }).run(), <Heading2 className="h-3.5 w-3.5" />, "Heading")}
      {btn(editor.isActive("bulletList"), () => editor.chain().focus().toggleBulletList().run(), <List className="h-3.5 w-3.5" />, "Bullet list")}
      {btn(editor.isActive("orderedList"), () => editor.chain().focus().toggleOrderedList().run(), <ListOrdered className="h-3.5 w-3.5" />, "Numbered list")}
      <div className="w-px h-4 bg-border mx-1" />
      {btn(editor.isActive("link"), onInsertLink, <Link2 className="h-3.5 w-3.5" />, "Insert link")}
    </div>
  );
}

// ─── Rendered rich HTML (read view) ─────────────────────────────────────────

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
        prose-img:rounded-xl prose-img:my-4 prose-img:max-w-full"
      dangerouslySetInnerHTML={{ __html: sanitize(html) }}
    />
  );
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

  // Attachment state — separate external URL from uploaded file
  const [showUrl, setShowUrl] = useState(
    !!(initial?.url && getAttachmentKind(initial.url) === "link"),
  );
  const [externalUrl, setExternalUrl] = useState(
    initial?.url && getAttachmentKind(initial.url) === "link" ? initial.url : "",
  );
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Link insertion dialog
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
    editorProps: {
      attributes: {
        class: "min-h-[260px] px-4 py-4 outline-none text-sm leading-relaxed",
      },
    },
  });

  const handleInsertLink = useCallback(() => {
    setLinkDialogUrl(editor?.getAttributes("link").href ?? "");
    setShowLinkDialog(true);
  }, [editor]);

  const applyLink = () => {
    if (!editor) return;
    if (!linkDialogUrl.trim()) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      editor
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href: linkDialogUrl.trim() })
        .run();
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

  function handleInsertImage() {
    if (!file || !editor) return;
    const objectUrl = URL.createObjectURL(file);
    editor.chain().focus().setImage({ src: objectUrl }).run();
    setFile(null);
    if (fileRef.current) fileRef.current.value = "";
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

      const endpoint = isEdit
        ? `/api/classrooms/${classroomId}/materials/${initial!.id}`
        : `/api/classrooms/${classroomId}/materials`;
      return apiRequest(endpoint, {
        method: isEdit ? "PATCH" : "POST",
        body: JSON.stringify({
          title,
          description,
          url: showUrl && externalUrl ? externalUrl : null,
          assignmentId: assignmentId ? Number(assignmentId) : null,
        }),
      }) as Promise<ClassroomMaterial>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["/api/classrooms", classroomId, "materials"],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/classrooms", classroomId, "materials", "slug", data.slug],
      });
      toast({ title: isEdit ? "Classwork updated" : "Classwork created", type: "success" });
      const slug = data.slug ?? data.id;
      navigate(`/classrooms/${classroomSlug}/materials/${slug}`);
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, type: "error" }),
  });

  const canSave = title.trim().length > 0 && !saveMutation.isPending;
  const existingPdfUrl =
    initial?.url && getAttachmentKind(initial.url) === "pdf" ? initial.url : null;
  const fileKind = file ? getAttachmentKind(file.name) : null;

  return (
    <div className="flex min-h-screen bg-background">
      <ModernSidebar />
      <div className="flex-1 md:ml-[228px] flex flex-col">
        {/* Sticky top bar */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 sm:px-8 py-3 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => navigate(`/classrooms/${classroomSlug}?tab=classwork`)}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back to {classroom.name}</span>
            <span className="sm:hidden">Back</span>
          </button>
          <Button
            size="sm"
            disabled={!canSave}
            onClick={() => saveMutation.mutate()}
            className="min-w-[100px]"
          >
            {saveMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
            {isEdit ? "Save changes" : "Publish"}
          </Button>
        </div>

        {/* Writing canvas */}
        <div className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-8 pt-10 pb-24 space-y-6">
          {/* Headline title */}
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Untitled"
            className="w-full text-3xl font-bold text-foreground placeholder:text-muted-foreground/40 bg-transparent border-none outline-none"
            autoFocus={!isEdit}
          />

          {/* Rich text editor */}
          <div className="rounded-xl border border-border overflow-hidden">
            <Toolbar editor={editor} onInsertLink={handleInsertLink} />
            <EditorContent editor={editor} />
          </div>

          {/* Link dialog */}
          {showLinkDialog && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
              onClick={() => setShowLinkDialog(false)}
            >
              <div
                className="bg-background rounded-xl border border-border shadow-lg p-5 w-full max-w-sm mx-4"
                onClick={(e) => e.stopPropagation()}
              >
                <p className="text-sm font-semibold mb-3">Insert link</p>
                <Input
                  type="url"
                  placeholder="https://…"
                  value={linkDialogUrl}
                  onChange={(e) => setLinkDialogUrl(e.target.value)}
                  className="h-9 font-mono text-sm mb-3"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") applyLink();
                    if (e.key === "Escape") setShowLinkDialog(false);
                  }}
                />
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" size="sm" onClick={() => setShowLinkDialog(false)}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={applyLink}>
                    Apply
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ── Attachments ── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Attachments
              </p>
              <div className="flex items-center gap-1.5">
                {!showUrl && (
                  <button
                    type="button"
                    onClick={() => setShowUrl(true)}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground border border-border rounded-lg px-2.5 py-1 hover:bg-muted/50 transition-colors"
                  >
                    <Plus className="h-3 w-3" />
                    <Link2 className="h-3 w-3 ml-0.5" /> URL
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground border border-border rounded-lg px-2.5 py-1 hover:bg-muted/50 transition-colors"
                >
                  <Plus className="h-3 w-3" />
                  <Upload className="h-3 w-3 ml-0.5" /> File
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  className="hidden"
                  onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
                />
              </div>
            </div>

            {/* Existing server-side PDF */}
            {existingPdfUrl && !file && (
              <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border bg-muted/20">
                <FileText className="h-4 w-4 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">Attached PDF</p>
                  <a
                    href={existingPdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline"
                  >
                    Open PDF
                  </a>
                </div>
              </div>
            )}

            {/* External URL */}
            {showUrl && (
              <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <Link2 className="h-3.5 w-3.5 text-primary" /> URL link
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowUrl(false);
                      setExternalUrl("");
                    }}
                    className="h-6 w-6 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <Input
                  type="url"
                  placeholder="https://…"
                  value={externalUrl}
                  onChange={(e) => setExternalUrl(e.target.value)}
                  className="h-9 font-mono text-sm bg-background"
                />
              </div>
            )}

            {/* Staged file */}
            {file && (
              <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-2">
                <div className="flex items-center gap-3">
                  {fileKind === "pdf" ? (
                    <FileText className="h-4 w-4 text-primary shrink-0" />
                  ) : (
                    <ImageIcon className="h-4 w-4 text-primary shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(file.size / (1024 * 1024)).toFixed(1)} MB
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setFile(null);
                      if (fileRef.current) fileRef.current.value = "";
                    }}
                    className="shrink-0 h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                {fileKind === "image" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full gap-1.5 h-8 text-xs"
                    onClick={handleInsertImage}
                  >
                    <ImageIcon className="h-3.5 w-3.5" /> Insert into content
                  </Button>
                )}
                {fileKind === "pdf" && (
                  <p className="text-xs text-muted-foreground">
                    Will appear in the Attachments section for students.
                  </p>
                )}
              </div>
            )}

            {/* Empty state drop zone */}
            {!showUrl && !file && !existingPdfUrl && (
              <div
                className={`w-full flex flex-col items-center gap-2 px-4 py-6 rounded-xl border-2 border-dashed transition-all text-center cursor-pointer ${
                  isDragging
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/40 hover:bg-muted/30"
                }`}
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  pickFile(e.dataTransfer.files?.[0] ?? null);
                }}
              >
                <Upload
                  className={`h-5 w-5 ${isDragging ? "text-primary" : "text-muted-foreground"}`}
                />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Drop a file or <span className="text-primary">browse</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Images embed in content · PDFs appear as attachments · Max 10 MB
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* ── Link to assignment ── */}
          {assignments.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Link to assignment{" "}
                <span className="normal-case font-normal tracking-normal">(optional)</span>
              </p>
              <Select
                value={assignmentId || "none"}
                onValueChange={(v) => setAssignmentId(v === "none" ? "" : v)}
              >
                <SelectTrigger className="h-10 gap-2">
                  <BookOpen className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <SelectValue placeholder="No linked assignment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No linked assignment</SelectItem>
                  {assignments.map((a) => (
                    <SelectItem key={a.id} value={String(a.id)}>
                      {a.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Read view (student / parent) ───────────────────────────────────────────

function ReadView({
  classroomSlug,
  classroom,
  classroomId,
  material,
  isParent,
}: {
  classroomSlug: string;
  classroom: Classroom;
  classroomId: number;
  material: ClassroomMaterial;
  isParent: boolean;
}) {
  const [, navigate] = useLocation();
  const sp = new URLSearchParams(window.location.search);
  const parentStudentId = sp.get("studentId") ?? "";

  const backHref = `/classrooms/${classroomSlug}?tab=classwork${
    isParent && parentStudentId ? `&studentId=${parentStudentId}` : ""
  }`;

  useEffect(() => {
    apiRequest(
      `/api/classrooms/${classroomId}/materials/${material.id}/seen`,
      { method: "POST" },
    ).catch(() => {});
  }, [classroomId, material.id]);

  const urlKind = material.url ? getAttachmentKind(material.url) : null;
  const assignmentHref = material.linkedAssignment
    ? `/classrooms/${classroomSlug}/classwork/${
        material.linkedAssignment.slug ?? material.linkedAssignment.id
      }`
    : null;

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

          {/* Title + meta */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-foreground leading-tight mb-1">
              {material.title}
            </h1>
            <p className="text-sm text-muted-foreground">
              {classroom.name} · {classroom.subject} ·{" "}
              {new Date(material.uploadedAt).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>

          {/* Rich text body */}
          {material.description &&
            material.description !== "<p></p>" &&
            material.description.trim() !== "" && (
              <div className="mb-8">
                <RichContent html={material.description} />
              </div>
            )}

          {/* Attachments: PDF or external link */}
          {(urlKind === "pdf" || urlKind === "link") && material.url && (
            <div className="mb-6 rounded-xl border border-border bg-muted/20 p-4 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Attachments
              </p>
              {urlKind === "pdf" ? (
                <a
                  href={material.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-primary hover:underline font-medium"
                >
                  <FileText className="h-4 w-4 shrink-0" />
                  Open PDF
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              ) : (
                <a
                  href={material.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-primary hover:underline font-medium"
                >
                  <Paperclip className="h-4 w-4 shrink-0" />
                  View attachment
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          )}

          {/* Linked assignment CTA */}
          {assignmentHref && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-0.5">
                  Linked Assignment
                </p>
                <p className="text-sm font-medium text-foreground">
                  {material.linkedAssignment!.title}
                </p>
              </div>
              <Button
                size="sm"
                className="gap-1.5 shrink-0"
                onClick={() => navigate(assignmentHref)}
              >
                Go to assignment <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Root component ──────────────────────────────────────────────────────────

export default function ClassroomMaterialPage() {
  const [matchNew, paramsNew] = useRoute("/classrooms/:slug/materials/new");
  const [matchMaterial, paramsMaterial] = useRoute(
    "/classrooms/:slug/materials/:materialSlug",
  );
  const [, navigate] = useLocation();
  const { user } = useAuth();

  const classroomSlug =
    (matchNew ? paramsNew?.slug : paramsMaterial?.slug) ?? "";
  const materialSlug = matchMaterial ? (paramsMaterial?.materialSlug ?? "") : "";
  const isNew = !!matchNew;

  const sp = new URLSearchParams(window.location.search);
  const isEdit = sp.get("edit") === "true";

  const { data: classroom, isLoading: classroomLoading } = useQuery<Classroom>({
    queryKey: ["/api/classrooms", classroomSlug],
    queryFn: () => apiRequest(`/api/classrooms/${classroomSlug}`),
    enabled: !!classroomSlug,
  });

  const classroomId = classroom?.id ?? 0;

  const { data: material, isLoading: materialLoading } = useQuery<ClassroomMaterial>({
    queryKey: ["/api/classrooms", classroomId, "materials", "slug", materialSlug],
    queryFn: () =>
      apiRequest(`/api/classrooms/${classroomId}/materials/slug/${materialSlug}`),
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
          <Button variant="outline" size="sm" onClick={() => navigate("/dashboard")}>
            Back to Dashboard
          </Button>
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
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/classrooms/${classroomSlug}?tab=classwork`)}
          >
            Back to {classroom.name}
          </Button>
        </div>
      </div>
    );
  }

  const isTeacher = user?.role === "teacher" && classroom.teacherId === user.id;
  const isParent = user?.role === "parent";

  if (isNew || isEdit) {
    if (!isTeacher) {
      navigate(`/classrooms/${classroomSlug}`);
      return null;
    }
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
    />
  );
}

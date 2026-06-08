import { useState, useRef, useEffect, useCallback, useReducer } from "react";
import { useRoute, useLocation } from "wouter";
import { useGoBack } from "@/hooks/useGoBack";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import LinkExtension from "@tiptap/extension-link";
import ImageExtension from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import { Table, TableRow, TableCell, TableHeader } from "@tiptap/extension-table";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";
import { toast } from "@/hooks/use-toast";
import Breadcrumb, { buildClassroomCrumbs } from "@/components/Breadcrumb";
import {
  Loader2,
  ChevronLeft,
  ChevronDown,
  Bold,
  Italic,
  Strikethrough,
  List,
  ListOrdered,
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
  Undo2,
  Redo2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Table2,
  RowsIcon,
  Columns3,
  Trash2,
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
        prose-h1:text-2xl prose-h1:mt-6 prose-h1:mb-2
        prose-h2:text-xl prose-h2:mt-6 prose-h2:mb-2
        prose-h3:text-lg prose-h3:mt-5 prose-h3:mb-1.5
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

// ─── Upload helper ───────────────────────────────────────────────────────────

async function uploadFileToCloudinary(file: File, folder = "classwork"): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("folder", folder);
  const r = await fetch("/api/upload", {
    method: "POST",
    credentials: "include",
    body: fd,
  });
  const data = await r.json();
  if (!r.ok || !data.url) throw new Error(data.error ?? "Upload failed");
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
  const goBack = useGoBack(`/classrooms/${classroomSlug}/classwork`);
  const [title, setTitle] = useState(initial?.title ?? "");

  // All saved PDF attachment URLs — seeded from the new attachments[] array,
  // plus the legacy single `url` field if it was a PDF (backward compat).
  const [existingAttachments, setExistingAttachments] = useState<string[]>(() => {
    const saved = initial?.attachments ?? [];
    if (initial?.url && getAttachmentKind(initial.url) === "pdf") {
      return [initial.url, ...saved.filter((u) => u !== initial!.url)];
    }
    return saved;
  });
  // Files the teacher has staged locally (not yet uploaded).
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  // Force a re-render whenever the editor selection or content changes so
  // toolbar active-state highlights stay current.
  const [, forceUpdate] = useReducer((n: number) => n + 1, 0);
  // Grid picker hover state for the table insert tool.
  const [tableHoverRow, setTableHoverRow] = useState(0);
  const [tableHoverCol, setTableHoverCol] = useState(0);
  // Virtual trigger ref — a zero-size fixed span used as the Radix
  // ContextMenu anchor. We dispatch a synthetic contextmenu event on it
  // (with the original clientX/Y) so Radix positions the menu correctly.
  const virtualTriggerRef = useRef<HTMLSpanElement>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);   // PDF / any attachment
  const imageRef = useRef<HTMLInputElement>(null);  // toolbar image-only picker
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linkDialogUrl, setLinkDialogUrl] = useState("");

  const { data: assignments = [] } = useQuery<ClassroomAssignment[]>({
    queryKey: ["/api/classrooms", classroomId, "assignments"],
    queryFn: () => apiRequest(`/api/classrooms/${classroomId}/assignments`),
    enabled: !!classroomId,
  });

  const editor = useEditor({
    extensions: [
      StarterKit,
      TextAlign.configure({ types: ["heading", "paragraph", "tableCell", "tableHeader"] }),
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
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: initial?.description ?? "",
    editorProps: {
      attributes: {
        class: "min-h-[280px] px-5 py-4 outline-none text-sm leading-relaxed",
      },
    },
  });

  // Wire up selection/update listeners so toolbar highlights stay current.
  useEffect(() => {
    if (!editor) return;
    editor.on("selectionUpdate", forceUpdate);
    editor.on("update", forceUpdate);
    return () => {
      editor.off("selectionUpdate", forceUpdate);
      editor.off("update", forceUpdate);
    };
  }, [editor, forceUpdate]);


  // ── Style / alignment helpers ──────────────────────────────────────────────

  function getCurrentStyle() {
    if (!editor) return "Normal";
    if (editor.isActive("heading", { level: 1 })) return "H1";
    if (editor.isActive("heading", { level: 2 })) return "H2";
    if (editor.isActive("heading", { level: 3 })) return "H3";
    return "Normal";
  }

  function getCurrentAlign() {
    if (!editor) return "left";
    if (editor.isActive({ textAlign: "center" })) return "center";
    if (editor.isActive({ textAlign: "right" })) return "right";
    if (editor.isActive({ textAlign: "justify" })) return "justify";
    return "left";
  }

  const alignIcons: Record<string, JSX.Element> = {
    left: <AlignLeft className="h-3.5 w-3.5" />,
    center: <AlignCenter className="h-3.5 w-3.5" />,
    right: <AlignRight className="h-3.5 w-3.5" />,
    justify: <AlignJustify className="h-3.5 w-3.5" />,
  };

  // ── Link dialog ────────────────────────────────────────────────────────────

  const handleInsertLink = useCallback(() => {
    setLinkDialogUrl(editor?.getAttributes("link").href ?? "");
    setShowLinkDialog(true);
  }, [editor]);

  const applyLink = () => {
    if (!editor) return;
    const url = linkDialogUrl.trim();
    if (!url) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      const { from, to } = editor.state.selection;
      const hasSelection = from !== to;
      if (hasSelection) {
        editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
      } else {
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

  // ── File helpers ───────────────────────────────────────────────────────────

  function addFiles(fileList: FileList | null) {
    if (!fileList) return;
    const toAdd: File[] = [];
    for (let i = 0; i < fileList.length; i++) {
      const f = fileList[i];
      if (f.size > 10 * 1024 * 1024) {
        toast({ title: `"${f.name}" is over 10 MB — please choose a smaller file.`, type: "warning" });
        continue;
      }
      const kind = getAttachmentKind(f.name);
      if (kind === "link") {
        toast({ title: `"${f.name}" is not supported. Please attach images or PDFs only.`, type: "warning" });
        continue;
      }
      toAdd.push(f);
    }
    if (toAdd.length > 0) setPendingFiles((prev) => [...prev, ...toAdd]);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleInsertImage(imgFile: File) {
    if (!editor) return;
    setIsUploadingImage(true);
    try {
      const url = await uploadFileToCloudinary(imgFile, "classwork-images");
      editor.chain().focus().setImage({ src: url }).run();
      setPendingFiles((prev) => prev.filter((f) => f !== imgFile));
    } catch {
      toast({ title: "Image upload failed — try again.", type: "error" });
    } finally {
      setIsUploadingImage(false);
    }
  }

  async function handleToolbarImage(imgFile: File) {
    if (!editor) return;
    setIsUploadingImage(true);
    try {
      const url = await uploadFileToCloudinary(imgFile, "classwork-images");
      editor.chain().focus().setImage({ src: url }).run();
    } catch {
      toast({ title: "Image upload failed — try again.", type: "error" });
    } finally {
      setIsUploadingImage(false);
      if (imageRef.current) imageRef.current.value = "";
    }
  }

  // ── Save ───────────────────────────────────────────────────────────────────

  const saveMutation = useMutation({
    mutationFn: async () => {
      const rawHtml = editor?.getHTML() ?? "";
      const description = sanitize(rawHtml);

      // Validate: any staged images must be inserted before saving.
      const stagedImages = pendingFiles.filter((f) => getAttachmentKind(f.name) === "image");
      if (stagedImages.length > 0) {
        throw new Error("Please insert staged images into the content before saving.");
      }

      // Upload all pending PDF files in parallel.
      const newUrls = await Promise.all(
        pendingFiles.map((f) => uploadFileToCloudinary(f, "classwork")),
      );
      const attachments = [...existingAttachments, ...newUrls];

      const endpoint = isEdit
        ? `/api/classrooms/${classroomId}/materials/${initial!.id}`
        : `/api/classrooms/${classroomId}/materials`;
      return apiRequest(endpoint, {
        method: isEdit ? "PATCH" : "POST",
        body: JSON.stringify({
          title,
          description,
          attachments,
        }),
      }) as Promise<ClassroomMaterial>;
    },
    onSuccess: (saved: ClassroomMaterial) => {
      queryClient.invalidateQueries({ queryKey: ["/api/classrooms", classroomId, "materials"] });
      const slug = saved.slug ?? initial?.slug;
      if (slug) {
        queryClient.invalidateQueries({
          queryKey: ["/api/classrooms", classroomId, "materials", "slug", slug],
        });
      }
      toast({ title: isEdit ? "Classwork updated" : "Classwork created", type: "success" });
      navigate(`/classrooms/${classroomSlug}/classwork`);
    },
    onError: () => toast({ title: "Couldn't save — try again.", type: "error" }),
  });

  const canSave = title.trim().length > 0 && !saveMutation.isPending && !isUploadingImage;

  // ── Shared toolbar button class ────────────────────────────────────────────

  const tbBtn = (active: boolean) =>
    `h-7 w-7 rounded-lg flex items-center justify-center transition-colors ${
      active
        ? "bg-foreground text-background"
        : "text-muted-foreground hover:text-foreground hover:bg-muted"
    }`;

  const sep = <div className="w-px h-4 bg-border mx-0.5" />;

  return (
    <div className="min-h-screen bg-white dark:bg-background">

      {/* ── Top bar ── */}
      <div className="fixed top-0 left-0 right-0 z-20 bg-white/95 dark:bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">

          {/* Left: back crumb */}
          <button
            type="button"
            onClick={goBack}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline font-medium">{classroom.name}</span>
            <span className="sm:hidden font-medium">Back</span>
          </button>

          {/* Center: toolbar */}
          <div className="flex-1 flex justify-center overflow-x-auto">
            <div className="flex items-center gap-0.5 bg-muted/50 rounded-xl px-2 py-1.5 shrink-0">
              {editor && <>
                {/* Undo / Redo */}
                <button type="button" title="Undo"
                  onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().undo().run(); }}
                  className={tbBtn(false)}>
                  <Undo2 className="h-3.5 w-3.5" />
                </button>
                <button type="button" title="Redo"
                  onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().redo().run(); }}
                  className={tbBtn(false)}>
                  <Redo2 className="h-3.5 w-3.5" />
                </button>

                {sep}

                {/* Style dropdown — Radix portal so overflow-x-auto never clips it */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      title="Text style"
                      onMouseDown={(e) => e.preventDefault()}
                      className="h-7 flex items-center gap-1 rounded-lg px-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                      {getCurrentStyle()}
                      <ChevronDown className="h-3 w-3 opacity-60" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="min-w-[130px]">
                    {([
                      { label: "Normal", fn: () => editor.chain().focus().setParagraph().run(), active: getCurrentStyle() === "Normal" },
                      { label: "Heading 1", fn: () => editor.chain().focus().toggleHeading({ level: 1 }).run(), active: getCurrentStyle() === "H1" },
                      { label: "Heading 2", fn: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), active: getCurrentStyle() === "H2" },
                      { label: "Heading 3", fn: () => editor.chain().focus().toggleHeading({ level: 3 }).run(), active: getCurrentStyle() === "H3" },
                    ] as { label: string; fn: () => void; active: boolean }[]).map((item) => (
                      <DropdownMenuItem
                        key={item.label}
                        onMouseDown={(e) => e.preventDefault()}
                        onSelect={() => item.fn()}
                        className={item.active ? "text-primary font-medium" : ""}
                      >
                        {item.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {sep}

                {/* Bold / Italic / Strikethrough */}
                <button type="button" title="Bold"
                  onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleBold().run(); }}
                  className={tbBtn(editor.isActive("bold"))}>
                  <Bold className="h-3.5 w-3.5" />
                </button>
                <button type="button" title="Italic"
                  onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleItalic().run(); }}
                  className={tbBtn(editor.isActive("italic"))}>
                  <Italic className="h-3.5 w-3.5" />
                </button>
                <button type="button" title="Strikethrough"
                  onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleStrike().run(); }}
                  className={tbBtn(editor.isActive("strike"))}>
                  <Strikethrough className="h-3.5 w-3.5" />
                </button>

                {sep}

                {/* Link / Image / Divider */}
                <button type="button" title="Link"
                  onMouseDown={(e) => { e.preventDefault(); handleInsertLink(); }}
                  className={tbBtn(editor.isActive("link"))}>
                  <Link2 className="h-3.5 w-3.5" />
                </button>
                <button type="button" title="Insert image"
                  onMouseDown={(e) => { e.preventDefault(); imageRef.current?.click(); }}
                  disabled={isUploadingImage}
                  className={tbBtn(false)}>
                  {isUploadingImage
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <ImageIcon className="h-3.5 w-3.5" />}
                </button>
                <button type="button" title="Divider"
                  onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().setHorizontalRule().run(); }}
                  className={tbBtn(false)}>
                  <Minus className="h-3.5 w-3.5" />
                </button>

                {/* Table — grid picker when outside a table, context controls when inside */}
                <DropdownMenu onOpenChange={(open) => { if (!open) { setTableHoverRow(0); setTableHoverCol(0); } }}>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      title={editor.isActive("table") ? "Table options" : "Insert table"}
                      onMouseDown={(e) => e.preventDefault()}
                      className={tbBtn(editor.isActive("table"))}
                    >
                      <Table2 className="h-3.5 w-3.5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="p-0">
                    {editor.isActive("table") ? (
                      /* ── Context controls when cursor is inside a table ── */
                      <div className="py-1 min-w-[190px]">
                        <DropdownMenuItem
                          onMouseDown={(e) => e.preventDefault()}
                          onSelect={() => editor.chain().focus().addRowBefore().run()}
                          className="gap-2.5 text-xs"
                        >
                          <RowsIcon className="h-3.5 w-3.5 shrink-0" />
                          Add row above
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onMouseDown={(e) => e.preventDefault()}
                          onSelect={() => editor.chain().focus().addRowAfter().run()}
                          className="gap-2.5 text-xs"
                        >
                          <RowsIcon className="h-3.5 w-3.5 shrink-0" />
                          Add row below
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onMouseDown={(e) => e.preventDefault()}
                          onSelect={() => editor.chain().focus().deleteRow().run()}
                          className="gap-2.5 text-xs text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5 shrink-0" />
                          Delete row
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onMouseDown={(e) => e.preventDefault()}
                          onSelect={() => editor.chain().focus().addColumnBefore().run()}
                          className="gap-2.5 text-xs"
                        >
                          <Columns3 className="h-3.5 w-3.5 shrink-0" />
                          Add column before
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onMouseDown={(e) => e.preventDefault()}
                          onSelect={() => editor.chain().focus().addColumnAfter().run()}
                          className="gap-2.5 text-xs"
                        >
                          <Columns3 className="h-3.5 w-3.5 shrink-0" />
                          Add column after
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onMouseDown={(e) => e.preventDefault()}
                          onSelect={() => editor.chain().focus().deleteColumn().run()}
                          className="gap-2.5 text-xs text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5 shrink-0" />
                          Delete column
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onMouseDown={(e) => e.preventDefault()}
                          onSelect={() => editor.chain().focus().deleteTable().run()}
                          className="gap-2.5 text-xs text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5 shrink-0" />
                          Delete table
                        </DropdownMenuItem>
                      </div>
                    ) : (
                      /* ── Grid picker when cursor is outside a table ── */
                      <div className="p-2">
                        <p className="text-[11px] text-muted-foreground mb-1.5 px-0.5">
                          {tableHoverRow > 0 && tableHoverCol > 0
                            ? `${tableHoverRow} × ${tableHoverCol} table`
                            : "Insert table"}
                        </p>
                        <div
                          className="grid gap-0.5"
                          style={{ gridTemplateColumns: "repeat(6, 1fr)" }}
                          onMouseLeave={() => { setTableHoverRow(0); setTableHoverCol(0); }}
                        >
                          {Array.from({ length: 6 }, (_, r) =>
                            Array.from({ length: 6 }, (_, c) => {
                              const isActive = r < tableHoverRow && c < tableHoverCol;
                              return (
                                <button
                                  key={`${r}-${c}`}
                                  type="button"
                                  onMouseDown={(e) => e.preventDefault()}
                                  onMouseEnter={() => { setTableHoverRow(r + 1); setTableHoverCol(c + 1); }}
                                  onClick={() => {
                                    editor.chain().focus().insertTable({
                                      rows: r + 1,
                                      cols: c + 1,
                                      withHeaderRow: true,
                                    }).run();
                                    setTableHoverRow(0);
                                    setTableHoverCol(0);
                                  }}
                                  className={`w-5 h-5 rounded-sm border transition-colors ${
                                    isActive
                                      ? "bg-primary/20 border-primary/50"
                                      : "bg-muted border-border hover:bg-primary/10"
                                  }`}
                                />
                              );
                            })
                          )}
                        </div>
                      </div>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>

                {sep}

                {/* Bullet / Numbered */}
                <button type="button" title="Bullet list"
                  onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleBulletList().run(); }}
                  className={tbBtn(editor.isActive("bulletList"))}>
                  <List className="h-3.5 w-3.5" />
                </button>
                <button type="button" title="Numbered list"
                  onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleOrderedList().run(); }}
                  className={tbBtn(editor.isActive("orderedList"))}>
                  <ListOrdered className="h-3.5 w-3.5" />
                </button>

                {sep}

                {/* Alignment dropdown — Radix portal so overflow-x-auto never clips it */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      title="Text alignment"
                      onMouseDown={(e) => e.preventDefault()}
                      className="h-7 flex items-center gap-0.5 rounded-lg px-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                      {alignIcons[getCurrentAlign()]}
                      <ChevronDown className="h-3 w-3 opacity-60" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {([
                      { align: "left", label: "Left", icon: <AlignLeft className="h-3.5 w-3.5" /> },
                      { align: "center", label: "Center", icon: <AlignCenter className="h-3.5 w-3.5" /> },
                      { align: "right", label: "Right", icon: <AlignRight className="h-3.5 w-3.5" /> },
                      { align: "justify", label: "Justify", icon: <AlignJustify className="h-3.5 w-3.5" /> },
                    ] as { align: string; label: string; icon: JSX.Element }[]).map((item) => (
                      <DropdownMenuItem
                        key={item.align}
                        onMouseDown={(e) => e.preventDefault()}
                        onSelect={() => editor.chain().focus().setTextAlign(item.align).run()}
                        className={`gap-2.5 ${getCurrentAlign() === item.align ? "text-primary font-medium" : ""}`}
                      >
                        {item.icon}
                        {item.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </>}
            </div>
          </div>

          {/* Right: save */}
          <div className="flex items-center gap-3 shrink-0">
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

      {/* Hidden file inputs */}
      <input ref={imageRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleToolbarImage(f); }} />

      {/* ── Page body ── */}
      <div className="pt-14 flex min-h-screen">

        {/* Writing canvas */}
        <main className="flex-1 flex justify-center">
          <div className="w-full max-w-[680px] px-5 sm:px-8 pt-10 pb-40">

            {/* Breadcrumbs */}
            <Breadcrumb crumbs={[
              { label: "Classrooms", href: "/classrooms" },
              ...(classroom.gradeFolderId && classroom.gradeFolderName
                ? [{ label: classroom.gradeFolderName, href: `/classrooms/folders/${classroom.gradeFolderId}`, current: false as const }]
                : []),
              { label: classroom.name, href: `/classrooms/${classroomSlug}/feed`, current: false },
              { label: "Classwork", href: `/classrooms/${classroomSlug}/classwork`, current: false },
              { label: isEdit ? (initial?.title ?? "Edit Material") : "New Material", current: true },
            ]} className="mb-8" />

            {/* Title */}
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title"
              className="w-full text-4xl sm:text-5xl font-bold text-foreground placeholder:text-muted-foreground/25 bg-transparent border-none outline-none leading-tight mb-3 tracking-tight"
              autoFocus={!isEdit}
            />

            <div className="border-t border-border mb-8" />

            {/* Body — onContextMenu checks whether the right-click target
                is inside a table cell (<td>/<th>). If yes, preventDefault stops
                the browser's native menu and we forward the event (with correct
                clientX/Y) to the virtual Radix ContextMenuTrigger so Radix can
                position and open the table action menu. If no, we return without
                calling preventDefault so the browser shows its native menu as
                usual — the Radix trigger is a separate element and never sees
                these non-table events. */}
            <div
              className="prose prose-sm max-w-none text-foreground
              prose-headings:font-semibold prose-headings:text-foreground
              prose-h1:text-2xl prose-h1:mt-6 prose-h1:mb-2
              prose-h2:text-xl prose-h2:mt-6 prose-h2:mb-2
              prose-h3:text-lg prose-h3:mt-5 prose-h3:mb-1.5
              prose-p:leading-relaxed prose-p:my-2 prose-p:text-foreground/90
              prose-ul:pl-5 prose-ol:pl-5 prose-li:my-0.5
              prose-strong:font-semibold prose-strong:text-foreground
              prose-em:text-foreground/80
              prose-a:text-primary prose-a:underline
              prose-hr:border-border prose-hr:my-6
              prose-img:rounded-xl prose-img:my-4 prose-img:max-w-full"
              onContextMenu={(e) => {
                if (!(e.target as Element).closest("td, th")) return;
                e.preventDefault();
                // Move the editor cursor to the right-clicked cell so that
                // subsequent commands (Add row, Delete column, etc.) act on
                // the cell the user actually clicked, not the previous selection.
                if (editor) {
                  const pos = editor.view.posAtCoords({ left: e.clientX, top: e.clientY });
                  if (pos) editor.commands.setTextSelection(pos.pos);
                }
                virtualTriggerRef.current?.dispatchEvent(
                  new MouseEvent("contextmenu", {
                    bubbles: true,
                    cancelable: true,
                    clientX: e.clientX,
                    clientY: e.clientY,
                  })
                );
              }}
            >
              <EditorContent editor={editor} />
            </div>

            {/* Zero-size fixed anchor — receives the forwarded contextmenu event
                so Radix knows where to position the table action menu. */}
            {editor && (
              <ContextMenu>
                <ContextMenuTrigger asChild>
                  <span
                    ref={virtualTriggerRef}
                    style={{
                      position: "fixed",
                      left: 0,
                      top: 0,
                      width: 0,
                      height: 0,
                      pointerEvents: "none",
                    }}
                  />
                </ContextMenuTrigger>
                <ContextMenuContent>
                  <ContextMenuItem
                    onMouseDown={(e) => e.preventDefault()}
                    onSelect={() => editor.chain().focus().addRowBefore().run()}
                  >
                    <RowsIcon className="h-3.5 w-3.5 shrink-0" />
                    Add row above
                  </ContextMenuItem>
                  <ContextMenuItem
                    onMouseDown={(e) => e.preventDefault()}
                    onSelect={() => editor.chain().focus().addRowAfter().run()}
                  >
                    <RowsIcon className="h-3.5 w-3.5 shrink-0" />
                    Add row below
                  </ContextMenuItem>
                  <ContextMenuItem
                    onMouseDown={(e) => e.preventDefault()}
                    onSelect={() => editor.chain().focus().deleteRow().run()}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5 shrink-0" />
                    Delete row
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuItem
                    onMouseDown={(e) => e.preventDefault()}
                    onSelect={() => editor.chain().focus().addColumnBefore().run()}
                  >
                    <Columns3 className="h-3.5 w-3.5 shrink-0" />
                    Add column before
                  </ContextMenuItem>
                  <ContextMenuItem
                    onMouseDown={(e) => e.preventDefault()}
                    onSelect={() => editor.chain().focus().addColumnAfter().run()}
                  >
                    <Columns3 className="h-3.5 w-3.5 shrink-0" />
                    Add column after
                  </ContextMenuItem>
                  <ContextMenuItem
                    onMouseDown={(e) => e.preventDefault()}
                    onSelect={() => editor.chain().focus().deleteColumn().run()}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5 shrink-0" />
                    Delete column
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuItem
                    onMouseDown={(e) => e.preventDefault()}
                    onSelect={() => editor.chain().focus().deleteTable().run()}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5 shrink-0" />
                    Delete table
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            )}
          </div>
        </main>

        {/* Right settings panel */}
        <aside className="hidden lg:flex flex-col w-72 xl:w-80 shrink-0 border-l border-border bg-background/60 min-h-screen sticky top-14 self-start max-h-[calc(100vh-3.5rem)] overflow-y-auto">
          <div className="px-5 py-6 space-y-6">

            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Settings</p>

            {/* Attachments */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">Attachments</p>
                <button type="button" onClick={() => fileRef.current?.click()}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground border border-border rounded-md px-2 py-0.5 hover:bg-muted/50 transition-colors">
                  <Plus className="h-3 w-3" /><Upload className="h-3 w-3" />
                </button>
                <input ref={fileRef} type="file" multiple accept=".pdf,image/*" className="hidden"
                  onChange={(e) => addFiles(e.target.files)} />
              </div>

              {/* Saved attachments */}
              {existingAttachments.map((url, i) => (
                <div key={url} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-border bg-muted/20">
                  <FileText className="h-4 w-4 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground">PDF {existingAttachments.length > 1 ? i + 1 : ""}</p>
                    <a href={url} target="_blank" rel="noopener noreferrer"
                      className="text-[11px] text-primary hover:underline">Open PDF</a>
                  </div>
                  <button type="button"
                    onClick={() => setExistingAttachments((prev) => prev.filter((_, j) => j !== i))}
                    className="shrink-0 h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:text-red-500 transition-colors">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}

              {/* Pending (staged) files */}
              {pendingFiles.map((f) => {
                const kind = getAttachmentKind(f.name);
                return (
                  <div key={`${f.name}-${f.size}`} className="space-y-2">
                    <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-border bg-muted/20">
                      {kind === "pdf"
                        ? <FileText className="h-4 w-4 text-primary shrink-0" />
                        : <ImageIcon className="h-4 w-4 text-primary shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{f.name}</p>
                        <p className="text-[11px] text-muted-foreground">{(f.size / (1024 * 1024)).toFixed(1)} MB</p>
                      </div>
                      <button type="button"
                        onClick={() => setPendingFiles((prev) => prev.filter((_, j) => j !== i))}
                        className="shrink-0 h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    {kind === "image" && (
                      <Button size="sm" variant="outline" className="w-full gap-1.5 h-7 text-xs"
                        onClick={() => handleInsertImage(f)} disabled={isUploadingImage}>
                        {isUploadingImage
                          ? <><Loader2 className="h-3 w-3 animate-spin" /> Uploading…</>
                          : <><ImageIcon className="h-3 w-3" /> Insert into content</>}
                      </Button>
                    )}
                    {kind === "pdf" && (
                      <p className="text-[11px] text-muted-foreground">Will be saved as an attachment.</p>
                    )}
                  </div>
                );
              })}

              {/* Drop zone */}
              {existingAttachments.length === 0 && pendingFiles.length === 0 && (
                <div
                  className="w-full flex flex-col items-center gap-1.5 px-3 py-5 rounded-xl border-2 border-dashed border-border hover:border-primary/40 hover:bg-muted/20 transition-all text-center cursor-pointer"
                  onClick={() => fileRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
                >
                  <Upload className="h-4 w-4 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">
                    Drop or <span className="text-primary">browse</span>
                  </p>
                  <p className="text-[10px] text-muted-foreground/60">Images · PDFs · Max 10 MB</p>
                </div>
              )}
            </div>

            <div className="border-t border-border" />

            {/* Linked assignments (read-only — set from the assignment's edit page) */}
            {initial && (initial.linkedAssignmentIds ?? []).length > 0 && (
              <div className="space-y-1.5">
                <p className="text-sm font-medium text-foreground">Linked assignments</p>
                {(initial.linkedAssignmentIds ?? []).map((aid) => {
                  const a = assignments.find((x) => x.id === aid);
                  return a ? (
                    <div key={aid} className="flex items-center gap-2 text-xs text-primary bg-primary/8 rounded-lg px-3 py-1.5">
                      <BookOpen className="h-3 w-3 shrink-0" />
                      <span className="truncate">{a.title}</span>
                    </div>
                  ) : null;
                })}
              </div>
            )}
          </div>
        </aside>

        {/* Mobile settings — bottom sheet */}
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
              <button type="button" onClick={() => fileRef.current?.click()}
                className="w-full flex items-center justify-center gap-1.5 text-xs border border-border rounded-lg py-2 hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground">
                <Upload className="h-3.5 w-3.5" /> Attach file
              </button>
              {existingAttachments.map((url, i) => (
                <div key={url} className="flex items-center gap-3 px-3 py-2 rounded-lg border border-border">
                  <FileText className="h-4 w-4 text-primary shrink-0" />
                  <p className="text-sm flex-1 truncate">PDF {existingAttachments.length > 1 ? i + 1 : ""}</p>
                  <button type="button"
                    onClick={() => setExistingAttachments((prev) => prev.filter((_, j) => j !== i))}>
                    <X className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>
              ))}
              {pendingFiles.map((f) => {
                const kind = getAttachmentKind(f.name);
                return (
                  <div key={`${f.name}-${f.size}`} className="space-y-2">
                    <div className="flex items-center gap-3 px-3 py-2 rounded-lg border border-border">
                      {kind === "pdf"
                        ? <FileText className="h-4 w-4 text-primary shrink-0" />
                        : <ImageIcon className="h-4 w-4 text-primary shrink-0" />}
                      <p className="text-sm flex-1 truncate">{f.name}</p>
                      <button type="button"
                        onClick={() => setPendingFiles((prev) => prev.filter((_, j) => j !== i))}>
                        <X className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </div>
                    {kind === "image" && (
                      <Button size="sm" variant="outline" className="w-full gap-1.5 h-8 text-xs"
                        onClick={() => handleInsertImage(f)} disabled={isUploadingImage}>
                        {isUploadingImage
                          ? <><Loader2 className="h-3 w-3 animate-spin" /> Uploading…</>
                          : <><ImageIcon className="h-3 w-3" /> Insert into content</>}
                      </Button>
                    )}
                  </div>
                );
              })}
              {initial && (initial.linkedAssignmentIds ?? []).length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Linked assignments</p>
                  {(initial.linkedAssignmentIds ?? []).map((aid) => {
                    const a = assignments.find((x) => x.id === aid);
                    return a ? (
                      <div key={aid} className="flex items-center gap-2 text-xs text-primary bg-primary/8 rounded-lg px-3 py-1.5">
                        <BookOpen className="h-3 w-3 shrink-0" /><span className="truncate">{a.title}</span>
                      </div>
                    ) : null;
                  })}
                </div>
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

  const { data: assignments = [] } = useQuery<ClassroomAssignment[]>({
    queryKey: ["/api/classrooms", classroomId, "assignments"],
    queryFn: () => apiRequest(`/api/classrooms/${classroomId}/assignments`),
    enabled: !!classroomId && (material.linkedAssignmentIds ?? []).length > 0,
  });

  const backHref = `/classrooms/${classroomSlug}/classwork${
    isParent && parentStudentId ? `?studentId=${parentStudentId}` : ""
  }`;
  const goBack = useGoBack(backHref);

  useEffect(() => {
    if (isTeacher) return;
    apiRequest(`/api/classrooms/${classroomId}/materials/${material.id}/seen`, { method: "POST" }).catch(() => {});
  }, [classroomId, material.id, isTeacher]);

  const urlKind = material.url ? getAttachmentKind(material.url) : null;
  const linkedAssignments = (material.linkedAssignmentIds ?? [])
    .map((aid) => assignments.find((a) => a.id === aid))
    .filter(Boolean) as ClassroomAssignment[];

  const hasBody = material.description &&
    material.description !== "<p></p>" &&
    material.description.trim() !== "";

  const legacyPdfUrl = urlKind === "pdf" ? material.url ?? null : null;
  const newAttachments = material.attachments ?? [];
  const allPdfAttachments = legacyPdfUrl && !newAttachments.includes(legacyPdfUrl)
    ? [legacyPdfUrl, ...newAttachments]
    : newAttachments;

  return (
    <div className="flex min-h-screen bg-background">
      <ModernSidebar />
      <div className="flex-1 md:ml-[228px] overflow-auto">
        <div className="max-w-3xl mx-auto px-4 sm:px-8 pt-20 pb-20 md:pt-10">

          <Breadcrumb crumbs={buildClassroomCrumbs({
            role: isParent ? "parent" : isTeacher ? "teacher" : "student",
            classroomName: classroom.name,
            classroomHref: `/classrooms/${classroomSlug}/feed`,
            tabLabel: "Classwork",
            tabHref: backHref,
            search: isParent && parentStudentId ? `?studentId=${parentStudentId}` : "",
            folderName: classroom.gradeFolderName ?? undefined,
            folderHref: classroom.gradeFolderId
              ? `/classrooms/folders/${classroom.gradeFolderId}${isParent && parentStudentId ? `?studentId=${parentStudentId}` : ""}`
              : undefined,
          }).concat({ label: material.title, current: true })} className="mb-8" />

          <div className="mb-8 pb-6 border-b border-border">
            <h1 className="text-3xl font-bold text-foreground leading-tight mb-3">
              {material.title}
            </h1>
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

          {hasBody && (
            <div className="mb-10">
              <RichContent html={material.description!} />
            </div>
          )}

          {allPdfAttachments.length > 0 && (
            <div className="mb-6 space-y-3">
              {allPdfAttachments.map((pdfUrl, i) => (
                <div key={pdfUrl} className="rounded-2xl border border-border bg-card p-4 flex items-center gap-3 shadow-sm">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-red-50 text-red-600">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">
                      {allPdfAttachments.length > 1 ? `PDF Attachment ${i + 1}` : "PDF Attachment"}
                    </p>
                    <a
                      href={pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-primary hover:underline flex items-center gap-1"
                    >
                      Open PDF
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}

          {urlKind === "link" && material.url && (
            <div className="mb-6 rounded-2xl border border-border bg-card p-4 flex items-center gap-3 shadow-sm">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-sky-50 text-sky-600">
                <Paperclip className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">Link</p>
                <a
                  href={material.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-primary hover:underline flex items-center gap-1"
                >
                  View attachment
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          )}

          {linkedAssignments.length > 0 && (
            <div className="space-y-3">
              {linkedAssignments.map((a) => {
                const href = `/classrooms/${classroomSlug}/classwork/${a.slug ?? a.id}`;
                return (
                  <div key={a.id} className="rounded-2xl border border-primary/25 bg-primary/5 p-5 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-1">
                        Linked Assignment
                      </p>
                      <p className="text-base font-semibold text-foreground leading-snug truncate">
                        {a.title}
                      </p>
                    </div>
                    <Button size="sm" className="gap-1.5 shrink-0 h-9 px-4" onClick={() => navigate(href)}>
                      Start <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                );
              })}
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
  const goBack = useGoBack(`/classrooms/${classroomSlug}/classwork`);
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
          <Button variant="outline" size="sm" onClick={goBack}>Back to Dashboard</Button>
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
          <Button variant="outline" size="sm" onClick={goBack}>
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

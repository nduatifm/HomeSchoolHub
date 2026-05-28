import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";
import ModernSidebar from "@/components/ModernSidebar";
import ClassroomCard from "@/components/ClassroomCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  School,
  FolderOpen,
  Folder,
  FolderInput,
  Plus,
  Loader2,
  MoreVertical,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
  Users,
  Check,
  Archive,
  RotateCcw,
  Info,
  Clock,
  LayoutGrid,
  BookOpen,
  AlertTriangle,
  CircleCheck,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ConfirmDialog from "@/components/ConfirmDialog";
import type { Classroom, GradeFolder } from "@shared/schema";
import type { ClassroomNotification, ClassroomNotificationsMap } from "@/lib/classroomNotifications";

// ─── Shared types ────────────────────────────────────────────────────────────

type TeacherStudent = { id: number; name: string; email: string; gradeLevel?: string | null };
type DeletedClassroom = Classroom & { deletedAt: string };
type StudentChild = { id: number; name: string; gradeLevel?: string | null };

// ─── Teacher/student helpers ─────────────────────────────────────────────────

const GRACE_DAYS = 30;
const GRACE_MS = GRACE_DAYS * 24 * 60 * 60 * 1000;

function formatTimeRemaining(deletedAt: string): string {
  const expiresAt = new Date(deletedAt).getTime() + GRACE_MS;
  const msLeft = expiresAt - Date.now();
  if (msLeft <= 0) return "Expiring soon";
  const daysLeft = Math.floor(msLeft / (1000 * 60 * 60 * 24));
  if (daysLeft >= 1) return `Permanently deleted in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`;
  const hoursLeft = Math.floor(msLeft / (1000 * 60 * 60));
  if (hoursLeft >= 1) return `Permanently deleted in ${hoursLeft} hour${hoursLeft === 1 ? "" : "s"}`;
  return "Permanently deleted in less than an hour";
}

function formatDeletedAgo(deletedAt: string): string {
  const ms = Date.now() - new Date(deletedAt).getTime();
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  if (days >= 1) return `Deleted ${days} day${days === 1 ? "" : "s"} ago`;
  const hours = Math.floor(ms / (1000 * 60 * 60));
  if (hours >= 1) return `Deleted ${hours} hour${hours === 1 ? "" : "s"} ago`;
  return "Deleted just now";
}

// ─── Parent view helpers ─────────────────────────────────────────────────────

const AVATAR_COLORS = [
  { bg: "#E1F5EE", color: "#0F6E56" },
  { bg: "#EEEDFE", color: "#3C3489" },
  { bg: "#FAEEDA", color: "#633806" },
  { bg: "#FBEAF0", color: "#993556" },
  { bg: "#E6F1FB", color: "#185FA5" },
];

const ICON_COLORS = [
  { bg: "#E6F1FB", color: "#185FA5" },
  { bg: "#EAF3DE", color: "#3B6D11" },
  { bg: "#FBEAF0", color: "#993556" },
  { bg: "#FAEEDA", color: "#633806" },
  { bg: "#E1F5EE", color: "#0F6E56" },
  { bg: "#EEEDFE", color: "#3C3489" },
];

const SUBJECT_ICON_MAP: Record<string, string> = {
  math:       "ti-math",
  algebra:    "ti-math",
  geometry:   "ti-math",
  calculus:   "ti-math",
  science:    "ti-flask",
  biology:    "ti-leaf",
  chemistry:  "ti-atom",
  physics:    "ti-rocket",
  history:    "ti-world",
  geography:  "ti-map",
  english:    "ti-book",
  literature: "ti-book",
  writing:    "ti-pencil",
  art:        "ti-palette",
  music:      "ti-music",
  pe:         "ti-run",
  physical:   "ti-run",
  language:   "ti-language",
  spanish:    "ti-language",
  french:     "ti-language",
  latin:      "ti-language",
};

function childInitials(name: string) {
  return name.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase();
}

function subjectIcon(subject: string): string {
  const lower = subject.toLowerCase();
  for (const [key, icon] of Object.entries(SUBJECT_ICON_MAP)) {
    if (lower.includes(key)) return icon;
  }
  return "ti-books";
}

function iconColorFor(index: number) {
  return ICON_COLORS[index % ICON_COLORS.length];
}

type StatusVariant = "ok" | "due" | "overdue" | "new";

function classroomStatus(
  classroom: Classroom,
  notifMap: ClassroomNotificationsMap
): { variant: StatusVariant; label: string } {
  const n = notifMap[classroom.id];
  if (!n) return { variant: "ok", label: "On track" };
  if ((n.dueCount ?? 0) > 0)     return { variant: "overdue", label: `${n.dueCount} overdue` };
  if ((n.dueSoonCount ?? 0) > 0) return { variant: "due", label: "Due soon" };
  if ((n.newCount ?? 0) > 0 || (n.newMaterialsCount ?? 0) > 0)
    return { variant: "new", label: "New material" };
  return { variant: "ok", label: "On track" };
}

function childSummaryChips(classrooms: Classroom[], notifMap: ClassroomNotificationsMap) {
  let overdue = 0, dueSoon = 0, hasNew = false;
  for (const c of classrooms) {
    const n = notifMap[c.id];
    if (!n) continue;
    overdue  += n.dueCount ?? 0;
    dueSoon  += n.dueSoonCount ?? 0;
    if ((n.newCount ?? 0) > 0 || (n.newMaterialsCount ?? 0) > 0) hasNew = true;
  }
  const chips: { label: string; variant: "danger" | "warn" | "new" | "ok" }[] = [];
  if (overdue > 0)     chips.push({ label: `${overdue} overdue`, variant: "danger" });
  else if (dueSoon > 0) chips.push({ label: `${dueSoon} due soon`, variant: "warn" });
  if (hasNew)          chips.push({ label: "New materials", variant: "new" });
  if (chips.length === 0) chips.push({ label: "All on track", variant: "ok" });
  return chips;
}

const STATUS_STYLES: Record<StatusVariant, string> = {
  ok:      "text-green-700 dark:text-green-400",
  due:     "text-amber-700 dark:text-amber-400",
  overdue: "text-red-700 dark:text-red-400",
  new:     "text-primary",
};

const STATUS_ICONS: Record<StatusVariant, React.ReactNode> = {
  ok:      <CircleCheck className="h-3 w-3 shrink-0" />,
  due:     <Clock className="h-3 w-3 shrink-0" />,
  overdue: <AlertTriangle className="h-3 w-3 shrink-0" />,
  new:     <BookOpen className="h-3 w-3 shrink-0" />,
};

const CHIP_STYLES: Record<"danger" | "warn" | "new" | "ok", string> = {
  danger: "bg-red-50   dark:bg-red-950   text-red-800   dark:text-red-300   border-red-200   dark:border-red-800",
  warn:   "bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  new:    "bg-primary/5 text-primary border-primary/20",
  ok:     "bg-muted/40 text-muted-foreground border-border",
};

// ─── Parent view sub-component ───────────────────────────────────────────────

function ParentClassroomsView({
  children,
  classroomsByChild,
  notifMapByChild,
  navigate,
}: {
  children: StudentChild[];
  classroomsByChild: Record<number, Classroom[]>;
  notifMapByChild: Record<number, ClassroomNotificationsMap>;
  navigate: (path: string) => void;
}) {
  const totalSubjects = Object.values(classroomsByChild).reduce((sum, cls) => sum + cls.length, 0);

  if (children.length === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground text-sm rounded-xl border border-dashed border-border">
        No children linked to your account yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <School className="h-4.5 w-4.5 text-primary" />
          Classrooms
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          {children.length} {children.length === 1 ? "child" : "children"} · {totalSubjects} subjects total
        </p>
      </div>

      {/* One card per child */}
      {children.map((child, childIndex) => {
        const avatarColor = AVATAR_COLORS[childIndex % AVATAR_COLORS.length];
        const classrooms  = classroomsByChild[child.id] ?? [];
        const notifMap    = notifMapByChild[child.id]   ?? {};
        const chips       = childSummaryChips(classrooms, notifMap);

        // Split into grade folders and ungrouped
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
        const folders    = Array.from(folderMap.values());
        const hasFolders = folders.length > 0;

        return (
          <div key={child.id} className="rounded-xl border border-border overflow-hidden">

            {/* ── Child header ── */}
            <div className="flex items-center gap-3 px-4 py-3 bg-muted/20 border-b border-border">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
                style={{ background: avatarColor.bg, color: avatarColor.color }}
              >
                {childInitials(child.name)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground leading-none">{child.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {child.gradeLevel ? `${child.gradeLevel} · ` : ""}
                  {classrooms.length} {classrooms.length === 1 ? "subject" : "subjects"}
                </p>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap justify-end">
                {chips.map((chip, i) => (
                  <span
                    key={i}
                    className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border ${CHIP_STYLES[chip.variant]}`}
                  >
                    {chip.variant === "danger" && <AlertTriangle className="h-3 w-3" />}
                    {chip.variant === "warn"   && <Clock className="h-3 w-3" />}
                    {chip.variant === "ok"     && <CircleCheck className="h-3 w-3" />}
                    {chip.variant === "new"    && <BookOpen className="h-3 w-3" />}
                    {chip.label}
                  </span>
                ))}
              </div>
            </div>

            {/* ── Grade folders ── */}
            {hasFolders && (
              <div className="px-4 pt-3 pb-1">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-2">
                  <Folder className="h-3 w-3" />
                  Grade folders
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 mb-2">
                  {folders.map(folder => {
                    const folderOverdue = folder.classrooms.reduce((sum, c) => sum + (notifMap[c.id]?.dueCount ?? 0), 0);
                    const folderDueSoon = folder.classrooms.reduce((sum, c) => sum + (notifMap[c.id]?.dueSoonCount ?? 0), 0);
                    const badgeCount = folderOverdue || folderDueSoon;
                    const badgeColor = folderOverdue ? "bg-red-500" : folderDueSoon ? "bg-amber-500" : "";
                    return (
                      <button
                        key={folder.id}
                        onClick={() => navigate(`/classrooms/folders/${folder.id}`)}
                        className="relative w-full text-left rounded-lg border border-border overflow-hidden bg-card hover:shadow-sm hover:-translate-y-0.5 transition-all duration-150 active:scale-[0.985]"
                      >
                        {badgeCount > 0 && (
                          <span className={`absolute top-1.5 right-1.5 z-10 min-w-[16px] h-4 px-1 rounded-full text-[10px] font-bold text-white flex items-center justify-center ${badgeColor}`}>
                            {badgeCount > 9 ? "9+" : badgeCount}
                          </span>
                        )}
                        <div className="h-10 bg-primary/10 flex items-center justify-center">
                          <Folder className="h-5 w-5 text-primary opacity-60" />
                        </div>
                        <div className="px-2.5 py-2">
                          <p className="text-xs font-semibold text-foreground truncate">{folder.name}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {folder.classrooms.length} {folder.classrooms.length === 1 ? "subject" : "subjects"}
                          </p>
                          <div className="flex items-center justify-between mt-1.5">
                            <span className="text-[11px] font-semibold text-primary">Open</span>
                            <ChevronRight className="h-3 w-3 text-primary opacity-60" />
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Divider between folders and ungrouped rows */}
            {hasFolders && ungrouped.length > 0 && (
              <div className="h-px bg-border mx-4" />
            )}

            {/* ── Classroom rows ── */}
            {ungrouped.length > 0 && (
              <div className="px-4 pt-2.5 pb-3">
                {hasFolders && (
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-2">
                    <LayoutGrid className="h-3 w-3" />
                    Other classes
                  </p>
                )}
                <div className="flex flex-col gap-1.5">
                  {ungrouped.map((c, idx) => {
                    const iconClass = subjectIcon(c.subject ?? "");
                    const iconColor = iconColorFor(idx);
                    const status    = classroomStatus(c, notifMap);
                    return (
                      <button
                        key={c.id}
                        onClick={() => navigate(`/classrooms/${c.slug ?? c.id}`)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border bg-background hover:bg-muted/30 transition-colors text-left"
                      >
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                          style={{ background: iconColor.bg, color: iconColor.color }}
                        >
                          <i className={`ti ${iconClass}`} aria-hidden="true" style={{ fontSize: 15 }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate leading-snug">{c.name}</p>
                          {c.subject && (
                            <p className="text-xs text-muted-foreground truncate">{c.subject}</p>
                          )}
                        </div>
                        <div className={`flex items-center gap-1 text-xs font-medium shrink-0 ${STATUS_STYLES[status.variant]}`}>
                          {STATUS_ICONS[status.variant]}
                          <span>{status.label}</span>
                        </div>
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0 opacity-50" />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Empty state per child */}
            {classrooms.length === 0 && (
              <div className="px-4 py-6 text-center text-xs text-muted-foreground">
                {child.name} hasn't been enrolled in any classrooms yet.
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function ClassroomsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const isTeacher = user?.roles?.includes("teacher") || user?.role === "teacher";
  const isParent  = !isTeacher && (user?.role === "parent" || user?.roles?.includes("parent"));
  const isStudent = !isTeacher && !isParent && (user?.role === "student" || user?.roles?.includes("student"));

  // ── Teacher / student queries ──
  const { data: classrooms = [], isLoading: classroomsLoading } = useQuery<Classroom[]>({
    queryKey: ["/api/classrooms"],
    enabled: isTeacher || isStudent,
  });

  const { data: deletedClassrooms = [] } = useQuery<DeletedClassroom[]>({
    queryKey: ["/api/classrooms/trash"],
    enabled: isTeacher,
    refetchInterval: 60_000,
  });

  const { data: teacherStudents = [] } = useQuery<TeacherStudent[]>({
    queryKey: ["/api/students/teacher"],
    enabled: isTeacher,
  });

  const { data: folders = [], isLoading: foldersLoading } = useQuery<GradeFolder[]>({
    queryKey: ["/api/grade-folders"],
    enabled: isTeacher,
  });

  const { data: classroomStats = {} as Record<number, { toGradeCount: number }> } = useQuery<Record<number, { toGradeCount: number }>>({
    queryKey: ["/api/teacher/classroom-stats"],
    enabled: isTeacher,
    refetchInterval: 30_000,
  });

  const { data: studentMe } = useQuery<{ id: number }>({
    queryKey: ["/api/students/me"],
    queryFn: () => apiRequest("/api/students/me"),
    enabled: isStudent,
  });

  const { data: studentNotifMap = {} as ClassroomNotificationsMap } = useQuery<ClassroomNotificationsMap>({
    queryKey: ["/api/students", studentMe?.id, "classroom-notifications"],
    queryFn: () => apiRequest(`/api/students/${studentMe!.id}/classroom-notifications`),
    enabled: isStudent && !!studentMe?.id,
    refetchInterval: 15_000,
  });

  // ── Parent queries ──
  const { data: parentChildren = [], isLoading: parentChildrenLoading } = useQuery<StudentChild[]>({
    queryKey: ["/api/parent/children"],
    enabled: isParent,
  });

  const { data: classroomsByChild = {} as Record<number, Classroom[]> } = useQuery<Record<number, Classroom[]>>({
    queryKey: ["/api/parent/classrooms-by-child"],
    enabled: isParent,
  });

  const { data: notifMapByChild = {} as Record<number, ClassroomNotificationsMap> } = useQuery<Record<number, ClassroomNotificationsMap>>({
    queryKey: ["/api/parent/notifications-by-child"],
    enabled: isParent,
    refetchInterval: 30_000,
  });

  // ── UI state ──
  const [collapsedArchived, setCollapsedArchived] = useState(true);
  const [collapsedTrash, setCollapsedTrash] = useState(false);

  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  const [editFolderOpen, setEditFolderOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<GradeFolder | null>(null);
  const [editFolderName, setEditFolderName] = useState("");

  const [newClassroomOpen, setNewClassroomOpen] = useState(false);
  const [newClassroomFolderId, setNewClassroomFolderId] = useState<number | null>(null);
  const [newClassroomForm, setNewClassroomForm] = useState({ name: "", subject: "", description: "" });
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<number>>(new Set());
  const [studentSearch, setStudentSearch] = useState("");
  const [movingClassroomId, setMovingClassroomId] = useState<number | null>(null);

  const [editClassroomOpen, setEditClassroomOpen] = useState(false);
  const [editingClassroom, setEditingClassroom] = useState<Classroom | null>(null);
  const [editClassroomForm, setEditClassroomForm] = useState({ name: "", subject: "", description: "" });

  const [deleteClassroomOpen, setDeleteClassroomOpen] = useState(false);
  const [deletingClassroom, setDeletingClassroom] = useState<Classroom | null>(null);

  const [restoringId, setRestoringId] = useState<number | null>(null);
  const [permanentDeletingId, setPermanentDeletingId] = useState<number | null>(null);
  const [deletingFolderId, setDeletingFolderId] = useState<number | null>(null);
  const [permanentDeleteId, setPermanentDeleteId] = useState<number | null>(null);

  // ── Mutations ──
  const createFolderMutation = useMutation({
    mutationFn: () => apiRequest("/api/grade-folders", { method: "POST", body: JSON.stringify({ name: newFolderName }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/grade-folders"] });
      toast({ title: "Folder created.", type: "success" });
      setNewFolderOpen(false);
      setNewFolderName("");
    },
    onError: () => toast({ title: "Couldn't create the folder — try again.", type: "error" }),
  });

  const renameFolderMutation = useMutation({
    mutationFn: () => apiRequest(`/api/grade-folders/${editingFolder!.id}`, { method: "PATCH", body: JSON.stringify({ name: editFolderName }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/grade-folders"] });
      toast({ title: "Folder renamed.", type: "success" });
      setEditFolderOpen(false);
      setEditingFolder(null);
      setEditFolderName("");
    },
    onError: () => toast({ title: "Couldn't rename — try again.", type: "error" }),
  });

  const deleteFolderMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/grade-folders/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/grade-folders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/classrooms"] });
      toast({ title: "Folder deleted.", type: "success" });
    },
    onError: () => toast({ title: "Couldn't delete the folder — try again.", type: "error" }),
  });

  const createClassroomMutation = useMutation({
    mutationFn: async () => {
      const classroom = await apiRequest("/api/classrooms", {
        method: "POST",
        body: JSON.stringify({ ...newClassroomForm, gradeFolderId: newClassroomFolderId ?? null }),
      }) as Classroom;
      const enrollIds = Array.from(selectedStudentIds);
      let failedCount = 0;
      for (const studentId of enrollIds) {
        try {
          await apiRequest(`/api/classrooms/${classroom.id}/enroll`, {
            method: "POST",
            body: JSON.stringify({ studentId }),
          });
        } catch { failedCount++; }
      }
      return { classroom, failedCount };
    },
    onSuccess: ({ failedCount }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/classrooms"] });
      queryClient.invalidateQueries({ queryKey: ["/api/teacher/classroom-stats"] });
      const enrolled = selectedStudentIds.size - failedCount;
      if (failedCount === 0 && enrolled > 0) {
        toast({ title: `Classroom created & ${enrolled} student${enrolled === 1 ? "" : "s"} enrolled!`, type: "success" });
      } else if (failedCount > 0) {
        toast({ title: "Classroom created", description: `${enrolled} enrolled; ${failedCount} couldn't be added.`, type: "warning" });
      } else {
        toast({ title: "Classroom created!", type: "success" });
      }
      setNewClassroomOpen(false);
      setNewClassroomForm({ name: "", subject: "", description: "" });
      setNewClassroomFolderId(null);
      setSelectedStudentIds(new Set());
      setStudentSearch("");
    },
    onError: () => toast({ title: "Couldn't create the classroom — try again.", type: "error" }),
  });

  const moveClassroomMutation = useMutation({
    mutationFn: ({ classroomId, folderId }: { classroomId: number; folderId: number | null }) =>
      apiRequest(`/api/classrooms/${classroomId}`, { method: "PATCH", body: JSON.stringify({ gradeFolderId: folderId }) }),
    onMutate: ({ classroomId }) => setMovingClassroomId(classroomId),
    onSuccess: (_, { folderId }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/classrooms"] });
      const folderName = folderId !== null ? folders.find(f => f.id === folderId)?.name : null;
      toast({ title: folderName ? `Moved to ${folderName}` : "Moved to Other Classrooms", type: "success" });
      setMovingClassroomId(null);
    },
    onError: () => { toast({ title: "Couldn't move — try again.", type: "error" }); setMovingClassroomId(null); },
  });

  const editClassroomMutation = useMutation({
    mutationFn: () => apiRequest(`/api/classrooms/${editingClassroom!.id}`, { method: "PATCH", body: JSON.stringify(editClassroomForm) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/classrooms"] });
      toast({ title: "Classroom updated!", type: "success" });
      setEditClassroomOpen(false);
      setEditingClassroom(null);
    },
    onError: () => toast({ title: "Couldn't update — try again.", type: "error" }),
  });

  const archiveClassroomMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      apiRequest(`/api/classrooms/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/classrooms"] });
      toast({ title: status === "archived" ? "Classroom archived." : "Classroom restored to active.", type: "success" });
    },
    onError: () => toast({ title: "Couldn't update — try again.", type: "error" }),
  });

  const deleteClassroomMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/classrooms/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/classrooms"] });
      queryClient.invalidateQueries({ queryKey: ["/api/classrooms/trash"] });
      queryClient.invalidateQueries({ queryKey: ["/api/teacher/classroom-stats"] });
      setDeleteClassroomOpen(false);
      setDeletingClassroom(null);
      toast({
        title: "Classroom moved to Recently Deleted.",
        description: "It will be permanently removed after 30 days.",
        type: "success",
      });
      setCollapsedTrash(false);
    },
    onError: () => toast({ title: "Couldn't delete — try again.", type: "error" }),
  });

  const trashRestoreMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/classrooms/${id}/restore`, { method: "POST" }),
    onMutate: (id) => setRestoringId(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/classrooms"] });
      queryClient.invalidateQueries({ queryKey: ["/api/classrooms/trash"] });
      queryClient.invalidateQueries({ queryKey: ["/api/teacher/classroom-stats"] });
      toast({ title: "Classroom restored.", type: "success" });
      setRestoringId(null);
    },
    onError: () => { toast({ title: "Couldn't restore — try again.", type: "error" }); setRestoringId(null); },
  });

  const permanentDeleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/classrooms/${id}/permanent`, { method: "DELETE" }),
    onMutate: (id) => setPermanentDeletingId(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/classrooms/trash"] });
      toast({ title: "Classroom permanently deleted.", type: "success" });
      setPermanentDeletingId(null);
    },
    onError: () => { toast({ title: "Couldn't delete — try again.", type: "error" }); setPermanentDeletingId(null); },
  });

  // ── Helpers ──
  const openEditClassroom = (c: Classroom) => {
    setEditingClassroom(c);
    setEditClassroomForm({ name: c.name, subject: c.subject ?? "", description: c.description ?? "" });
    setEditClassroomOpen(true);
  };

  const openNewClassroom = (folderId: number | null) => {
    setNewClassroomFolderId(folderId);
    setNewClassroomForm({ name: "", subject: "", description: "" });
    setNewClassroomOpen(true);
  };

  const openEditFolder = (folder: GradeFolder) => {
    setEditingFolder(folder);
    setEditFolderName(folder.name);
    setEditFolderOpen(true);
  };

  const activeClassrooms  = classrooms.filter(c => c.status !== "archived");
  const archivedClassrooms = classrooms.filter(c => c.status === "archived");

  const classroomsByFolder: Record<number | "none", Classroom[]> = { none: [] };
  for (const c of activeClassrooms) {
    const key = c.gradeFolderId ?? "none";
    if (!classroomsByFolder[key]) classroomsByFolder[key] = [];
    classroomsByFolder[key].push(c);
  }

  const notifForClassroom = (c: Classroom): ClassroomNotification | null => {
    if (isTeacher) {
      const stats = classroomStats[c.id];
      if (!stats || stats.toGradeCount === 0) return null;
      return { pendingCount: stats.toGradeCount, newMaterialsCount: 0, newPostsCount: 0, newCount: 0, dueCount: 0, dueSoonCount: 0, total: stats.toGradeCount };
    }
    return studentNotifMap[c.id] ?? null;
  };

  const folderPendingCount = (folder: GradeFolder): number =>
    (classroomsByFolder[folder.id] ?? []).reduce((sum, c) => sum + (classroomStats[c.id]?.toGradeCount ?? 0), 0);

  const renderCard = (c: Classroom, isArchived = false) => {
    const isMoving = movingClassroomId === c.id;
    return (
      <div key={c.id} className="relative group/card">
        <ClassroomCard
          classroom={c}
          href={`/classrooms/${c.slug ?? c.id}`}
          ctaLabel={isTeacher ? "Open Classroom" : undefined}
          notification={notifForClassroom(c)}
        />
        {isTeacher && (
          <div
            className="absolute top-2 right-2 z-20 opacity-0 group-hover/card:opacity-100 focus-within:opacity-100 transition-opacity"
            onClick={e => e.stopPropagation()}
          >
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 bg-white/80 backdrop-blur-sm hover:bg-white shadow-sm rounded-full"
                  disabled={isMoving}
                >
                  {isMoving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MoreVertical className="h-3.5 w-3.5" />}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem className="gap-2 text-sm" onClick={() => openEditClassroom(c)}>
                  <Pencil className="h-3.5 w-3.5 shrink-0" />Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="gap-2 text-sm"
                  onClick={() => archiveClassroomMutation.mutate({ id: c.id, status: isArchived ? "active" : "archived" })}
                >
                  <Archive className="h-3.5 w-3.5 shrink-0" />
                  {isArchived ? "Unarchive" : "Archive"}
                </DropdownMenuItem>
                {!isArchived && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger className="gap-2 text-sm">
                        <FolderInput className="h-3.5 w-3.5 shrink-0" />Move to…
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent>
                        <DropdownMenuItem
                          className="gap-2"
                          disabled={c.gradeFolderId === null}
                          onClick={() => { if (c.gradeFolderId !== null) moveClassroomMutation.mutate({ classroomId: c.id, folderId: null }); }}
                        >
                          <Folder className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="flex-1">No folder (Other Classrooms)</span>
                          {c.gradeFolderId === null && <Check className="h-3 w-3 text-primary shrink-0" />}
                        </DropdownMenuItem>
                        {folders.length > 0 && <DropdownMenuSeparator />}
                        {folders.map(f => (
                          <DropdownMenuItem
                            key={f.id}
                            className="gap-2"
                            disabled={c.gradeFolderId === f.id}
                            onClick={() => { if (c.gradeFolderId !== f.id) moveClassroomMutation.mutate({ classroomId: c.id, folderId: f.id }); }}
                          >
                            <Folder className="h-3.5 w-3.5 text-primary shrink-0" />
                            <span className="flex-1 truncate">{f.name}</span>
                            {c.gradeFolderId === f.id && <Check className="h-3 w-3 text-primary shrink-0" />}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="gap-2 text-sm text-destructive focus:text-destructive"
                  onClick={() => { setDeletingClassroom(c); setDeleteClassroomOpen(true); }}
                >
                  <Trash2 className="h-3.5 w-3.5 shrink-0" />Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    );
  };

  const isLoading = classroomsLoading || foldersLoading || (isParent && parentChildrenLoading);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background">
      <ModernSidebar />
      <div className="md:ml-[228px]">
        <main className="p-4 sm:p-5 pt-18 md:pt-5 max-w-4xl mx-auto">

          {isLoading && (
            <div className="flex justify-center py-14">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* ══════════════════════════════════════════
              PARENT VIEW
          ══════════════════════════════════════════ */}
          {!isLoading && isParent && (
            <ParentClassroomsView
              children={parentChildren}
              classroomsByChild={classroomsByChild}
              notifMapByChild={notifMapByChild}
              navigate={navigate}
            />
          )}

          {/* ══════════════════════════════════════════
              TEACHER + STUDENT VIEW
          ══════════════════════════════════════════ */}
          {!isLoading && !isParent && (
            <>
              {/* ── Header ── */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h1 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <School className="h-4.5 w-4.5 text-primary" />
                    Classrooms
                  </h1>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Organize your classrooms by grade level
                  </p>
                </div>
                {isTeacher && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1.5 h-8 text-xs text-muted-foreground"
                      onClick={() => setNewFolderOpen(true)}
                    >
                      <FolderOpen className="h-3.5 w-3.5" />
                      New Folder
                    </Button>
                    <Button size="sm" className="gap-1.5 h-8 text-sm" onClick={() => openNewClassroom(null)}>
                      <Plus className="h-3.5 w-3.5" />
                      New Classroom
                    </Button>
                  </div>
                )}
              </div>

              <div className="space-y-4">

                {/* ── Grade Folder Cards (teacher only) ── */}
                {folders.length > 0 && (
                  <div>
                    <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                      <FolderOpen className="h-3.5 w-3.5" />
                      Grade Folders
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {folders.map(folder => {
                        const folderClassrooms = classroomsByFolder[folder.id] ?? [];
                        const subjectCount = folderClassrooms.length;
                        return (
                          <div key={folder.id} className="relative group/folder">
                            <button
                              onClick={() => navigate(`/classrooms/folders/${folder.slug ?? folder.id}`)}
                              className="relative w-full text-left rounded-xl border border-border overflow-hidden flex flex-col cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 active:scale-[0.985] bg-card"
                            >
                              {folderPendingCount(folder) > 0 && (
                                <span className="absolute top-2.5 right-2.5 z-10 min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold text-white flex items-center justify-center shadow-sm bg-amber-500 group-hover/folder:opacity-0 transition-opacity">
                                  {folderPendingCount(folder) > 9 ? "9+" : folderPendingCount(folder)}
                                </span>
                              )}
                              <div className="w-full h-[52px] shrink-0 bg-primary/10 flex items-center justify-center">
                                <Folder className="h-7 w-7 text-primary opacity-70" />
                              </div>
                              <div className="px-3.5 py-2.5 flex flex-col gap-0.5 flex-1">
                                <h3 className="font-semibold text-sm text-foreground leading-snug">{folder.name}</h3>
                                <span className="text-xs text-muted-foreground">
                                  {subjectCount} {subjectCount === 1 ? "subject" : "subjects"}
                                </span>
                                <div className="mt-auto pt-2 flex items-center justify-between">
                                  <span className="text-xs font-semibold text-primary group-hover/folder:underline">Open Folder</span>
                                  <ChevronRight className="h-3.5 w-3.5 text-primary opacity-60 group-hover/folder:opacity-100 transition-opacity" />
                                </div>
                              </div>
                            </button>
                            <div
                              className="absolute top-2 right-2 z-20 opacity-0 group-hover/folder:opacity-100 focus-within:opacity-100 transition-opacity"
                              onClick={e => e.stopPropagation()}
                            >
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 bg-white/80 backdrop-blur-sm hover:bg-white shadow-sm rounded-full">
                                    <MoreVertical className="h-3.5 w-3.5" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => openEditFolder(folder)} className="gap-2">
                                    <Pencil className="h-3.5 w-3.5" />Rename
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="gap-2 text-destructive focus:text-destructive"
                                    onClick={() => {
                                      if (subjectCount > 0) {
                                        toast({ title: `"${folder.name}" still has subjects — move or delete them first.`, type: "warning" });
                                      } else {
                                        setDeletingFolderId(folder.id);
                                      }
                                    }}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        );
                      })}

                      {/* Dashed "New Grade Folder" affordance card */}
                      <button
                        onClick={() => setNewFolderOpen(true)}
                        className="rounded-xl border border-dashed border-border bg-muted/20 flex flex-col items-center justify-center gap-2 min-h-[108px] hover:bg-muted/40 transition-colors cursor-pointer"
                      >
                        <FolderOpen className="h-5 w-5 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">New grade folder</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* ── Teacher: ungrouped classrooms ── */}
                {isTeacher && (() => {
                  const ungrouped = classroomsByFolder["none"] ?? [];
                  return (
                    <div>
                      {folders.length > 0 && (
                        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                          <Folder className="h-3.5 w-3.5" />
                          Other Classrooms
                        </h2>
                      )}
                      {ungrouped.length === 0 ? (
                        folders.length === 0 && (
                          <div className="text-center py-12 text-muted-foreground text-sm border border-dashed border-border rounded-xl">
                            No classrooms yet. Create a grade folder or add a classroom directly.
                          </div>
                        )
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {ungrouped.map(c => renderCard(c))}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* ── Student: folder cards + ungrouped classrooms ── */}
                {isStudent && (() => {
                  const studentFolderMap = new Map<number, { id: number; name: string; classrooms: Classroom[] }>();
                  const ungrouped: Classroom[] = [];
                  for (const c of activeClassrooms) {
                    if (c.gradeFolderId && c.gradeFolderName) {
                      if (!studentFolderMap.has(c.gradeFolderId)) {
                        studentFolderMap.set(c.gradeFolderId, { id: c.gradeFolderId, name: c.gradeFolderName, classrooms: [] });
                      }
                      studentFolderMap.get(c.gradeFolderId)!.classrooms.push(c);
                    } else {
                      ungrouped.push(c);
                    }
                  }
                  const studentFolders = Array.from(studentFolderMap.values());
                  const hasGroups = studentFolders.length > 0;

                  if (activeClassrooms.length === 0) {
                    return (
                      <div className="text-center py-10 text-muted-foreground text-sm rounded-xl border border-dashed border-border">
                        You have not been enrolled in any classrooms yet.
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-4">
                      {studentFolders.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {studentFolders.map(folder => {
                            const pending   = folder.classrooms.reduce((sum, c) => sum + (studentNotifMap[c.id]?.pendingCount ?? 0), 0);
                            const hasDue    = folder.classrooms.some(c => (studentNotifMap[c.id]?.dueCount ?? 0) > 0);
                            const hasDueSoon = folder.classrooms.some(c => (studentNotifMap[c.id]?.dueSoonCount ?? 0) > 0);
                            const hasNew    = folder.classrooms.some(c => (studentNotifMap[c.id]?.newCount ?? 0) > 0 || (studentNotifMap[c.id]?.newMaterialsCount ?? 0) > 0);
                            const badgeBg   = hasDue ? "bg-red-500" : hasDueSoon ? "bg-amber-500" : hasNew ? "bg-green-500" : "bg-primary";
                            return (
                              <div key={folder.id} className="relative group/folder">
                                <button
                                  onClick={() => navigate(`/classrooms/folders/${folder.id}`)}
                                  className="relative w-full text-left rounded-xl border border-border overflow-hidden flex flex-col cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 active:scale-[0.985] bg-card"
                                >
                                  {pending > 0 && (
                                    <span className={`absolute top-2.5 right-2.5 z-10 min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold text-white flex items-center justify-center shadow-sm ${badgeBg}`}>
                                      {pending > 9 ? "9+" : pending}
                                    </span>
                                  )}
                                  <div className="w-full h-[52px] shrink-0 bg-primary/10 flex items-center justify-center">
                                    <Folder className="h-7 w-7 text-primary opacity-70" />
                                  </div>
                                  <div className="px-3.5 py-2.5 flex flex-col gap-0.5 flex-1">
                                    <h3 className="font-semibold text-sm text-foreground leading-snug">{folder.name}</h3>
                                    <span className="text-xs text-muted-foreground">
                                      {folder.classrooms.length} {folder.classrooms.length === 1 ? "subject" : "subjects"}
                                    </span>
                                    <div className="mt-auto pt-2 flex items-center justify-between">
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
                            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                              <Folder className="h-3.5 w-3.5" />
                              Other Classes
                            </h2>
                          )}
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {ungrouped.map(c => renderCard(c))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* ── Archived Classrooms (teacher only) ── */}
                {isTeacher && archivedClassrooms.length > 0 && (
                  <div className="rounded-xl border border-border overflow-hidden">
                    <button
                      onClick={() => setCollapsedArchived(prev => !prev)}
                      className="flex items-center gap-2 px-3.5 py-2.5 bg-muted/20 w-full text-left group hover:bg-muted/40 transition-colors"
                    >
                      {collapsedArchived
                        ? <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                        : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                      }
                      <Archive className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="font-medium text-sm text-muted-foreground group-hover:text-foreground transition-colors flex-1">
                        Archived Classrooms
                      </span>
                      <Badge variant="secondary" className="text-xs px-1.5 py-0 h-4.5">
                        {archivedClassrooms.length}
                      </Badge>
                    </button>
                    {!collapsedArchived && (
                      <div className="p-3.5 border-t border-border bg-muted/10">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {archivedClassrooms.map(c => renderCard(c, true))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Recently Deleted (teacher only) ── */}
                {isTeacher && deletedClassrooms.length > 0 && (
                  <div className="rounded-xl border border-border overflow-hidden">
                    <button
                      onClick={() => setCollapsedTrash(prev => !prev)}
                      className="flex items-center gap-2 px-3.5 py-2.5 bg-muted/20 w-full text-left group hover:bg-muted/40 transition-colors"
                    >
                      {collapsedTrash
                        ? <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                        : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                      }
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="font-medium text-sm text-muted-foreground group-hover:text-foreground transition-colors flex-1">
                        Recently Deleted
                      </span>
                      <Badge variant="secondary" className="text-xs px-1.5 py-0 h-4.5">
                        {deletedClassrooms.length}
                      </Badge>
                    </button>
                    {!collapsedTrash && (
                      <div className="p-3.5 border-t border-border bg-muted/10 space-y-1.5">
                        <p className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2.5">
                          <Info className="h-3 w-3 shrink-0" />
                          Permanently removed after 30 days.
                        </p>
                        {deletedClassrooms.map(c => {
                          const isRestoring        = restoringId === c.id;
                          const isPermanentDeleting = permanentDeletingId === c.id;
                          const isBusy             = isRestoring || isPermanentDeleting;
                          return (
                            <div key={c.id} className="flex items-center gap-3 py-2.5 px-3 rounded-lg border border-border bg-card">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm text-foreground truncate">{c.name}</p>
                                {c.subject && <p className="text-xs text-muted-foreground truncate">{c.subject}</p>}
                                <p className="text-xs text-muted-foreground mt-0.5">{formatDeletedAgo(c.deletedAt)}</p>
                                <p className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 mt-0.5 font-medium">
                                  <Clock className="h-3 w-3 shrink-0" />
                                  {formatTimeRemaining(c.deletedAt)}
                                </p>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <Button
                                  size="sm" variant="outline" className="h-7 text-xs gap-1"
                                  disabled={isBusy}
                                  onClick={() => trashRestoreMutation.mutate(c.id)}
                                >
                                  {isRestoring ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
                                  Restore
                                </Button>
                                <Button
                                  size="sm" variant="ghost"
                                  className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                                  disabled={isBusy}
                                  onClick={() => setPermanentDeleteId(c.id)}
                                >
                                  {isPermanentDeleting && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                                  Delete permanently
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

              </div>
            </>
          )}

        </main>
      </div>

      {/* ── Dialogs ────────────────────────────────────────────────────────── */}

      <Dialog open={newFolderOpen} onOpenChange={(v) => { if (!v) { setNewFolderOpen(false); setNewFolderName(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Create Grade Folder</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-1">
            <p className="text-sm text-muted-foreground">Give this folder a grade-level name (e.g. "Grade 5", "9th Grade").</p>
            <Input
              placeholder="e.g. Grade 5"
              value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && newFolderName.trim()) createFolderMutation.mutate(); }}
              autoFocus
            />
            <Button className="w-full" disabled={!newFolderName.trim() || createFolderMutation.isPending} onClick={() => createFolderMutation.mutate()}>
              {createFolderMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Create Folder
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={editFolderOpen} onOpenChange={(v) => { if (!v) { setEditFolderOpen(false); setEditingFolder(null); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Rename Grade Folder</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-1">
            <Input
              placeholder="Folder name"
              value={editFolderName}
              onChange={e => setEditFolderName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && editFolderName.trim()) renameFolderMutation.mutate(); }}
              autoFocus
            />
            <Button className="w-full" disabled={!editFolderName.trim() || renameFolderMutation.isPending} onClick={() => renameFolderMutation.mutate()}>
              {renameFolderMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteClassroomOpen} onOpenChange={(v) => { if (!v) { setDeleteClassroomOpen(false); setDeletingClassroom(null); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete Classroom</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-1">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{deletingClassroom?.name}</span>{" "}
              will be moved to Recently Deleted. You can restore it within 30 days before it is permanently removed.
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => { setDeleteClassroomOpen(false); setDeletingClassroom(null); }} disabled={deleteClassroomMutation.isPending}>
                Cancel
              </Button>
              <Button variant="destructive" size="sm" disabled={deleteClassroomMutation.isPending} onClick={() => deletingClassroom && deleteClassroomMutation.mutate(deletingClassroom.id)}>
                {deleteClassroomMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Move to Recently Deleted
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={editClassroomOpen} onOpenChange={(v) => { if (!v) { setEditClassroomOpen(false); setEditingClassroom(null); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Edit Classroom</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-1">
            <div>
              <p className="text-sm font-medium mb-1">Name</p>
              <Input value={editClassroomForm.name} onChange={e => setEditClassroomForm({ ...editClassroomForm, name: e.target.value })} placeholder="e.g. Algebra II – Period 3" autoFocus />
            </div>
            <div>
              <p className="text-sm font-medium mb-1">Subject</p>
              <Input value={editClassroomForm.subject} onChange={e => setEditClassroomForm({ ...editClassroomForm, subject: e.target.value })} placeholder="e.g. Mathematics" />
            </div>
            <div>
              <p className="text-sm font-medium mb-1">Description <span className="text-muted-foreground font-normal">(optional)</span></p>
              <Textarea value={editClassroomForm.description} onChange={e => setEditClassroomForm({ ...editClassroomForm, description: e.target.value })} rows={2} placeholder="Brief description…" />
            </div>
            <Button className="w-full" disabled={!editClassroomForm.name.trim() || !editClassroomForm.subject.trim() || editClassroomMutation.isPending} onClick={() => editClassroomMutation.mutate()}>
              {editClassroomMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={newClassroomOpen} onOpenChange={(v) => { if (!v) { setNewClassroomOpen(false); setSelectedStudentIds(new Set()); setStudentSearch(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {newClassroomFolderId
                ? `New Subject in "${folders.find(f => f.id === newClassroomFolderId)?.name ?? "Folder"}"`
                : "Add Subject"
              }
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div>
              <p className="text-sm font-medium mb-1">Name</p>
              <Input value={newClassroomForm.name} onChange={e => setNewClassroomForm({ ...newClassroomForm, name: e.target.value })} placeholder="e.g. Algebra II – Period 3" />
            </div>
            <div>
              <p className="text-sm font-medium mb-1">Subject</p>
              <Input value={newClassroomForm.subject} onChange={e => setNewClassroomForm({ ...newClassroomForm, subject: e.target.value })} placeholder="e.g. Mathematics" />
            </div>
            <div>
              <p className="text-sm font-medium mb-1">Description <span className="text-muted-foreground font-normal">(optional)</span></p>
              <Textarea value={newClassroomForm.description} onChange={e => setNewClassroomForm({ ...newClassroomForm, description: e.target.value })} rows={2} placeholder="Brief description…" />
            </div>
            {newClassroomFolderId === null && folders.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-1">Grade Folder <span className="text-muted-foreground font-normal">(optional)</span></p>
                <select
                  className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background"
                  value={newClassroomFolderId ?? ""}
                  onChange={e => setNewClassroomFolderId(e.target.value ? parseInt(e.target.value) : null)}
                >
                  <option value="">None (ungrouped)</option>
                  {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>
            )}
            <div>
              <p className="text-sm font-medium mb-1 flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-muted-foreground" />
                Enroll Students
                <span className="text-muted-foreground font-normal">(optional)</span>
                {selectedStudentIds.size > 0 && (
                  <Badge variant="secondary" className="ml-auto text-xs">{selectedStudentIds.size} selected</Badge>
                )}
              </p>
              {teacherStudents.length === 0 ? (
                <p className="text-xs text-muted-foreground">No students available. Students can join using an invite code after the classroom is created.</p>
              ) : (
                <div className="border border-border rounded-lg overflow-hidden">
                  <div className="p-2 border-b border-border">
                    <Input placeholder="Search students…" value={studentSearch} onChange={e => setStudentSearch(e.target.value)} className="h-7 text-sm" />
                  </div>
                  <div className="max-h-36 overflow-y-auto">
                    {teacherStudents
                      .filter(s => !studentSearch || s.name.toLowerCase().includes(studentSearch.toLowerCase()) || s.email.toLowerCase().includes(studentSearch.toLowerCase()))
                      .map(s => {
                        const isSelected = selectedStudentIds.has(s.id);
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => setSelectedStudentIds(prev => { const next = new Set(prev); isSelected ? next.delete(s.id) : next.add(s.id); return next; })}
                            className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-muted/60 transition-colors ${isSelected ? "bg-primary/5" : ""}`}
                          >
                            <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${isSelected ? "bg-primary border-primary" : "border-border"}`}>
                              {isSelected && <Check className="h-3 w-3 text-white" />}
                            </div>
                            <span className="flex-1 font-medium">{s.name}</span>
                            {s.gradeLevel && <span className="text-xs text-muted-foreground shrink-0">{s.gradeLevel}</span>}
                          </button>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
            <Button
              className="w-full"
              disabled={!newClassroomForm.name || !newClassroomForm.subject || createClassroomMutation.isPending}
              onClick={() => createClassroomMutation.mutate()}
            >
              {createClassroomMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Create Classroom{selectedStudentIds.size > 0 ? ` & Enroll ${selectedStudentIds.size} Student${selectedStudentIds.size === 1 ? "" : "s"}` : ""}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deletingFolderId !== null}
        title="Delete this folder?"
        description="This cannot be undone."
        onConfirm={() => { deleteFolderMutation.mutate(deletingFolderId!); setDeletingFolderId(null); }}
        onCancel={() => setDeletingFolderId(null)}
      />

      <ConfirmDialog
        open={permanentDeleteId !== null}
        title="Permanently delete this classroom?"
        description="This cannot be undone. All assignments and submissions will be lost."
        confirmLabel="Delete permanently"
        onConfirm={() => { permanentDeleteMutation.mutate(permanentDeleteId!); setPermanentDeleteId(null); }}
        onCancel={() => setPermanentDeleteId(null)}
      />
    </div>
  );
}
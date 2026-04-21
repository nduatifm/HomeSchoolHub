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
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ConfirmDialog from "@/components/ConfirmDialog";
import type { Classroom, GradeFolder } from "@shared/schema";
import type { ClassroomNotification, ClassroomNotificationsMap } from "@/lib/classroomNotifications";

type TeacherStudent = { id: number; name: string; email: string; gradeLevel?: string | null };
type DeletedClassroom = Classroom & { deletedAt: string };

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

export default function ClassroomsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const isTeacher = user?.roles?.includes("teacher") || user?.role === "teacher";
  const isStudent = !isTeacher && user?.role === "student";

  const { data: classrooms = [], isLoading: classroomsLoading } = useQuery<Classroom[]>({
    queryKey: ["/api/classrooms"],
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
        body: JSON.stringify({
          ...newClassroomForm,
          gradeFolderId: newClassroomFolderId ?? null,
        }),
      }) as Classroom;
      const enrollIds = Array.from(selectedStudentIds);
      let failedCount = 0;
      for (const studentId of enrollIds) {
        try {
          await apiRequest(`/api/classrooms/${classroom.id}/enroll`, {
            method: "POST",
            body: JSON.stringify({ studentId }),
          });
        } catch {
          failedCount++;
        }
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
        toast({
          title: "Classroom created",
          description: `${enrolled} enrolled; ${failedCount} student${failedCount === 1 ? "" : "s"} couldn't be added.`,
          type: "warning",
        });
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
      apiRequest(`/api/classrooms/${classroomId}`, {
        method: "PATCH",
        body: JSON.stringify({ gradeFolderId: folderId }),
      }),
    onMutate: ({ classroomId }) => setMovingClassroomId(classroomId),
    onSuccess: (_, { folderId }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/classrooms"] });
      const folderName = folderId !== null ? folders.find(f => f.id === folderId)?.name : null;
      toast({ title: folderName ? `Moved to ${folderName}` : "Moved to Other Classrooms", type: "success" });
      setMovingClassroomId(null);
    },
    onError: () => {
      toast({ title: "Couldn't move the classroom — try again.", type: "error" });
      setMovingClassroomId(null);
    },
  });

  const editClassroomMutation = useMutation({
    mutationFn: () =>
      apiRequest(`/api/classrooms/${editingClassroom!.id}`, {
        method: "PATCH",
        body: JSON.stringify(editClassroomForm),
      }),
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
      apiRequest(`/api/classrooms/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
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
        description: "It will be permanently removed after 30 days. You can restore it from the Recently Deleted section.",
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
    onError: () => {
      toast({ title: "Couldn't restore — try again.", type: "error" });
      setRestoringId(null);
    },
  });

  const permanentDeleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/classrooms/${id}/permanent`, { method: "DELETE" }),
    onMutate: (id) => setPermanentDeletingId(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/classrooms/trash"] });
      toast({ title: "Classroom permanently deleted.", type: "success" });
      setPermanentDeletingId(null);
    },
    onError: () => {
      toast({ title: "Couldn't delete — try again.", type: "error" });
      setPermanentDeletingId(null);
    },
  });

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

  const activeClassrooms = classrooms.filter(c => c.status !== "archived");
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

  const folderPendingCount = (folder: GradeFolder): number => {
    const folderClassrooms = classroomsByFolder[folder.id] ?? [];
    return folderClassrooms.reduce((sum, c) => {
      const stats = classroomStats[c.id];
      return sum + (stats?.toGradeCount ?? 0);
    }, 0);
  };

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
                  {isMoving
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <MoreVertical className="h-3.5 w-3.5" />
                  }
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem className="gap-2 text-sm" onClick={() => openEditClassroom(c)}>
                  <Pencil className="h-3.5 w-3.5 shrink-0" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="gap-2 text-sm"
                  onClick={() =>
                    archiveClassroomMutation.mutate({
                      id: c.id,
                      status: isArchived ? "active" : "archived",
                    })
                  }
                >
                  <Archive className="h-3.5 w-3.5 shrink-0" />
                  {isArchived ? "Unarchive" : "Archive"}
                </DropdownMenuItem>
                {!isArchived && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger className="gap-2 text-sm">
                        <FolderInput className="h-3.5 w-3.5 shrink-0" />
                        Move to…
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent>
                        <DropdownMenuItem
                          className="gap-2"
                          disabled={c.gradeFolderId === null}
                          onClick={() => {
                            if (c.gradeFolderId !== null) {
                              moveClassroomMutation.mutate({ classroomId: c.id, folderId: null });
                            }
                          }}
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
                            onClick={() => {
                              if (c.gradeFolderId !== f.id) {
                                moveClassroomMutation.mutate({ classroomId: c.id, folderId: f.id });
                              }
                            }}
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
                  <Trash2 className="h-3.5 w-3.5 shrink-0" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    );
  };

  const isLoading = classroomsLoading || foldersLoading;

  return (
    <div className="min-h-screen bg-background">
      <ModernSidebar />
      <div className="md:ml-[228px]">
        <main className="p-4 sm:p-6 pt-20 md:pt-6 max-w-5xl mx-auto">

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
                <School className="h-5 w-5 text-primary" />
                Classrooms
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Organize your classrooms by grade level
              </p>
            </div>
            {isTeacher && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" className="gap-1.5">
                    <Plus className="h-4 w-4" />
                    New
                    <ChevronDown className="h-3.5 w-3.5 ml-0.5 opacity-70" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem className="gap-2" onClick={() => openNewClassroom(null)}>
                    <School className="h-4 w-4 text-muted-foreground shrink-0" />
                    Add Subject
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="gap-2" onClick={() => setNewFolderOpen(true)}>
                    <FolderOpen className="h-4 w-4 text-muted-foreground shrink-0" />
                    New Grade Folder
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {isLoading && (
            <div className="flex justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {!isLoading && (
            <div className="space-y-6">
              {/* Grade folder cards grid */}
              {folders.length > 0 && (
                <div>
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
                    <FolderOpen className="h-3.5 w-3.5" />
                    Grade Folders
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {folders.map(folder => {
                      const folderClassrooms = classroomsByFolder[folder.id] ?? [];
                      const subjectCount = folderClassrooms.length;
                      return (
                        <div key={folder.id} className="relative group/folder">
                          <button
                            onClick={() => navigate(`/classrooms/folders/${folder.slug ?? folder.id}`)}
                            className="relative w-full text-left rounded-2xl border border-border overflow-hidden flex flex-col cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 active:scale-[0.985] bg-card"
                          >
                            {isTeacher && folderPendingCount(folder) > 0 && (
                              <span className="absolute top-2.5 right-2.5 z-10 min-w-[22px] h-[22px] px-1.5 rounded-full text-[11px] font-bold text-white flex items-center justify-center shadow-sm bg-amber-500 group-hover/folder:opacity-0 transition-opacity">
                                {folderPendingCount(folder) > 9 ? "9+" : folderPendingCount(folder)}
                              </span>
                            )}
                            <div className="w-full h-24 shrink-0 bg-primary/10 flex items-center justify-center">
                              <Folder className="h-10 w-10 text-primary opacity-70" />
                            </div>
                            <div className="px-4 py-3 flex flex-col gap-1 flex-1">
                              <h3 className="font-bold text-sm text-foreground leading-snug">{folder.name}</h3>
                              <span className="text-xs text-muted-foreground">
                                {subjectCount} {subjectCount === 1 ? "subject" : "subjects"}
                              </span>
                              <div className="mt-auto pt-3 flex items-center justify-between">
                                <span className="text-xs font-semibold text-primary group-hover/folder:underline">Open Folder</span>
                                <ChevronRight className="h-3.5 w-3.5 text-primary opacity-60 group-hover/folder:opacity-100 transition-opacity" />
                              </div>
                            </div>
                          </button>
                          {isTeacher && (
                            <div
                              className="absolute top-2 right-2 z-20 opacity-0 group-hover/folder:opacity-100 focus-within:opacity-100 transition-opacity flex items-center gap-1"
                              onClick={e => e.stopPropagation()}
                            >
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 bg-white/80 backdrop-blur-sm hover:bg-white shadow-sm rounded-full"
                                  >
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
                                        toast({ title: `"${folder.name}" still has subjects — move or delete them before deleting the folder.`, type: "warning" });
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
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Ungrouped active classrooms */}
              {(() => {
                const ungrouped = classroomsByFolder["none"] ?? [];
                if (!isTeacher && ungrouped.length === 0 && folders.length === 0) return null;
                if (ungrouped.length === 0 && folders.length > 0 && !isTeacher) return null;
                return (
                  <div>
                    {folders.length > 0 && (
                      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
                        <Folder className="h-3.5 w-3.5" />
                        {isTeacher ? "Other Classrooms" : "All Classes"}
                      </h2>
                    )}
                    {ungrouped.length === 0 && isTeacher ? (
                      folders.length === 0 && (
                        <div className="text-center py-16 text-muted-foreground text-sm border border-dashed border-border rounded-xl">
                          No classrooms yet. Create a grade folder or add a classroom directly.
                        </div>
                      )
                    ) : ungrouped.length === 0 && !isTeacher ? (
                      <div className="text-center py-10 text-muted-foreground text-sm rounded-2xl border border-dashed border-border">
                        You have not been enrolled in any classrooms yet.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {ungrouped.map(c => renderCard(c))}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Archived Classrooms section — teacher only, hidden when empty */}
              {isTeacher && archivedClassrooms.length > 0 && (
                <div className="border border-border rounded-xl overflow-hidden">
                  <button
                    onClick={() => setCollapsedArchived(prev => !prev)}
                    className="flex items-center gap-2 px-4 py-3 bg-muted/30 w-full text-left group"
                  >
                    {collapsedArchived
                      ? <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      : <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    }
                    <Archive className="h-4 w-4 text-muted-foreground" />
                    <span className="font-semibold text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                      Archived Classrooms
                    </span>
                    <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5 ml-1">
                      {archivedClassrooms.length}
                    </Badge>
                  </button>
                  {!collapsedArchived && (
                    <div className="p-4 border-t border-border">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {archivedClassrooms.map(c => renderCard(c, true))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Recently Deleted section — teacher only, hidden when empty */}
              {isTeacher && deletedClassrooms.length > 0 && (
                <div className="border border-border rounded-xl overflow-hidden">
                  <div className="bg-muted/30">
                    <button
                      onClick={() => setCollapsedTrash(prev => !prev)}
                      className="flex items-center gap-2 px-4 py-3 w-full text-left group"
                    >
                      {collapsedTrash
                        ? <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        : <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      }
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                      <span className="font-semibold text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                        Recently Deleted
                      </span>
                      <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5 ml-1">
                        {deletedClassrooms.length}
                      </Badge>
                    </button>
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground px-4 pb-2.5">
                      <Info className="h-3.5 w-3.5 shrink-0" />
                      Classrooms here are permanently deleted after 30 days.
                    </p>
                  </div>
                  {!collapsedTrash && (
                    <div className="p-4 border-t border-border space-y-2">
                      {deletedClassrooms.map(c => {
                        const isRestoring = restoringId === c.id;
                        const isPermanentDeleting = permanentDeletingId === c.id;
                        const isBusy = isRestoring || isPermanentDeleting;
                        return (
                          <div
                            key={c.id}
                            className="flex items-center gap-3 py-3 px-3 rounded-lg border border-border bg-muted/20"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm text-foreground truncate">{c.name}</p>
                              {c.subject && (
                                <p className="text-xs text-muted-foreground truncate">{c.subject}</p>
                              )}
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {formatDeletedAgo(c.deletedAt)}
                              </p>
                              <p className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 mt-0.5 font-medium">
                                <Clock className="h-3 w-3 shrink-0" />
                                {formatTimeRemaining(c.deletedAt)}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs gap-1.5"
                                disabled={isBusy}
                                onClick={() => trashRestoreMutation.mutate(c.id)}
                              >
                                {isRestoring
                                  ? <Loader2 className="h-3 w-3 animate-spin" />
                                  : <RotateCcw className="h-3 w-3" />
                                }
                                Restore
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                                disabled={isBusy}
                                onClick={() => setPermanentDeleteId(c.id)}
                              >
                                {isPermanentDeleting
                                  ? <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                  : null
                                }
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
          )}

        </main>
      </div>

      {/* New Grade Folder dialog */}
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
            <Button
              className="w-full"
              disabled={!newFolderName.trim() || createFolderMutation.isPending}
              onClick={() => createFolderMutation.mutate()}
            >
              {createFolderMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Create Folder
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rename Folder dialog */}
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
            <Button
              className="w-full"
              disabled={!editFolderName.trim() || renameFolderMutation.isPending}
              onClick={() => renameFolderMutation.mutate()}
            >
              {renameFolderMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Classroom confirmation dialog */}
      <Dialog open={deleteClassroomOpen} onOpenChange={(v) => { if (!v) { setDeleteClassroomOpen(false); setDeletingClassroom(null); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete Classroom</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-1">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{deletingClassroom?.name}</span>{" "}
              will be moved to Recently Deleted. You can restore it within 30 days before it is permanently removed.
            </p>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setDeleteClassroomOpen(false); setDeletingClassroom(null); }}
                disabled={deleteClassroomMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={deleteClassroomMutation.isPending}
                onClick={() => deletingClassroom && deleteClassroomMutation.mutate(deletingClassroom.id)}
              >
                {deleteClassroomMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Move to Recently Deleted
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Classroom dialog */}
      <Dialog open={editClassroomOpen} onOpenChange={(v) => { if (!v) { setEditClassroomOpen(false); setEditingClassroom(null); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Edit Classroom</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-1">
            <div>
              <p className="text-sm font-medium mb-1">Name</p>
              <Input
                value={editClassroomForm.name}
                onChange={e => setEditClassroomForm({ ...editClassroomForm, name: e.target.value })}
                placeholder="e.g. Algebra II – Period 3"
                autoFocus
              />
            </div>
            <div>
              <p className="text-sm font-medium mb-1">Subject</p>
              <Input
                value={editClassroomForm.subject}
                onChange={e => setEditClassroomForm({ ...editClassroomForm, subject: e.target.value })}
                placeholder="e.g. Mathematics"
              />
            </div>
            <div>
              <p className="text-sm font-medium mb-1">Description <span className="text-muted-foreground font-normal">(optional)</span></p>
              <Textarea
                value={editClassroomForm.description}
                onChange={e => setEditClassroomForm({ ...editClassroomForm, description: e.target.value })}
                rows={2}
                placeholder="Brief description…"
              />
            </div>
            <Button
              className="w-full"
              disabled={!editClassroomForm.name.trim() || !editClassroomForm.subject.trim() || editClassroomMutation.isPending}
              onClick={() => editClassroomMutation.mutate()}
            >
              {editClassroomMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* New Classroom dialog */}
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
              <Input
                value={newClassroomForm.name}
                onChange={e => setNewClassroomForm({ ...newClassroomForm, name: e.target.value })}
                placeholder="e.g. Algebra II – Period 3"
              />
            </div>
            <div>
              <p className="text-sm font-medium mb-1">Subject</p>
              <Input
                value={newClassroomForm.subject}
                onChange={e => setNewClassroomForm({ ...newClassroomForm, subject: e.target.value })}
                placeholder="e.g. Mathematics"
              />
            </div>
            <div>
              <p className="text-sm font-medium mb-1">Description <span className="text-muted-foreground font-normal">(optional)</span></p>
              <Textarea
                value={newClassroomForm.description}
                onChange={e => setNewClassroomForm({ ...newClassroomForm, description: e.target.value })}
                rows={2}
                placeholder="Brief description…"
              />
            </div>

            {/* Folder selector when creating from "Ungrouped" */}
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

            {/* Student enrollment */}
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
                    <Input
                      placeholder="Search students…"
                      value={studentSearch}
                      onChange={e => setStudentSearch(e.target.value)}
                      className="h-7 text-sm"
                    />
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
                            onClick={() => {
                              setSelectedStudentIds(prev => {
                                const next = new Set(prev);
                                isSelected ? next.delete(s.id) : next.add(s.id);
                                return next;
                              });
                            }}
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

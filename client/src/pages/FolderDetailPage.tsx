import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
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
  ArrowLeft,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Classroom, GradeFolder } from "@shared/schema";
import type { ClassroomNotification } from "@/lib/classroomNotifications";

type TeacherStudent = { id: number; name: string; email: string; gradeLevel?: string | null };

export default function FolderDetailPage() {
  const { folderId: folderIdParam } = useParams<{ folderId: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  const isTeacher = user?.roles?.includes("teacher") || user?.role === "teacher";

  const { data: classrooms = [], isLoading: classroomsLoading } = useQuery<Classroom[]>({
    queryKey: ["/api/classrooms"],
  });

  const { data: folders = [], isLoading: foldersLoading } = useQuery<GradeFolder[]>({
    queryKey: ["/api/grade-folders"],
    enabled: isTeacher,
  });

  const { data: teacherStudents = [] } = useQuery<TeacherStudent[]>({
    queryKey: ["/api/students/teacher"],
    enabled: isTeacher,
  });

  const { data: classroomStats = {} as Record<number, { toGradeCount: number }> } = useQuery<Record<number, { toGradeCount: number }>>({
    queryKey: ["/api/teacher/classroom-stats"],
    enabled: isTeacher,
  });

  // Resolve folder by slug (preferred) or numeric id (backward-compatible)
  const folder = folders.find(f =>
    f.slug === folderIdParam || String(f.id) === folderIdParam
  ) ?? null;
  const folderId = folder?.id ?? -1;

  const folderClassrooms = classrooms.filter(c => c.gradeFolderId === folderId);
  const activeClassrooms = folderClassrooms.filter(c => c.status !== "archived");
  const archivedClassrooms = folderClassrooms.filter(c => c.status === "archived");

  const [collapsedArchived, setCollapsedArchived] = useState(true);

  const [editFolderOpen, setEditFolderOpen] = useState(false);
  const [editFolderName, setEditFolderName] = useState("");

  const [newClassroomOpen, setNewClassroomOpen] = useState(false);
  const [newClassroomForm, setNewClassroomForm] = useState({ name: "", subject: "", description: "" });
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<number>>(new Set());
  const [studentSearch, setStudentSearch] = useState("");

  const [movingClassroomId, setMovingClassroomId] = useState<number | null>(null);

  const [editClassroomOpen, setEditClassroomOpen] = useState(false);
  const [editingClassroom, setEditingClassroom] = useState<Classroom | null>(null);
  const [editClassroomForm, setEditClassroomForm] = useState({ name: "", subject: "", description: "" });

  const [deleteClassroomOpen, setDeleteClassroomOpen] = useState(false);
  const [deletingClassroom, setDeletingClassroom] = useState<Classroom | null>(null);

  const renameFolderMutation = useMutation({
    mutationFn: () =>
      apiRequest(`/api/grade-folders/${folderId}`, {
        method: "PATCH",
        body: JSON.stringify({ name: editFolderName }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/grade-folders"] });
      toast({ title: "Folder renamed!" });
      setEditFolderOpen(false);
      setEditFolderName("");
    },
    onError: (e: any) => toast({ title: "Failed to rename folder", description: e.message, type: "error" }),
  });

  const deleteFolderMutation = useMutation({
    mutationFn: () => apiRequest(`/api/grade-folders/${folderId}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/grade-folders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/classrooms"] });
      toast({ title: "Grade folder deleted." });
      navigate("/classrooms");
    },
    onError: (e: any) => toast({ title: "Cannot delete folder", description: e.message, type: "error" }),
  });

  const createClassroomMutation = useMutation({
    mutationFn: async () => {
      const classroom = await apiRequest("/api/classrooms", {
        method: "POST",
        body: JSON.stringify({ ...newClassroomForm, gradeFolderId: folderId }),
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
        toast({ title: `Subject created & ${enrolled} student${enrolled === 1 ? "" : "s"} enrolled!` });
      } else if (failedCount > 0) {
        toast({
          title: "Subject created",
          description: `${enrolled} enrolled; ${failedCount} could not be enrolled.`,
          type: "error",
        });
      } else {
        toast({ title: "Subject created!" });
      }
      setNewClassroomOpen(false);
      setNewClassroomForm({ name: "", subject: "", description: "" });
      setSelectedStudentIds(new Set());
      setStudentSearch("");
    },
    onError: (e: any) => toast({ title: "Failed to create subject", description: e.message, type: "error" }),
  });

  const moveClassroomMutation = useMutation({
    mutationFn: ({ classroomId, targetFolderId }: { classroomId: number; targetFolderId: number | null }) =>
      apiRequest(`/api/classrooms/${classroomId}`, {
        method: "PATCH",
        body: JSON.stringify({ gradeFolderId: targetFolderId }),
      }),
    onMutate: ({ classroomId }) => setMovingClassroomId(classroomId),
    onSuccess: (_, { targetFolderId }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/classrooms"] });
      const folderName = targetFolderId !== null ? folders.find(f => f.id === targetFolderId)?.name : null;
      toast({ title: folderName ? `Moved to ${folderName}` : "Moved to Other Classrooms" });
      setMovingClassroomId(null);
    },
    onError: (e: any) => {
      toast({ title: "Failed to move classroom", description: e.message, type: "error" });
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
      toast({ title: "Classroom updated!" });
      setEditClassroomOpen(false);
      setEditingClassroom(null);
    },
    onError: (e: any) => toast({ title: "Failed to update classroom", description: e.message, type: "error" }),
  });

  const archiveClassroomMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      apiRequest(`/api/classrooms/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/classrooms"] });
      toast({ title: status === "archived" ? "Classroom archived." : "Classroom restored to active." });
    },
    onError: (e: any) => toast({ title: "Failed to update classroom", description: e.message, type: "error" }),
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
        description: "You can restore it from the Recently Deleted section on the Classrooms page within 30 days.",
      });
    },
    onError: (e: any) => toast({ title: "Failed to delete classroom", description: e.message, type: "error" }),
  });

  const openEditClassroom = (c: Classroom) => {
    setEditingClassroom(c);
    setEditClassroomForm({ name: c.name, subject: c.subject ?? "", description: c.description ?? "" });
    setEditClassroomOpen(true);
  };

  const notifForClassroom = (c: Classroom): ClassroomNotification | null => {
    const stats = classroomStats[c.id];
    if (!stats || stats.toGradeCount === 0) return null;
    return { pendingCount: stats.toGradeCount, newMaterialsCount: 0, newPostsCount: 0, newCount: 0, dueCount: 0, dueSoonCount: 0, total: stats.toGradeCount };
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
                              moveClassroomMutation.mutate({ classroomId: c.id, targetFolderId: null });
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
                                moveClassroomMutation.mutate({ classroomId: c.id, targetFolderId: f.id });
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

  useEffect(() => {
    if (!isLoading && !folder) {
      navigate("/classrooms");
    }
  }, [isLoading, folder, navigate]);

  if (!isLoading && !folder) return null;

  return (
    <div className="min-h-screen bg-background">
      <ModernSidebar />
      <div className="md:ml-[228px]">

        {/* Sticky header */}
        <div className="sticky top-14 md:top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="flex items-center justify-between px-4 sm:px-6 py-3 max-w-5xl mx-auto">
            <div className="flex items-center gap-3 min-w-0">
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={() => navigate("/classrooms")}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-2 min-w-0">
                <Folder className="h-5 w-5 text-primary shrink-0" />
                <h1 className="text-xl font-semibold text-foreground truncate">
                  {folder?.name ?? "Loading…"}
                </h1>
              </div>
            </div>
            {isTeacher && (
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  className="gap-1.5"
                  disabled={!folder}
                  onClick={() => setNewClassroomOpen(true)}
                >
                  <Plus className="h-4 w-4" />
                  Add Subject
                </Button>
                {folder && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        className="gap-2"
                        onClick={() => { setEditFolderName(folder.name); setEditFolderOpen(true); }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Rename folder
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="gap-2 text-destructive focus:text-destructive"
                        onClick={() => {
                          const hasContent = folderClassrooms.length > 0;
                          const msg = hasContent
                            ? `"${folder.name}" still has ${folderClassrooms.length} subject${folderClassrooms.length === 1 ? "" : "s"}. Move or delete them first, then try again.`
                            : `Delete folder "${folder.name}"? This cannot be undone.`;
                          if (!hasContent && window.confirm(msg)) {
                            deleteFolderMutation.mutate();
                          } else if (hasContent) {
                            window.alert(msg);
                          }
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete folder
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Page content */}
        <main className="p-4 sm:p-6 max-w-5xl mx-auto">
          {isLoading && (
            <div className="flex justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {!isLoading && (
            <div className="space-y-6">
              {/* Active classrooms in this folder */}
              {activeClassrooms.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground text-sm border border-dashed border-border rounded-xl">
                  No subjects yet.{" "}
                  {isTeacher && (
                    <button
                      onClick={() => setNewClassroomOpen(true)}
                      className="text-primary hover:underline font-medium"
                    >
                      Add a subject
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activeClassrooms.map(c => renderCard(c))}
                </div>
              )}

              {/* Archived classrooms in this folder */}
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
                      Archived
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
            </div>
          )}
        </main>
      </div>

      {/* Rename Folder dialog */}
      <Dialog open={editFolderOpen} onOpenChange={(v) => { if (!v) setEditFolderOpen(false); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Rename Folder</DialogTitle></DialogHeader>
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

      {/* Add Subject dialog */}
      <Dialog open={newClassroomOpen} onOpenChange={(v) => { if (!v) { setNewClassroomOpen(false); setSelectedStudentIds(new Set()); setStudentSearch(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Subject in "{folder?.name}"</DialogTitle>
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
                <p className="text-xs text-muted-foreground">No students available. Students can join with an invite code after the classroom is created.</p>
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
              Create Subject{selectedStudentIds.size > 0 ? ` & Enroll ${selectedStudentIds.size} Student${selectedStudentIds.size === 1 ? "" : "s"}` : ""}
            </Button>
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
    </div>
  );
}

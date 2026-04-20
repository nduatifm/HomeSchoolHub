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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  School,
  FolderOpen,
  Folder,
  Plus,
  Loader2,
  MoreVertical,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
  Users,
  Check,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Classroom, GradeFolder } from "@shared/schema";
import type { ClassroomNotification } from "@/lib/classroomNotifications";

type TeacherStudent = { id: number; name: string; email: string; gradeLevel?: string | null };

export default function ClassroomsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const isTeacher = user?.roles?.includes("teacher") || user?.role === "teacher";

  const { data: classrooms = [], isLoading: classroomsLoading } = useQuery<Classroom[]>({
    queryKey: ["/api/classrooms"],
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
  });

  const [collapsedFolders, setCollapsedFolders] = useState<Set<number>>(new Set());
  const toggleFolder = (id: number) =>
    setCollapsedFolders(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

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

  const createFolderMutation = useMutation({
    mutationFn: () => apiRequest("/api/grade-folders", { method: "POST", body: JSON.stringify({ name: newFolderName }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/grade-folders"] });
      toast({ title: "Grade folder created!" });
      setNewFolderOpen(false);
      setNewFolderName("");
    },
    onError: (e: any) => toast({ title: "Failed to create folder", description: e.message, type: "error" }),
  });

  const renameFolderMutation = useMutation({
    mutationFn: () => apiRequest(`/api/grade-folders/${editingFolder!.id}`, { method: "PATCH", body: JSON.stringify({ name: editFolderName }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/grade-folders"] });
      toast({ title: "Folder renamed!" });
      setEditFolderOpen(false);
      setEditingFolder(null);
      setEditFolderName("");
    },
    onError: (e: any) => toast({ title: "Failed to rename folder", description: e.message, type: "error" }),
  });

  const deleteFolderMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/grade-folders/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/grade-folders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/classrooms"] });
      toast({ title: "Grade folder deleted." });
    },
    onError: (e: any) => toast({ title: "Cannot delete folder", description: e.message, type: "error" }),
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
      // Enroll selected students sequentially — track failures
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
        toast({ title: `Classroom created & ${enrolled} student${enrolled === 1 ? "" : "s"} enrolled!` });
      } else if (failedCount > 0) {
        toast({
          title: "Classroom created",
          description: `${enrolled} enrolled; ${failedCount} student${failedCount === 1 ? "" : "s"} could not be enrolled (already enrolled or error).`,
          type: "error",
        });
      } else {
        toast({ title: "Classroom created!" });
      }
      setNewClassroomOpen(false);
      setNewClassroomForm({ name: "", subject: "", description: "" });
      setNewClassroomFolderId(null);
      setSelectedStudentIds(new Set());
      setStudentSearch("");
    },
    onError: (e: any) => toast({ title: "Failed to create classroom", description: e.message, type: "error" }),
  });

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

  const classroomsByFolder: Record<number | "none", Classroom[]> = { none: [] };
  for (const c of classrooms) {
    const key = c.gradeFolderId ?? "none";
    if (!classroomsByFolder[key]) classroomsByFolder[key] = [];
    classroomsByFolder[key].push(c);
  }

  const notifForClassroom = (c: Classroom): ClassroomNotification | null => {
    const stats = classroomStats[c.id];
    if (!stats || stats.toGradeCount === 0) return null;
    return { pendingCount: stats.toGradeCount, newMaterialsCount: 0, newPostsCount: 0, newCount: 0, dueCount: 0, dueSoonCount: 0, total: stats.toGradeCount };
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
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setNewFolderOpen(true)}
                >
                  <FolderOpen className="h-4 w-4" />
                  New Grade Folder
                </Button>
                <Button
                  size="sm"
                  className="gap-1.5"
                  onClick={() => openNewClassroom(null)}
                >
                  <Plus className="h-4 w-4" />
                  New Classroom
                </Button>
              </div>
            )}
          </div>

          {isLoading && (
            <div className="flex justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {!isLoading && (
            <div className="space-y-6">
              {/* Grade folders */}
              {folders.map(folder => {
                const folderClassrooms = classroomsByFolder[folder.id] ?? [];
                const isExpanded = !collapsedFolders.has(folder.id);
                return (
                  <div key={folder.id} className="border border-border rounded-xl overflow-hidden">
                    {/* Folder header */}
                    <div className="flex items-center gap-2 px-4 py-3 bg-muted/40 border-b border-border">
                      <button
                        onClick={() => toggleFolder(folder.id)}
                        className="flex items-center gap-2 flex-1 text-left group"
                      >
                        {isExpanded
                          ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          : <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        }
                        <Folder className="h-4 w-4 text-primary" />
                        <span className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">
                          {folder.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {folderClassrooms.length} {folderClassrooms.length === 1 ? "class" : "classes"}
                        </span>
                      </button>
                      {isTeacher && (
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
                            onClick={() => openNewClassroom(folder.id)}
                          >
                            <Plus className="h-3.5 w-3.5" />Add Subject
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditFolder(folder)} className="gap-2">
                                <Pencil className="h-3.5 w-3.5" />Rename
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="gap-2 text-destructive focus:text-destructive"
                                onClick={() => {
                                  if (window.confirm(`Delete folder "${folder.name}"? This will fail if any classrooms are still inside it.`)) {
                                    deleteFolderMutation.mutate(folder.id);
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

                    {/* Folder content */}
                    {isExpanded && (
                      <div className="p-4">
                        {folderClassrooms.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground text-sm">
                            No subjects yet.{" "}
                            {isTeacher && (
                              <button
                                onClick={() => openNewClassroom(folder.id)}
                                className="text-primary hover:underline font-medium"
                              >
                                Add a subject
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {folderClassrooms.map(c => (
                              <ClassroomCard
                                key={c.id}
                                classroom={c}
                                href={`/classrooms/${c.slug ?? c.id}`}
                                ctaLabel="Open Classroom"
                                notification={notifForClassroom(c)}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Ungrouped classrooms */}
              {(() => {
                const ungrouped = classroomsByFolder["none"] ?? [];
                if (!isTeacher && ungrouped.length === 0 && folders.length === 0) return null;
                if (ungrouped.length === 0 && folders.length > 0 && !isTeacher) return null;
                return (
                  <div>
                    {folders.length > 0 && (
                      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
                        <Folder className="h-3.5 w-3.5" />
                        {isTeacher ? "Ungrouped Classrooms" : "All Classes"}
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
                        {ungrouped.map(c => (
                          <ClassroomCard
                            key={c.id}
                            classroom={c}
                            href={`/classrooms/${c.slug ?? c.id}`}
                            ctaLabel={isTeacher ? "Open Classroom" : undefined}
                            notification={notifForClassroom(c)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
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

      {/* New Classroom dialog */}
      <Dialog open={newClassroomOpen} onOpenChange={(v) => { if (!v) { setNewClassroomOpen(false); setSelectedStudentIds(new Set()); setStudentSearch(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {newClassroomFolderId
                ? `New Classroom in "${folders.find(f => f.id === newClassroomFolderId)?.name ?? "Folder"}"`
                : "New Classroom"
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
    </div>
  );
}

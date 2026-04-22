import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueries } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { School, ChevronRight, Folder, Loader2, BarChart2 } from "lucide-react";
import ModernSidebar from "@/components/ModernSidebar";
import ClassroomCard from "@/components/ClassroomCard";
import type { ClassroomNotificationsMap } from "@/lib/classroomNotifications";
import type { Classroom, ClassroomAssignment, ClassroomSubmission } from "@shared/schema";

export default function StudentClassroomsPage() {
  const { user, student } = useAuth();
  const [, navigate] = useLocation();

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = user?.name?.split(" ")[0] || "there";

  const { data: classrooms = [], isLoading: classroomsLoading } = useQuery<Classroom[]>({ queryKey: ["/api/classrooms"] });

  const classroomAssignmentQueries = useQueries({
    queries: classrooms.map(c => ({
      queryKey: ["/api/classrooms", c.id, "assignments"],
      queryFn: () => apiRequest(`/api/classrooms/${c.id}/assignments`),
      enabled: classrooms.length > 0,
    })),
  });

  const classroomSubmissionQueries = useQueries({
    queries: classrooms.map(c => ({
      queryKey: ["/api/classrooms", c.id, "my-submissions"],
      queryFn: () => apiRequest(`/api/classrooms/${c.id}/my-submissions`),
      enabled: classrooms.length > 0,
    })),
  });

  const { data: notifMap = {} as ClassroomNotificationsMap } = useQuery<ClassroomNotificationsMap>({
    queryKey: ["/api/students", student?.id, "classroom-notifications"],
    queryFn: () => apiRequest(`/api/students/${student!.id}/classroom-notifications`),
    enabled: !!student,
  });

  const isTasksLoading = classroomsLoading || classroomAssignmentQueries.some(q => q.isLoading);

  const pendingCount = classrooms.reduce((sum, c, i) => {
    const assigns = (classroomAssignmentQueries[i]?.data as ClassroomAssignment[]) ?? [];
    const subs = (classroomSubmissionQueries[i]?.data as ClassroomSubmission[]) ?? [];
    const subMap = Object.fromEntries(subs.map(s => [s.assignmentId, s]));
    return sum + assigns.filter(a => { const sub = subMap[a.id]; return !sub || sub.status === "pending"; }).length;
  }, 0);

  return (
    <div className="min-h-screen bg-background">
      <ModernSidebar />
      <div className="md:ml-[228px]">
        <main className="p-4 sm:p-5 pt-18 md:pt-5 max-w-4xl mx-auto">
          <div className="mb-5">
            <h1 className="text-xl font-semibold text-foreground">{greeting}, {firstName} 👋</h1>
            <p className="text-sm text-muted-foreground">
              {isTasksLoading
                ? "Loading your tasks…"
                : pendingCount > 0
                  ? `You have ${pendingCount} thing${pendingCount === 1 ? "" : "s"} to do.`
                  : "Nothing due — you're ahead of the game!"}
            </p>
          </div>

          <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
            <School className="h-4 w-4 text-primary" /> All Classes
          </h2>

          {classroomsLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : classrooms.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm rounded-2xl border border-dashed border-border">
              You have not been enrolled in any classrooms yet.
            </div>
          ) : (() => {
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
            const folders = Array.from(folderMap.values());
            const hasGroups = folders.length > 0;
            return (
              <div className="space-y-6">
                {folders.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {folders.map(folder => {
                      const pending = folder.classrooms.reduce((sum, c) => sum + (notifMap[c.id]?.pendingCount ?? 0), 0);
                      const hasDue = folder.classrooms.some(c => (notifMap[c.id]?.dueCount ?? 0) > 0 || (notifMap[c.id]?.newPostsCount ?? 0) > 0);
                      const hasDueSoon = folder.classrooms.some(c => (notifMap[c.id]?.dueSoonCount ?? 0) > 0);
                      const hasNew = folder.classrooms.some(c => (notifMap[c.id]?.newCount ?? 0) > 0 || (notifMap[c.id]?.newMaterialsCount ?? 0) > 0);
                      const badgeBg = hasDue ? "bg-red-500" : hasDueSoon ? "bg-amber-500" : hasNew ? "bg-green-500" : "bg-primary";
                      return (
                        <div key={folder.id} className="relative group/folder">
                          <button
                            onClick={() => navigate(`/classrooms/folders/${folder.id}`)}
                            className="relative w-full text-left rounded-2xl border border-border overflow-hidden flex flex-col cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 active:scale-[0.985] bg-card"
                          >
                            {pending > 0 && (
                              <span className={`absolute top-2.5 right-2.5 z-10 min-w-[22px] h-[22px] px-1.5 rounded-full text-[11px] font-bold text-white flex items-center justify-center shadow-sm ${badgeBg}`}>
                                {pending > 9 ? "9+" : pending}
                              </span>
                            )}
                            <div className="w-full h-24 shrink-0 bg-primary/10 flex items-center justify-center">
                              <Folder className="h-10 w-10 text-primary opacity-70" />
                            </div>
                            <div className="px-4 py-3 flex flex-col gap-1 flex-1">
                              <h3 className="font-bold text-sm text-foreground leading-snug">{folder.name}</h3>
                              <span className="text-xs text-muted-foreground">
                                {folder.classrooms.length} {folder.classrooms.length === 1 ? "subject" : "subjects"}
                              </span>
                              <div className="mt-auto pt-3 flex items-center justify-between">
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
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Other Classes</h3>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {ungrouped.map(c => (
                        <ClassroomCard
                          key={c.id}
                          classroom={c}
                          href={`/classrooms/${c.slug ?? c.id}`}
                          notification={notifMap[c.id] ?? null}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </main>
      </div>
    </div>
  );
}

import { useLocation } from "wouter";
import { useQuery, useQueries } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { School, ChevronRight, Folder, GraduationCap } from "lucide-react";
import ModernSidebar from "@/components/ModernSidebar";
import ClassroomCard from "@/components/ClassroomCard";
import type { Classroom, Student } from "@shared/schema";
import type { ClassroomNotificationsMap } from "@/lib/classroomNotifications";

export default function ParentClassroomsPage() {
  const [, navigate] = useLocation();

  const { data: students = [] } = useQuery<Student[]>({ queryKey: ["/api/students/parent"] });

  const childClassroomQueries = useQueries({
    queries: students.map((child) => ({
      queryKey: ["/api/classrooms/parent", child.id],
      queryFn: () => apiRequest(`/api/classrooms/parent/${child.id}`) as Promise<Classroom[]>,
      enabled: students.length > 0,
    })),
  });

  const childNotificationQueries = useQueries({
    queries: students.map((child) => ({
      queryKey: ["/api/students", child.id, "classroom-notifications"],
      queryFn: () => apiRequest(`/api/students/${child.id}/classroom-notifications`) as Promise<ClassroomNotificationsMap>,
      enabled: students.length > 0,
    })),
  });

  return (
    <div className="min-h-screen bg-background">
      <ModernSidebar />
      <div className="md:ml-[228px]">
        <main className="p-4 sm:p-5 pt-18 md:pt-5 max-w-4xl mx-auto">
          <h1 className="text-xl font-semibold text-foreground mb-5 flex items-center gap-2">
            <School className="h-5 w-5 text-primary" /> Classrooms
          </h1>

          {students.length === 0 && (
            <div className="text-center py-10 rounded-2xl border border-dashed border-border text-gray-400 text-sm">
              Add a student to see their classrooms.
            </div>
          )}

          <div className="space-y-6">
            {students.map((child, i) => {
              const childClassrooms = (childClassroomQueries[i]?.data ?? []) as Classroom[];
              const childNotifMap = (childNotificationQueries[i]?.data ?? {}) as ClassroomNotificationsMap;
              const folderMap = new Map<number, { id: number; name: string; classrooms: Classroom[] }>();
              const ungrouped: Classroom[] = [];
              for (const c of childClassrooms) {
                if (c.gradeFolderId && c.gradeFolderName) {
                  if (!folderMap.has(c.gradeFolderId)) {
                    folderMap.set(c.gradeFolderId, { id: c.gradeFolderId, name: c.gradeFolderName, classrooms: [] });
                  }
                  folderMap.get(c.gradeFolderId)!.classrooms.push(c);
                } else {
                  ungrouped.push(c);
                }
              }
              const childFolders = Array.from(folderMap.values());
              const hasGroups = childFolders.length > 0;

              return (
                <div key={child.id} className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                    <GraduationCap className="h-4 w-4 text-gray-400" />{child.name}
                  </h3>
                  {childClassrooms.length === 0 ? (
                    <p className="text-xs text-gray-400 pl-5">No classrooms yet for this student.</p>
                  ) : (
                    <div className="space-y-4">
                      {childFolders.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {childFolders.map(folder => {
                            const pending = folder.classrooms.reduce((sum, c) => sum + (childNotifMap[c.id]?.pendingCount ?? 0), 0);
                            const hasDue = folder.classrooms.some(c => (childNotifMap[c.id]?.dueCount ?? 0) > 0 || (childNotifMap[c.id]?.newPostsCount ?? 0) > 0);
                            const hasDueSoon = folder.classrooms.some(c => (childNotifMap[c.id]?.dueSoonCount ?? 0) > 0);
                            const hasNew = folder.classrooms.some(c => (childNotifMap[c.id]?.newCount ?? 0) > 0 || (childNotifMap[c.id]?.newMaterialsCount ?? 0) > 0);
                            const badgeBg = hasDue ? "bg-red-500" : hasDueSoon ? "bg-amber-500" : hasNew ? "bg-green-500" : "bg-primary";
                            return (
                              <div key={folder.id} className="relative group/folder">
                                <button
                                  onClick={() => navigate(`/classrooms/folders/${folder.id}?studentId=${child.id}`)}
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
                          {hasGroups && <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 mt-2">Other Classes</p>}
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {ungrouped.map(c => (
                              <ClassroomCard
                                key={c.id}
                                classroom={c}
                                href={`/classrooms/${c.slug ?? c.id}?studentId=${child.id}`}
                                ctaLabel="View Grades"
                                notification={childNotifMap[c.id] ?? null}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </main>
      </div>
    </div>
  );
}

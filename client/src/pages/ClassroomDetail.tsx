import { useState } from "react";
import { useRoute, useLocation, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import {
  BookOpen,
  Users,
  LibraryBig,
  BarChart2,
  Megaphone,
  Loader2,
  Archive,
  ArchiveRestore,
  Settings2,
} from "lucide-react";
import ModernSidebar from "@/components/ModernSidebar";
import Breadcrumb, { buildClassroomCrumbs } from "@/components/Breadcrumb";
import { getSubjectTheme } from "@/lib/subjectTheme";
import type {
  Classroom,
  ClassroomAssignment,
  ClassroomSubmission,
  ClassroomMaterial,
} from "@shared/schema";
import type { PostWithAuthor } from "./classroom/types";
import FeedTab from "./classroom/FeedTab";
import TeacherAssignmentsTab from "./classroom/TeacherAssignmentsTab";
import StudentAssignmentsTab from "./classroom/StudentAssignmentsTab";
import TeacherGradesTab from "./classroom/TeacherGradesTab";
import ParentGradesTab from "./classroom/ParentGradesTab";
import StudentGradesTab from "./classroom/StudentGradesTab";
import ClassworkTab from "./classroom/ClassworkTab";
import StudentsTab from "./classroom/StudentsTab";
import TeacherSettingsTab from "./classroom/TeacherSettingsTab";

function TabNav({
  tabs,
  active,
  onChange,
}: {
  tabs: { value: string; label: string; icon: React.ReactNode; badge?: number }[];
  active: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex gap-1 flex-wrap mb-6 bg-muted/40 p-1 rounded-xl w-fit">
      {tabs.map((t) => (
        <button
          key={t.value}
          onClick={() => onChange(t.value)}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-150 whitespace-nowrap ${
            active === t.value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-background/60"
          }`}
        >
          {t.icon}
          {t.label}
          {!!t.badge && t.badge > 0 && (
            <span className="min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold text-white bg-red-500 flex items-center justify-center leading-none">
              {t.badge > 9 ? "9+" : t.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

export default function ClassroomDetail() {
  const [, tabParams] = useRoute("/classrooms/:slug/:tab");
  const [, slugOnlyParams] = useRoute("/classrooms/:slug");
  const [, navigate] = useLocation();
  const { user } = useAuth();

  const slugParam = tabParams?.slug ?? slugOnlyParams?.slug ?? "";
  const activeTab = tabParams?.tab ?? "feed";

  const searchParams = new URLSearchParams(window.location.search);
  const parentStudentId = parseInt(searchParams.get("studentId") ?? "0");

  function setActiveTab(tab: string) {
    navigate(`/classrooms/${slugParam}/${tab}${window.location.search ? window.location.search : ""}`);
  }

  const { data: classroom, isLoading } = useQuery<Classroom>({
    queryKey: ["/api/classrooms", slugParam],
    queryFn: () => apiRequest(`/api/classrooms/${slugParam}`),
    enabled: !!slugParam,
  });

  const classroomId = classroom?.id ?? 0;

  const { data: studentData } = useQuery<{ id: number }>({
    queryKey: ["/api/students/me"],
    queryFn: () => apiRequest("/api/students/me"),
    enabled: user?.role === "student",
  });

  // Optimistic local seen tracking (cleared on remount / navigation)
  const [localSeenPosts, setLocalSeenPosts] = useState<Set<number>>(new Set());
  const [localSeenMaterials, setLocalSeenMaterials] = useState<Set<number>>(new Set());
  const [localSeenAssignments, setLocalSeenAssignments] = useState<Set<number>>(new Set());

  // Ungraded submission count for the teacher's "Assignments & Test" tab badge
  const { data: _teacherStats = {} } = useQuery<Record<number, { toGradeCount: number }>>({
    queryKey: ["/api/teacher/classroom-stats"],
    queryFn: () => apiRequest("/api/teacher/classroom-stats"),
    enabled: user?.role === "teacher" && classroomId > 0,
    refetchInterval: 30000,
  });

  // Badge counts for student/parent tab pills — share cache with child component queries
  const { data: _badgeAssignments = [] } = useQuery<ClassroomAssignment[]>({
    queryKey: ["/api/classrooms", classroomId, "assignments"],
    queryFn: () => apiRequest(`/api/classrooms/${classroomId}/assignments`),
    enabled: user?.role === "student" && classroomId > 0,
  });
  const { data: _badgeSubmissions = [] } = useQuery<ClassroomSubmission[]>({
    queryKey: ["/api/classrooms", classroomId, "my-submissions"],
    queryFn: () => apiRequest(`/api/classrooms/${classroomId}/my-submissions`),
    enabled: user?.role === "student" && classroomId > 0,
  });
  const { data: _badgeMaterials = [] } = useQuery<ClassroomMaterial[]>({
    queryKey: ["/api/classrooms", classroomId, "materials"],
    queryFn: () => apiRequest(`/api/classrooms/${classroomId}/materials`),
    enabled: (user?.role === "student" || user?.role === "parent") && classroomId > 0,
  });
  const { data: _badgePosts = [] } = useQuery<PostWithAuthor[]>({
    queryKey: ["/api/classrooms", classroomId, "posts"],
    queryFn: () => apiRequest(`/api/classrooms/${classroomId}/posts`),
    enabled: classroomId > 0,
  });

  // Server-persisted seen record — polled every 15 s for multi-device sync
  const { data: _seenData } = useQuery<{ postIds: number[]; materialIds: number[]; assignmentIds: number[] }>({
    queryKey: ["/api/classrooms", classroomId, "my-seen"],
    queryFn: () => apiRequest(`/api/classrooms/${classroomId}/my-seen`),
    enabled: (user?.role === "student" || user?.role === "parent") && classroomId > 0,
    refetchInterval: 15000,
  });

  const archiveMutation = useMutation({
    mutationFn: (status: "active" | "archived") =>
      apiRequest(`/api/classrooms/${classroomId}`, { method: "PATCH", body: JSON.stringify({ status }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/classrooms", slugParam] });
      queryClient.invalidateQueries({ queryKey: ["/api/classrooms"] });
      toast({ title: classroom?.status === "active" ? "Classroom archived" : "Classroom reactivated", type: "success" });
    },
    onError: () => toast({ title: "Couldn't update the classroom — try again.", type: "error" }),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <ModernSidebar />
        <div className="md:ml-[228px] flex items-center justify-center min-h-screen">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!classroom) {
    return (
      <div className="min-h-screen bg-background">
        <ModernSidebar />
        <div className="md:ml-[228px] flex items-center justify-center min-h-screen text-muted-foreground">Classroom not found.</div>
      </div>
    );
  }

  const isTeacher = user?.role === "teacher" && classroom.teacherId === user.id;
  const isStudent = user?.role === "student";
  const isParent = user?.role === "parent";
  const isArchived = classroom.status === "archived";
  const theme = getSubjectTheme(classroom.subject || "");

  const validTeacherTabs = ["feed", "classwork", "assignments", "grades", "students", "settings"];
  const validStudentTabs = ["feed", "classwork", "assignments", "grades"];
  const validParentTabs = ["feed", "classwork", "grades"];
  const validTabs = isTeacher ? validTeacherTabs : isStudent ? validStudentTabs : validParentTabs;

  if (!validTabs.includes(activeTab) || (activeTab === "students" && !isTeacher) || (activeTab === "settings" && !isTeacher)) {
    navigate(`/classrooms/${slugParam}/feed${window.location.search}`);
    return null;
  }

  // Merge server-seen + optimistic local-seen into unified Sets
  const seenPostIds = new Set<number>(_seenData?.postIds ?? []);
  localSeenPosts.forEach((id) => seenPostIds.add(id));
  const seenMaterialIds = new Set<number>(_seenData?.materialIds ?? []);
  localSeenMaterials.forEach((id) => seenMaterialIds.add(id));
  const seenAssignmentIds = new Set<number>(_seenData?.assignmentIds ?? []);
  localSeenAssignments.forEach((id) => seenAssignmentIds.add(id));

  // Fire-and-forget seen mark: optimistic update + API call + cache invalidation
  const markSeen = (type: "post" | "material" | "assignment", contentId: number) => {
    if (type === "post") setLocalSeenPosts((prev) => new Set(prev).add(contentId));
    else if (type === "material") setLocalSeenMaterials((prev) => new Set(prev).add(contentId));
    else setLocalSeenAssignments((prev) => new Set(prev).add(contentId));
    apiRequest(`/api/classrooms/${classroomId}/${type}s/${contentId}/seen`, { method: "POST" })
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/classrooms", classroomId, "my-seen"] });
        if (studentData?.id) {
          queryClient.invalidateQueries({ queryKey: ["/api/students", studentData.id, "classroom-notifications"] });
        }
      })
      .catch(console.error);
  };

  // Count pending (unsubmitted) assignments for the student tab badges
  const assignmentsBadge = isStudent
    ? _badgeAssignments.filter((a) => {
        const sub = _badgeSubmissions.find((s) => s.assignmentId === a.id);
        return !sub || sub.status === "pending";
      }).length
    : 0;

  // Classwork badge: student = linked-pending + unseen standalone; parent = all unseen
  const classworkBadge = isStudent
    ? _badgeMaterials.filter((m) => {
        if (m.linkedAssignment?.id) {
          const sub = _badgeSubmissions.find((s) => s.assignmentId === m.linkedAssignment!.id);
          return !sub || sub.status === "pending";
        }
        return !seenMaterialIds.has(m.id);
      }).length
    : isParent
      ? _badgeMaterials.filter((m) => !m.linkedAssignment?.id && !seenMaterialIds.has(m.id)).length
      : 0;

  // Feed badge: unseen posts for students/parents; teachers have no feed badge
  const feedBadge = (isStudent || isParent)
    ? _badgePosts.filter((p) => !seenPostIds.has(p.id)).length
    : 0;

  const teacherToGrade = _teacherStats[classroomId]?.toGradeCount ?? 0;
  const teacherTabs = [
    { value: "feed", label: "Feed", icon: <Megaphone className="h-3.5 w-3.5" /> },
    { value: "classwork", label: "Classwork", icon: <LibraryBig className="h-3.5 w-3.5" /> },
    { value: "assignments", label: "Assignments & Test", icon: <BookOpen className="h-3.5 w-3.5" />, badge: teacherToGrade || undefined },
    { value: "grades", label: "Grades", icon: <BarChart2 className="h-3.5 w-3.5" /> },
    { value: "students", label: "Students", icon: <Users className="h-3.5 w-3.5" /> },
    { value: "settings", label: "Settings", icon: <Settings2 className="h-3.5 w-3.5" /> },
  ];
  const studentTabs = [
    { value: "feed", label: "Feed", icon: <Megaphone className="h-3.5 w-3.5" />, badge: feedBadge || undefined },
    { value: "classwork", label: "Classwork", icon: <LibraryBig className="h-3.5 w-3.5" />, badge: classworkBadge || undefined },
    { value: "assignments", label: "Assignments & Test", icon: <BookOpen className="h-3.5 w-3.5" />, badge: assignmentsBadge || undefined },
    { value: "grades", label: "Grades", icon: <BarChart2 className="h-3.5 w-3.5" /> },
  ];
  const parentTabs = [
    { value: "feed", label: "Feed", icon: <Megaphone className="h-3.5 w-3.5" />, badge: feedBadge || undefined },
    { value: "classwork", label: "Classwork", icon: <LibraryBig className="h-3.5 w-3.5" />, badge: classworkBadge || undefined },
    { value: "grades", label: "Grades", icon: <BarChart2 className="h-3.5 w-3.5" /> },
  ];

  const tabs = isTeacher ? teacherTabs : isStudent ? studentTabs : parentTabs;

  return (
    <div className="min-h-screen bg-background">
      <ModernSidebar />
      <div className="md:ml-[228px]">
        <div className="p-4 sm:p-5 pt-18 md:pt-5 max-w-4xl mx-auto space-y-5">

          {/* Breadcrumbs */}
          {(() => {
            const tabLabels: Record<string, string> = {
              assignments: "Assignments & Tests",
              grades: "Grades",
              classwork: "Classwork",
              students: "Students",
              settings: "Settings",
            };
            const tabLabel = tabLabels[activeTab];
            const folderHref = classroom.gradeFolderId
              ? `/classrooms/folders/${classroom.gradeFolderId}${isParent && parentStudentId ? `?studentId=${parentStudentId}` : ""}`
              : undefined;
            return (
              <Breadcrumb crumbs={buildClassroomCrumbs({
                role: user?.role ?? undefined,
                classroomName: classroom.name,
                classroomHref: `/classrooms/${slugParam}/feed`,
                tabLabel,
                tabHref: tabLabel ? `/classrooms/${slugParam}/${activeTab}${window.location.search}` : undefined,
                search: window.location.search,
                folderName: classroom.gradeFolderName ?? undefined,
                folderHref,
              })} />
            );
          })()}

          {/* Illustrated header card */}
          <div className={`rounded-2xl border border-border overflow-hidden ${theme.bg}`}>
            <div className="w-full h-28 sm:h-36 overflow-hidden">
              {theme.wideBanner}
            </div>
            <div className="px-5 py-4 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-xl font-bold text-foreground leading-snug">{classroom.name}</h1>
                  {isArchived && <Badge variant="secondary" className="text-xs">Archived</Badge>}
                </div>
                <span className={`text-sm font-semibold ${theme.accentText} mt-0.5 block`}>{classroom.subject}</span>
                {classroom.description && (
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{classroom.description}</p>
                )}
              </div>
              {isTeacher && (
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 gap-1.5 bg-background/80"
                  onClick={() => archiveMutation.mutate(isArchived ? "active" : "archived")}
                  disabled={archiveMutation.isPending}
                >
                  {archiveMutation.isPending
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : isArchived
                      ? <><ArchiveRestore className="h-3.5 w-3.5" />Reactivate</>
                      : <><Archive className="h-3.5 w-3.5" />Archive</>}
                </Button>
              )}
            </div>
          </div>

          {/* Custom tab nav */}
          <TabNav tabs={tabs} active={activeTab} onChange={setActiveTab} />

          {/* Tab content */}
          {activeTab === "feed" && (
            <FeedTab
              classroomId={classroomId}
              isTeacher={isTeacher}
              isArchived={isArchived}
              seenPostIds={seenPostIds}
              onPostSeen={(id) => markSeen("post", id)}
            />
          )}
          {activeTab === "assignments" && isTeacher && <TeacherAssignmentsTab classroomId={classroomId} classroomSlug={classroom.slug ?? classroom.id} isArchived={isArchived} />}
          {activeTab === "assignments" && isStudent && <StudentAssignmentsTab classroomId={classroomId} classroomSlug={classroom.slug ?? classroom.id} studentId={studentData?.id ?? 0} isArchived={isArchived} />}
          {activeTab === "grades" && isTeacher && <TeacherGradesTab classroomId={classroomId} />}
          {activeTab === "grades" && isStudent && (
            <StudentGradesTab classroomId={classroomId} classroomSlug={classroom.slug ?? classroom.id} studentId={studentData?.id ?? 0} />
          )}
          {activeTab === "grades" && isParent && (
            <ParentGradesTab
              classroomId={classroomId}
              studentId={parentStudentId}
              seenAssignmentIds={seenAssignmentIds}
              onAssignmentSeen={(id) => markSeen("assignment", id)}
            />
          )}
          {activeTab === "classwork" && (
            <ClassworkTab
              classroomId={classroomId}
              classroomSlug={classroom.slug ?? classroom.id}
              isTeacher={isTeacher}
              isStudent={isStudent}
              isArchived={isArchived}
              seenMaterialIds={seenMaterialIds}
              onMaterialSeen={(id) => markSeen("material", id)}
            />
          )}
          {activeTab === "students" && isTeacher && <StudentsTab classroomId={classroomId} isArchived={isArchived} />}
          {activeTab === "settings" && isTeacher && <TeacherSettingsTab classroomId={classroomId} />}

        </div>
      </div>
    </div>
  );
}

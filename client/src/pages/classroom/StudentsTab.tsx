import { useState } from "react";
import { useQuery, useQueries, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Loader2, Plus } from "lucide-react";
import type { ClassroomAssignment, ClassroomSubmission, Student } from "@shared/schema";
import type { EnrollmentWithStudent } from "./types";

type StudentSearchResult = { id: number; name: string; gradeLevel: string; email: string };

export default function StudentsTab({ classroomId, isArchived }: { classroomId: number; isArchived: boolean }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQ, setSearchQ] = useState("");

  const { data: enrollments = [], isLoading } = useQuery<EnrollmentWithStudent[]>({
    queryKey: ["/api/classrooms", classroomId, "enrollments"],
    queryFn: () => apiRequest(`/api/classrooms/${classroomId}/enrollments`),
  });
  const { data: myStudents = [] } = useQuery<(Student & { email?: string })[]>({ queryKey: ["/api/students/teacher"] });
  const { data: assignments = [] } = useQuery<ClassroomAssignment[]>({
    queryKey: ["/api/classrooms", classroomId, "assignments"],
    queryFn: () => apiRequest(`/api/classrooms/${classroomId}/assignments`),
  });
  const { data: searchResults = [] } = useQuery<StudentSearchResult[]>({
    queryKey: ["/api/students/search", searchQ],
    queryFn: () => apiRequest(`/api/students/search?q=${encodeURIComponent(searchQ)}`),
    enabled: searchOpen,
  });

  const enrolledIds = new Set(enrollments.map((e) => e.studentId));
  const unenrolledAssigned = myStudents.filter((s) => !enrolledIds.has(s.id));
  const filteredSearch = searchResults.filter((s) => !enrolledIds.has(s.id));
  const totalPoints = assignments.reduce((s, a) => s + a.points, 0);

  const submissionsResults = useQueries({
    queries: enrollments.map((e) => ({
      queryKey: ["/api/classrooms", classroomId, "my-submissions", e.studentId],
      queryFn: () => apiRequest(`/api/classrooms/${classroomId}/my-submissions?studentId=${e.studentId}`) as Promise<ClassroomSubmission[]>,
      enabled: enrollments.length > 0,
    })),
  });

  const enrollMutation = useMutation({
    mutationFn: (studentId: number) => apiRequest(`/api/classrooms/${classroomId}/enroll`, { method: "POST", body: JSON.stringify({ studentId }) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/classrooms", classroomId, "enrollments"] }); toast({ title: "Student enrolled", type: "success" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, type: "error" }),
  });

  const removeMutation = useMutation({
    mutationFn: (studentId: number) => apiRequest(`/api/classrooms/${classroomId}/students/${studentId}`, { method: "DELETE" }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/classrooms", classroomId, "enrollments"] }); toast({ title: "Student removed", type: "success" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, type: "error" }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">
          Enrolled Students {enrollments.length > 0 && <span className="text-muted-foreground font-normal">({enrollments.length})</span>}
        </h3>
        {!isArchived && (
          <Dialog open={searchOpen} onOpenChange={(o) => { setSearchOpen(o); if (!o) setSearchQ(""); }}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5"><Plus className="h-3.5 w-3.5" />Add Students</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>Add Students</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <Input placeholder="Search by name, username, or email…" value={searchQ} onChange={(e) => setSearchQ(e.target.value)} autoFocus />
                <div className="space-y-1 max-h-72 overflow-y-auto">
                  {searchQ.length < 2 && <p className="text-sm text-muted-foreground text-center py-4">Type at least 2 characters to search.</p>}
                  {filteredSearch.length === 0 && searchQ.length >= 2 && <p className="text-sm text-muted-foreground text-center py-4">No students found.</p>}
                  {filteredSearch.map((s) => (
                    <div key={s.id} className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5">
                      <div>
                        <p className="text-sm font-medium text-foreground">{s.name}</p>
                        <p className="text-xs text-muted-foreground">{s.email} · {s.gradeLevel}</p>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => enrollMutation.mutate(s.id)} disabled={enrollMutation.isPending}>Enroll</Button>
                    </div>
                  ))}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {isLoading && <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>}
      {!isLoading && enrollments.length === 0 && (
        <div className="text-center py-12 text-muted-foreground text-sm rounded-2xl border border-dashed border-border">No students enrolled yet.</div>
      )}

      <div className="space-y-2">
        {enrollments.map((e, i) => {
          const subs = submissionsResults[i]?.data ?? [];
          const earned = subs.reduce((s, sub) => s + (sub.grade ?? 0), 0);
          const pct = totalPoints > 0 ? Math.round((earned / totalPoints) * 100) : null;
          return (
            <div key={e.studentId} className="flex items-center justify-between rounded-2xl border border-border px-4 py-3 bg-card">
              <div>
                <p className="text-sm font-medium text-foreground">{e.student.name}</p>
                {pct !== null && (
                  <p className="text-xs text-muted-foreground">{earned} / {totalPoints} pts · {pct}%</p>
                )}
              </div>
              {!isArchived && (
                <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-600"
                  onClick={() => removeMutation.mutate(e.studentId)} disabled={removeMutation.isPending}>
                  Remove
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {!isArchived && unenrolledAssigned.length > 0 && (
        <div className="pt-2 border-t border-border">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Your students not yet enrolled</p>
          <div className="space-y-1.5">
            {unenrolledAssigned.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-2xl border border-border px-4 py-2.5 bg-card">
                <span className="text-sm text-foreground">{s.name}</span>
                <Button size="sm" variant="outline" onClick={() => enrollMutation.mutate(s.id)} disabled={enrollMutation.isPending}>+ Enroll</Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

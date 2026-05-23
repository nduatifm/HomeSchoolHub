import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Loader2, Plus } from "lucide-react";
import type { ClassroomAssignment, ClassroomMaterial, ClassroomSubmission } from "@shared/schema";
import ClassworkCard from "./ClassworkCard";

export default function ClassworkTab({
  classroomId,
  classroomSlug,
  isTeacher,
  isStudent,
  isArchived,
  seenMaterialIds,
  onMaterialSeen,
}: {
  classroomId: number;
  classroomSlug: string | number;
  isTeacher: boolean;
  isStudent: boolean;
  isArchived: boolean;
  seenMaterialIds?: Set<number>;
  onMaterialSeen?: (materialId: number) => void;
}) {
  const [, navigate] = useLocation();

  const { data: classwork = [], isLoading } = useQuery<ClassroomMaterial[]>({
    queryKey: ["/api/classrooms", classroomId, "materials"],
    queryFn: () => apiRequest(`/api/classrooms/${classroomId}/materials`),
  });
  const { data: assignments = [] } = useQuery<ClassroomAssignment[]>({
    queryKey: ["/api/classrooms", classroomId, "assignments"],
    queryFn: () => apiRequest(`/api/classrooms/${classroomId}/assignments`),
  });
  const { data: mySubmissions } = useQuery<ClassroomSubmission[]>({
    queryKey: ["/api/classrooms", classroomId, "my-submissions"],
    queryFn: () => apiRequest(`/api/classrooms/${classroomId}/my-submissions`),
    enabled: isStudent,
  });

  return (
    <div className="space-y-3">
      {isTeacher && !isArchived && (
        <div className="flex justify-end">
          <Button
            size="sm"
            className="gap-1.5"
            onClick={() => navigate(`/classrooms/${classroomSlug}/materials/new`)}
          >
            <Plus className="h-3.5 w-3.5" />Add Materials
          </Button>
        </div>
      )}
      {isLoading && (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}
      {!isLoading && classwork.length === 0 && (
        <div className="text-center py-12 text-muted-foreground text-sm rounded-2xl border border-dashed border-border">
          No classwork yet.
        </div>
      )}
      <div className="space-y-2">
        {classwork.map((item) => {
          const isUnseen = !isTeacher && seenMaterialIds ? !seenMaterialIds.has(item.id) : false;
          return (
            <ClassworkCard
              key={item.id}
              item={item}
              classroomId={classroomId}
              classroomSlug={classroomSlug}
              isTeacher={isTeacher}
              isArchived={isArchived}
              assignments={assignments}
              mySubmissions={mySubmissions}
              isUnseen={isUnseen}
              onSeen={isUnseen ? () => onMaterialSeen?.(item.id) : undefined}
            />
          );
        })}
      </div>
    </div>
  );
}

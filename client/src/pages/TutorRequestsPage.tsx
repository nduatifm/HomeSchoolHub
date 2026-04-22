import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import ModernSidebar from "@/components/ModernSidebar";
import type { EnrichedTutorRequest } from "@shared/schema";

export default function TutorRequestsPage() {
  const { data: tutorRequests = [] } = useQuery<EnrichedTutorRequest[]>({
    queryKey: ["/api/tutor-requests/teacher"],
  });

  const approveTutorRequestMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      apiRequest(`/api/tutor-requests/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tutor-requests/teacher"] });
      toast({ title: "Request updated!", type: "success" });
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <ModernSidebar />
      <div className="md:ml-[228px]">
        <main className="p-4 sm:p-5 pt-18 md:pt-5 max-w-4xl mx-auto">
          <h1 className="text-xl font-semibold text-foreground mb-5">Tutor Requests</h1>

          <div className="space-y-4">
            {tutorRequests.length === 0 ? (
              <div className="text-center py-10 rounded-2xl border border-dashed border-border">
                <p className="text-sm text-muted-foreground">No tutor requests yet. When a parent sends you a request, it will appear here.</p>
              </div>
            ) : (
              [...tutorRequests]
                .sort((a: EnrichedTutorRequest, b: EnrichedTutorRequest) => {
                  if (a.status === "pending" && b.status !== "pending") return -1;
                  if (a.status !== "pending" && b.status === "pending") return 1;
                  return 0;
                })
                .map((r: EnrichedTutorRequest) => (
                  <div key={r.id} className="p-4 border rounded-lg" data-testid={`card-request-${r.id}`}>
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">
                          {r.parentName || "A parent"} is requesting tutoring
                          {r.studentName ? ` for ${r.studentName}` : ""}
                          {r.studentGrade ? ` (${r.studentGrade})` : ""}
                        </p>
                        {r.message && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2" data-testid={`text-request-message-${r.id}`}>
                            "{r.message}"
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(r.requestDate).toLocaleDateString()}
                        </p>
                        <Badge
                          className="mt-1"
                          variant={r.status === "approved" ? "default" : r.status === "rejected" ? "outline" : "secondary"}
                        >
                          {r.status}
                        </Badge>
                      </div>
                      {r.status === "pending" && (
                        <div className="flex gap-2 shrink-0">
                          <Button
                            size="sm"
                            onClick={() => approveTutorRequestMutation.mutate({ id: r.id, status: "approved" })}
                            disabled={approveTutorRequestMutation.isPending}
                            data-testid={`button-approve-${r.id}`}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => approveTutorRequestMutation.mutate({ id: r.id, status: "rejected" })}
                            disabled={approveTutorRequestMutation.isPending}
                            data-testid={`button-reject-${r.id}`}
                          >
                            Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { MessageSquare } from "lucide-react";
import ModernSidebar from "@/components/ModernSidebar";

export default function StudentFeedbackPage() {
  const { student } = useAuth();

  const { data: feedback = [], isLoading } = useQuery({
    queryKey: ["/api/feedback/student", student?.id],
    enabled: !!student,
  });

  return (
    <div className="min-h-screen bg-background">
      <ModernSidebar />
      <div className="md:ml-[228px]">
        <main className="p-4 sm:p-5 pt-18 md:pt-5 max-w-4xl mx-auto">
          <h1 className="text-xl font-semibold text-foreground mb-5 flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" /> Feedback
          </h1>

          {isLoading ? (
            <div className="text-center py-8 text-sm text-muted-foreground">Loading feedback…</div>
          ) : (feedback as any[]).length === 0 ? (
            <div className="text-center py-12 rounded-2xl border border-dashed border-border">
              <p className="text-sm text-muted-foreground">No feedback yet. Your teacher's feedback will appear here.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {(feedback as any[]).map((f: any) => (
                <div key={f.id} className="p-4 border rounded-lg" data-testid={`card-feedback-${f.id}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium" data-testid={`text-feedback-message-${f.id}`}>{f.message}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {new Date(f.date).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant={f.type === "positive" ? "default" : "secondary"}>{f.type}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { MessageSquare } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import ModernSidebar from "@/components/ModernSidebar";
import type { Student } from "@shared/schema";

type FeedbackWithStudent = {
  id: number;
  teacherId: number;
  studentId: number;
  sessionId?: number | null;
  type: string;
  content: string;
  message: string;
  date: string;
  createdAt?: string | null;
  studentName: string;
};

const feedbackSchema = z.object({
  studentId: z.number().min(1, "Student required"),
  message: z.string().min(1, "Message required"),
  type: z.string().min(1, "Type required"),
});

function GiveFeedbackDialog({
  open,
  onClose,
  students,
}: {
  open: boolean;
  onClose: () => void;
  students: any[];
}) {
  const form = useForm({
    resolver: zodResolver(feedbackSchema),
    defaultValues: { studentId: 0, message: "", type: "general" },
  });

  const mutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/feedback", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/feedback/teacher"] });
      toast({ title: "Feedback sent!", type: "success" });
      form.reset();
      onClose();
    },
    onError: () => toast({ title: "Couldn't send feedback — try again.", type: "error" }),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Give Student Feedback</DialogTitle></DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
            <FormField
              control={form.control}
              name="studentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Student</FormLabel>
                  <FormControl>
                    <Select onValueChange={(v) => field.onChange(parseInt(v))} value={field.value ? field.value.toString() : ""}>
                      <SelectTrigger data-testid="select-feedback-student">
                        <SelectValue placeholder="Select a student" />
                      </SelectTrigger>
                      <SelectContent>
                        {students.map((s: any) => (
                          <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Feedback Type</FormLabel>
                  <FormControl>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger data-testid="select-feedback-type">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="positive">Positive</SelectItem>
                        <SelectItem value="constructive">Constructive</SelectItem>
                        <SelectItem value="general">General</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Message</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Enter your feedback..." rows={4} {...field} data-testid="input-feedback-message" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={mutation.isPending} className="w-full" data-testid="button-submit-feedback">
              {mutation.isPending ? "Sending..." : "Send Feedback"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function TeacherFeedbackPage() {
  const [giveFeedbackOpen, setGiveFeedbackOpen] = useState(false);

  const { data: students = [] } = useQuery<Student[]>({ queryKey: ["/api/students/teacher"] });
  const { data: feedbacks = [], isLoading, isError } = useQuery<FeedbackWithStudent[]>({
    queryKey: ["/api/feedback/teacher"],
  });

  return (
    <div className="min-h-screen bg-background">
      <ModernSidebar />
      <div className="md:ml-[228px]">
        <main className="p-4 sm:p-5 pt-18 md:pt-5 max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-5">
            <h1 className="text-xl font-semibold text-foreground">Student Feedback</h1>
            <Button onClick={() => setGiveFeedbackOpen(true)} data-testid="button-give-feedback">
              <MessageSquare className="h-4 w-4 mr-2" />
              Give Feedback
            </Button>
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-sm text-muted-foreground">Loading feedback...</div>
          ) : isError ? (
            <div className="text-center py-8 text-sm text-red-500">Error loading feedback</div>
          ) : feedbacks.length === 0 ? (
            <p className="text-center text-muted-foreground py-8 text-sm rounded-2xl border border-dashed border-border">No feedback given yet</p>
          ) : (
            <div className="space-y-4">
              {feedbacks.map((f) => (
                <div key={f.id} className="p-4 border rounded-lg" data-testid={`card-feedback-${f.id}`}>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <p className="font-medium" data-testid={`text-feedback-student-${f.id}`}>
                          {f.studentName || students.find((st) => st.id === f.studentId)?.name || "Unknown student"}
                        </p>
                        <Badge variant={f.type === "positive" ? "default" : f.type === "constructive" ? "secondary" : "outline"}>
                          {f.type}
                        </Badge>
                      </div>
                      <p className="text-sm" data-testid={`text-feedback-message-${f.id}`}>{f.message}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {new Date(f.date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      <GiveFeedbackDialog
        open={giveFeedbackOpen}
        onClose={() => setGiveFeedbackOpen(false)}
        students={students}
      />
    </div>
  );
}

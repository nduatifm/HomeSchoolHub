import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Send, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import ModernSidebar from "@/components/ModernSidebar";
import ModernCombobox from "@/components/ModernCombobox";
import type { Student, User } from "@shared/schema";

type StudentWithParent = Student & {
  email?: string;
  parentName?: string;
  parentId?: number;
  classrooms?: { id: number; name: string; slug?: string | null }[];
};

type PublicUser = Pick<User, "id" | "name" | "email" | "role" | "profilePicture">;

function SendMessageDialog({
  open,
  onClose,
  users,
  initialReceiverId,
  initialReceiverName,
}: {
  open: boolean;
  onClose: () => void;
  users: PublicUser[];
  initialReceiverId?: number;
  initialReceiverName?: string;
}) {
  const [form, setForm] = useState({ receiverId: 0, receiverName: "", content: "" });

  useEffect(() => {
    if (open) {
      setForm({ receiverId: initialReceiverId ?? 0, receiverName: initialReceiverName ?? "", content: "" });
    }
  }, [open, initialReceiverId, initialReceiverName]);

  const mutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/messages", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages/conversations"] });
      toast({ title: "Message sent!", type: "success" });
      onClose();
    },
    onError: () => toast({ title: "Couldn't send message — try again.", type: "error" }),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Send Message</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">To</label>
            {form.receiverId ? (
              <div className="flex items-center gap-2 px-3 py-2 rounded-md border bg-muted/40 text-sm">
                <span className="font-medium">
                  {form.receiverName || users.find((u) => u.id === form.receiverId)?.name || "Unknown user"}
                </span>
                <span className="text-xs text-muted-foreground ml-auto">
                  {users.find((u) => u.id === form.receiverId)?.email}
                </span>
              </div>
            ) : (
              <ModernCombobox
                users={users}
                selectedUserId={form.receiverId}
                onSelect={(userId) => setForm({ ...form, receiverId: userId })}
                placeholder="Search users..."
                testId="select-receiver-teacher"
              />
            )}
          </div>
          <div>
            <label className="text-sm font-medium">Message</label>
            <Textarea
              placeholder="Type your message..."
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              rows={4}
              data-testid="input-message-content"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button
              onClick={() => mutation.mutate(form)}
              disabled={mutation.isPending || !form.receiverId || !form.content}
              data-testid="button-send-message"
            >
              <Send className="w-4 h-4 mr-2" />
              {mutation.isPending ? "Sending..." : "Send"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function TeacherStudentsPage() {
  const [, navigate] = useLocation();
  const [sendMessageOpen, setSendMessageOpen] = useState(false);
  const [sendMessageReceiverId, setSendMessageReceiverId] = useState(0);
  const [sendMessageReceiverName, setSendMessageReceiverName] = useState("");

  const { data: students = [] } = useQuery<StudentWithParent[]>({ queryKey: ["/api/students/teacher"] });
  const { data: users = [] } = useQuery<PublicUser[]>({ queryKey: ["/api/users"] });

  return (
    <div className="min-h-screen bg-background">
      <ModernSidebar />
      <div className="md:ml-[228px]">
        <main className="p-4 sm:p-5 pt-18 md:pt-5 max-w-4xl mx-auto">
          <h1 className="text-xl font-semibold text-foreground mb-5">Students</h1>

          {students.length === 0 ? (
            <p className="text-center text-muted-foreground py-8 text-sm rounded-2xl border border-dashed border-border">
              No students linked yet. Students join via a tutor request from their parent.
            </p>
          ) : (
            <div className="rounded-2xl border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead>Parent</TableHead>
                    <TableHead>Classrooms</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((s: any) => (
                    <TableRow key={s.id} data-testid={`row-student-${s.id}`}>
                      <TableCell data-testid={`text-student-name-${s.id}`}>
                        <div>
                          <p className="font-medium">{s.name}</p>
                          {s.email && <p className="text-xs text-muted-foreground">{s.email}</p>}
                        </div>
                      </TableCell>
                      <TableCell>{s.gradeLevel || <span className="text-muted-foreground/50">—</span>}</TableCell>
                      <TableCell>
                        {s.parentName
                          ? <span className="text-sm text-muted-foreground">{s.parentName}</span>
                          : <span className="text-xs text-muted-foreground/50 italic">Unknown</span>
                        }
                      </TableCell>
                      <TableCell>
                        {s.classrooms && s.classrooms.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {s.classrooms.map((c: { id: number; name: string; slug?: string | null }) => (
                              <a
                                key={c.id}
                                href={`/classrooms/${c.slug ?? c.id}`}
                                onClick={(e) => {
                                  if (!e.ctrlKey && !e.metaKey && !e.shiftKey && e.button === 0) {
                                    e.preventDefault();
                                    navigate(`/classrooms/${c.slug ?? c.id}`);
                                  }
                                }}
                              >
                                <Badge variant="secondary" className="text-xs font-normal cursor-pointer hover:bg-secondary/70 transition-colors">
                                  {c.name}
                                </Badge>
                              </a>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground/50 text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {s.parentId && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-muted-foreground hover:text-primary"
                            onClick={() => {
                              setSendMessageReceiverId(s.parentId as number);
                              setSendMessageReceiverName(s.parentName ?? "");
                              setSendMessageOpen(true);
                            }}
                            data-testid={`button-message-parent-${s.id}`}
                          >
                            <MessageSquare className="w-3.5 h-3.5 mr-1" />
                            Message parent
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </main>
      </div>

      <SendMessageDialog
        open={sendMessageOpen}
        onClose={() => setSendMessageOpen(false)}
        users={users}
        initialReceiverId={sendMessageReceiverId}
        initialReceiverName={sendMessageReceiverName}
      />
    </div>
  );
}

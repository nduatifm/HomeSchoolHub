import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ThreadMessage {
  id: number;
  senderId: number;
  receiverId: number;
  message: string;
  timestamp: string;
  senderName?: string;
}

interface MessageThreadProps {
  teacherId: number;
  studentId: number;
  myUserId: number;
  receiverId: number;
  title?: string;
  onBack?: () => void;
}

export default function MessageThread({
  teacherId,
  studentId,
  myUserId,
  receiverId,
  title,
  onBack,
}: MessageThreadProps) {
  const { toast } = useToast();
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: messages = [], isLoading } = useQuery<ThreadMessage[]>({
    queryKey: ["/api/messages/thread", teacherId, studentId],
    queryFn: () =>
      apiRequest(
        `/api/messages/thread?teacherId=${teacherId}&studentId=${studentId}`,
      ),
    refetchInterval: 10000,
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const sendMutation = useMutation({
    mutationFn: () =>
      apiRequest("/api/messages", {
        method: "POST",
        body: JSON.stringify({ receiverId, message: text }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/messages/thread", teacherId, studentId],
      });
      setText("");
    },
    onError: () => {
      toast({ title: "Failed to send message", variant: "destructive" });
    },
  });

  const handleSend = () => {
    if (!text.trim()) return;
    sendMutation.mutate();
  };

  return (
    <div className="flex flex-col h-[500px]">
      {(onBack || title) && (
        <div className="flex items-center gap-2 pb-3 mb-3 border-b">
          {onBack && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="h-8 w-8 p-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          {title && <span className="font-medium text-sm">{title}</span>}
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {isLoading ? (
          <p className="text-center text-muted-foreground py-8 text-sm">
            Loading messages...
          </p>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
            <p className="text-sm">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === myUserId;
            return (
              <div
                key={msg.id}
                className={`flex ${isMe ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[75%] flex flex-col gap-1 ${isMe ? "items-end" : "items-start"}`}
                >
                  <span className="text-xs text-muted-foreground px-1">
                    {isMe ? "You" : msg.senderName || `User #${msg.senderId}`}
                  </span>
                  <div
                    className={`rounded-lg px-3 py-2 text-sm ${
                      isMe
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    }`}
                  >
                    {msg.message}
                  </div>
                  <span className="text-xs text-muted-foreground px-1">
                    {new Date(msg.timestamp).toLocaleString()}
                  </span>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2 mt-3 pt-3 border-t">
        <Textarea
          placeholder="Type a message..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          className="resize-none min-h-[40px] max-h-[100px]"
          rows={2}
        />
        <Button
          onClick={handleSend}
          disabled={!text.trim() || sendMutation.isPending}
          size="icon"
          className="h-auto shrink-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

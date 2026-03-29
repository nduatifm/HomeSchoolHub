import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Send, ArrowLeft, MessageSquare } from "lucide-react";
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

function formatTime(ts: string): string {
  const date = new Date(ts);
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatSmartTimestamp(ts: string): string {
  const date = new Date(ts);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const msgDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const time = date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  if (msgDay.getTime() === today.getTime()) return time;
  if (msgDay.getTime() === yesterday.getTime()) return `Yesterday ${time}`;
  return `${date.toLocaleDateString([], { month: "short", day: "numeric" })} ${time}`;
}

function getDayKey(ts: string): string {
  const date = new Date(ts);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function getDayLabel(ts: string): string {
  const date = new Date(ts);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const msgDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (msgDay.getTime() === today.getTime()) return "Today";
  if (msgDay.getTime() === yesterday.getTime()) return "Yesterday";
  return date.toLocaleDateString([], { month: "long", day: "numeric" });
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  const autoResize = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 96) + "px";
  };

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
      queryClient.invalidateQueries({ queryKey: ["/api/messages/unread-count"] });
      setText("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    },
    onError: () => {
      toast({ title: "Failed to send message", variant: "destructive" });
    },
  });

  const handleSend = () => {
    if (!text.trim()) return;
    sendMutation.mutate();
  };

  type Group = {
    senderId: number;
    senderName?: string;
    isMe: boolean;
    dayKey: string;
    messages: ThreadMessage[];
  };

  const groups: Group[] = [];
  let prevDayKey = "";

  for (const msg of messages) {
    const isMe = msg.senderId === myUserId;
    const dayKey = getDayKey(msg.timestamp);
    const lastGroup = groups[groups.length - 1];

    if (
      lastGroup &&
      lastGroup.senderId === msg.senderId &&
      lastGroup.dayKey === dayKey
    ) {
      lastGroup.messages.push(msg);
    } else {
      groups.push({
        senderId: msg.senderId,
        senderName: msg.senderName,
        isMe,
        dayKey,
        messages: [msg],
      });
    }
    prevDayKey = dayKey;
  }

  return (
    <div className="flex flex-col min-h-[380px] max-h-[580px]">
      {(onBack || title) && (
        <div className="flex items-center gap-2 bg-muted/40 rounded-lg px-3 py-2 mb-3">
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center justify-center w-7 h-7 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}
          {title && <span className="font-semibold text-sm">{title}</span>}
        </div>
      )}

      <div className="flex-1 overflow-y-auto bg-muted/30 rounded-xl p-3 space-y-1 min-h-0">
        {isLoading ? (
          <div className="space-y-3 p-2">
            <div className="flex justify-start">
              <div className="h-8 w-40 bg-muted animate-pulse rounded-2xl rounded-tl-sm" />
            </div>
            <div className="flex justify-end">
              <div className="h-8 w-52 bg-primary/20 animate-pulse rounded-2xl rounded-tr-sm" />
            </div>
            <div className="flex justify-start">
              <div className="h-8 w-32 bg-muted animate-pulse rounded-2xl rounded-tl-sm" />
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-12 text-center text-muted-foreground gap-3">
            <MessageSquare className="w-9 h-9 opacity-30" />
            <p className="text-sm">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          (() => {
            const elements: React.ReactNode[] = [];
            let shownDayKeys = new Set<string>();

            for (let gi = 0; gi < groups.length; gi++) {
              const group = groups[gi];

              if (!shownDayKeys.has(group.dayKey)) {
                shownDayKeys.add(group.dayKey);
                elements.push(
                  <div key={`day-${group.dayKey}`} className="flex items-center gap-3 my-3">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-xs text-muted-foreground font-medium px-1">
                      {getDayLabel(group.messages[0].timestamp)}
                    </span>
                    <div className="flex-1 h-px bg-border" />
                  </div>
                );
              }

              elements.push(
                <div
                  key={`group-${gi}`}
                  className={`flex flex-col gap-0.5 ${group.isMe ? "items-end" : "items-start"} mb-2`}
                >
                  {!group.isMe && (
                    <span className="text-xs text-muted-foreground font-medium px-1 mb-0.5">
                      {group.senderName || `User #${group.senderId}`}
                    </span>
                  )}

                  {group.messages.map((msg, mi) => {
                    const isFirst = mi === 0;
                    const isLast = mi === group.messages.length - 1;

                    const sentCorner = isFirst ? "" : "rounded-tl-sm";
                    const receivedCorner = isFirst ? "" : "rounded-tr-sm";

                    return (
                      <div
                        key={msg.id}
                        className={`flex items-end gap-2 ${group.isMe ? "flex-row-reverse" : "flex-row"}`}
                      >
                        {!group.isMe && (
                          <div className={`w-6 shrink-0 ${isLast ? "visible" : "invisible"}`}>
                            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="text-[10px] font-semibold text-primary">
                                {(group.senderName || "?").charAt(0).toUpperCase()}
                              </span>
                            </div>
                          </div>
                        )}
                        <div
                          className={`max-w-[72%] px-4 py-2.5 text-sm shadow-sm leading-relaxed
                            ${group.isMe
                              ? `bg-primary text-primary-foreground rounded-2xl ${sentCorner}`
                              : `bg-white dark:bg-slate-800 text-foreground border border-border/50 rounded-2xl ${receivedCorner}`
                            }`}
                        >
                          {msg.message}
                        </div>
                      </div>
                    );
                  })}

                  <span className={`text-[11px] text-muted-foreground px-1 mt-0.5 ${group.isMe ? "text-right" : "text-left pl-8"}`}>
                    {formatSmartTimestamp(group.messages[group.messages.length - 1].timestamp)}
                  </span>
                </div>
              );
            }

            return elements;
          })()
        )}
        <div ref={bottomRef} />
      </div>

      <div className="mt-3 flex items-end gap-2 rounded-2xl border bg-background px-3 py-2 focus-within:ring-2 focus-within:ring-primary/30 transition-shadow">
        <textarea
          ref={textareaRef}
          placeholder="Type a message..."
          value={text}
          rows={1}
          onChange={(e) => {
            setText(e.target.value);
            autoResize();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          className="flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground min-h-[24px] max-h-[96px] leading-6 overflow-y-auto"
          style={{ height: "24px" }}
        />
        <button
          onClick={handleSend}
          disabled={!text.trim() || sendMutation.isPending}
          className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground shrink-0 hover:opacity-90 disabled:opacity-40 transition-all mb-0.5"
        >
          <Send className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

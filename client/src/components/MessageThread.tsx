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
  return date.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
}

type Group = {
  senderId: number;
  senderName?: string;
  isMe: boolean;
  dayKey: string;
  messages: ThreadMessage[];
};

function getInitials(name?: string): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
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
      apiRequest(`/api/messages/thread?teacherId=${teacherId}&studentId=${studentId}`),
    refetchInterval: 10000,
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const autoResize = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  };

  const sendMutation = useMutation({
    mutationFn: () =>
      apiRequest("/api/messages", {
        method: "POST",
        body: JSON.stringify({ receiverId, message: text }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages/thread", teacherId, studentId] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages/unread-count"] });
      setText("");
      if (textareaRef.current) textareaRef.current.style.height = "auto";
    },
    onError: () => {
      toast({ title: "Failed to send message", variant: "destructive" });
    },
  });

  const handleSend = () => {
    if (!text.trim() || sendMutation.isPending) return;
    sendMutation.mutate();
  };

  // Group messages by sender + day
  const groups: Group[] = [];
  for (const msg of messages) {
    const isMe = msg.senderId === myUserId;
    const dayKey = getDayKey(msg.timestamp);
    const last = groups[groups.length - 1];
    if (last && last.senderId === msg.senderId && last.dayKey === dayKey) {
      last.messages.push(msg);
    } else {
      groups.push({ senderId: msg.senderId, senderName: msg.senderName, isMe, dayKey, messages: [msg] });
    }
  }

  return (
    <div
      className="flex flex-col"
      style={{
        minHeight: 400,
        maxHeight: 620,
        fontFamily: "'DM Sans', 'Inter', sans-serif",
      }}
    >
      {/* Header */}
      {(onBack || title) && (
        <div
          className="flex items-center gap-2.5 px-4 py-3 border-b"
          style={{ borderColor: "#f0f2f5", background: "#fff" }}
        >
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center justify-center w-8 h-8 rounded-full transition-colors"
              style={{ color: "#6b7280" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#f5f7fa")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}
          {title && (
            <span className="font-semibold text-sm" style={{ color: "#111827", letterSpacing: "-0.01em" }}>
              {title}
            </span>
          )}
        </div>
      )}

      {/* Message list */}
      <div
        className="flex-1 overflow-y-auto px-4 py-4 min-h-0"
        style={{ background: "#ffffff" }}
      >
        {isLoading ? (
          <div className="flex flex-col gap-3 pt-2">
            {[{ w: 140, align: "start" }, { w: 200, align: "end" }, { w: 110, align: "start" }].map((s, i) => (
              <div key={i} className={`flex ${s.align === "end" ? "justify-end" : "justify-start"}`}>
                <div
                  className="animate-pulse rounded-2xl"
                  style={{
                    width: s.w,
                    height: 36,
                    background: s.align === "end" ? "#dbeafe" : "#e5e7eb",
                    borderRadius: s.align === "end" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                  }}
                />
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-16 gap-3">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ background: "#eff6ff" }}
            >
              <MessageSquare className="w-5 h-5" style={{ color: "#2563eb" }} />
            </div>
            <p className="text-sm font-medium" style={{ color: "#9ca3af" }}>
              No messages yet — say hello!
            </p>
          </div>
        ) : (
          (() => {
            const elements: React.ReactNode[] = [];
            const shownDayKeys = new Set<string>();

            for (let gi = 0; gi < groups.length; gi++) {
              const group = groups[gi];

              // Day divider
              if (!shownDayKeys.has(group.dayKey)) {
                shownDayKeys.add(group.dayKey);
                elements.push(
                  <div key={`day-${group.dayKey}`} className="flex items-center gap-3 my-5">
                    <div className="flex-1 h-px" style={{ background: "#e5e7eb" }} />
                    <span
                      className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                      style={{ color: "#6b7280", background: "#f0f2f5", letterSpacing: "0.02em" }}
                    >
                      {getDayLabel(group.messages[0].timestamp)}
                    </span>
                    <div className="flex-1 h-px" style={{ background: "#e5e7eb" }} />
                  </div>
                );
              }

              elements.push(
                <div
                  key={`group-${gi}`}
                  className={`flex gap-3 mb-4 ${group.isMe ? "flex-row-reverse" : ""}`}
                >
                  {/* Avatar */}
                  <div className="shrink-0 pt-0.5" style={{ width: 32 }}>
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold"
                      style={{
                        background: group.isMe ? "hsl(158 64% 36%)" : "#f3f4f6",
                        color: group.isMe ? "#ffffff" : "#374151",
                      }}
                    >
                      {getInitials(group.senderName)}
                    </div>
                  </div>

                  {/* Content column */}
                  <div className={`flex flex-col gap-1 min-w-0 flex-1 ${group.isMe ? "items-end" : ""}`}>
                    {/* Name + timestamp */}
                    <div className={`flex items-baseline gap-2 ${group.isMe ? "justify-end" : ""}`}>
                      <span
                        className="text-[13px] font-semibold leading-none"
                        style={{ color: "#111827" }}
                      >
                        {group.isMe ? "You" : (group.senderName || `User #${group.senderId}`)}
                      </span>
                      <span className="text-[11px]" style={{ color: "#9ca3af" }}>
                        {formatSmartTimestamp(group.messages[0].timestamp)}
                      </span>
                    </div>

                    {/* Bubbles */}
                    {group.messages.map((msg) => (
                      <div
                        key={msg.id}
                        className="text-sm leading-relaxed"
                        style={{
                          display: "inline-block",
                          maxWidth: "85%",
                          padding: "8px 14px",
                          borderRadius: 16,
                          background: group.isMe ? "hsl(158 64% 36%)" : "#f3f4f6",
                          color: group.isMe ? "#ffffff" : "#111827",
                          wordBreak: "break-word",
                          alignSelf: group.isMe ? "flex-end" : "flex-start",
                        }}
                      >
                        {msg.message}
                      </div>
                    ))}
                  </div>
                </div>
              );
            }

            return elements;
          })()
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div
        className="flex items-end gap-2.5 px-3 py-2.5 border-t"
        style={{
          background: "#ffffff",
          borderColor: "#f0f2f5",
        }}
      >
        <div
          className="flex-1 flex items-end rounded-2xl border px-3.5 py-2 transition-all"
          style={{
            borderColor: "#e5e7eb",
            background: "#f8f9fb",
          }}
          onFocusCapture={(e) => {
            e.currentTarget.style.borderColor = "#2563eb";
            e.currentTarget.style.boxShadow = "0 0 0 3px rgba(37,99,235,0.1)";
            e.currentTarget.style.background = "#fff";
          }}
          onBlurCapture={(e) => {
            e.currentTarget.style.borderColor = "#e5e7eb";
            e.currentTarget.style.boxShadow = "none";
            e.currentTarget.style.background = "#f8f9fb";
          }}
        >
          <textarea
            ref={textareaRef}
            placeholder="Write a message…"
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
            className="flex-1 resize-none bg-transparent text-sm outline-none leading-6 overflow-y-auto"
            style={{
              minHeight: 24,
              maxHeight: 120,
              color: "#111827",
              fontFamily: "inherit",
            }}
          />
        </div>

        <button
          onClick={handleSend}
          disabled={!text.trim() || sendMutation.isPending}
          className="flex items-center justify-center rounded-2xl shrink-0 transition-all"
          style={{
            width: 40,
            height: 40,
            background: text.trim() && !sendMutation.isPending ? "#2563eb" : "#e5e7eb",
            color: text.trim() && !sendMutation.isPending ? "#ffffff" : "#9ca3af",
            cursor: text.trim() && !sendMutation.isPending ? "pointer" : "not-allowed",
            boxShadow: text.trim() ? "0 2px 8px rgba(37,99,235,0.3)" : "none",
            transform: "translateY(0)",
            transition: "all 0.15s ease",
          }}
          onMouseEnter={(e) => {
            if (text.trim()) e.currentTarget.style.transform = "scale(1.05)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "scale(1)";
          }}
        >
          <Send className="h-4 w-4" style={{ transform: "translateX(1px)" }} />
        </button>
      </div>
    </div>
  );
}
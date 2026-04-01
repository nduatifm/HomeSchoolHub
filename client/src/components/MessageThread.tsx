import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Send, ArrowLeft, MessageSquare, Pencil, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ThreadMessage {
  id: number;
  senderId: number;
  receiverId: number;
  message: string;
  timestamp: string;
  senderName?: string;
  isRead?: boolean;
}

interface MessageThreadProps {
  teacherId: number;
  studentId: number;
  myUserId: number;
  title?: string;
  customName?: string | null;
  onBack?: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatSmartTimestamp(ts: string): string {
  const date = new Date(ts);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const msgDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const time = date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  if (msgDay.getTime() === today.getTime()) return time;
  if (msgDay.getTime() === yesterday.getTime()) return `Yesterday · ${time}`;
  return `${date.toLocaleDateString([], { month: "short", day: "numeric" })} · ${time}`;
}

function getDayKey(ts: string): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
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

function getInitials(name?: string): string {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

type Group = {
  senderId: number;
  senderName?: string;
  isMe: boolean;
  dayKey: string;
  messages: ThreadMessage[];
};

// ─── Bubble radius helper ─────────────────────────────────────────────────────
// Gives a grouped "stack" feel: full radius on outer corners,
// tighter on the inner (sender-side) corners for mid-group bubbles.

function bubbleRadius(isMe: boolean, isFirst: boolean, isLast: boolean, isSingle: boolean): string {
  const R = 18; // outer corner
  const r = 5;  // inner corner (grouped edge)

  if (isSingle) return `${R}px`;

  if (isMe) {
    // Sent: tail is bottom-right
    const tl = R;
    const tr = isFirst ? R : r;
    const br = isLast  ? R : r;
    const bl = R;
    return `${tl}px ${tr}px ${br}px ${bl}px`;
  } else {
    // Received: tail is bottom-left
    const tl = isFirst ? R : r;
    const tr = R;
    const br = R;
    const bl = isLast  ? R : r;
    return `${tl}px ${tr}px ${br}px ${bl}px`;
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function MessageThread({
  teacherId,
  studentId,
  myUserId,
  title,
  customName,
  onBack,
}: MessageThreadProps) {
  const { toast } = useToast();
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [overrideName, setOverrideName] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    setOverrideName(undefined);
    setIsEditing(false);
  }, [teacherId, studentId]);

  useEffect(() => {
    if (isEditing) renameInputRef.current?.focus();
  }, [isEditing]);

  const displayedTitle = overrideName !== undefined
    ? (overrideName || title || "")
    : (customName || title || "");

  const { data: messages = [], isLoading } = useQuery<ThreadMessage[]>({
    queryKey: ["/api/messages/thread", teacherId, studentId],
    queryFn: () =>
      apiRequest(`/api/messages/thread?teacherId=${teacherId}&studentId=${studentId}`),
    refetchInterval: 10000,
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // Mark unread messages as read when thread is opened
  useEffect(() => {
    const unreadMessages = messages.filter(
      (msg) => msg.senderId !== myUserId && !msg.isRead
    );

    if (unreadMessages.length > 0) {
      unreadMessages.forEach((msg) => {
        apiRequest(`/api/messages/${msg.id}/read`, { method: "PATCH" }).catch(
          (err) => console.error("Failed to mark message as read:", err)
        );
      });
      // Invalidate unread count to remove notification badge
      queryClient.invalidateQueries({ queryKey: ["/api/messages/unread-count"] });
    }
  }, [messages, myUserId]);

  const autoResize = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  };

  const sendMutation = useMutation({
    mutationFn: () =>
      apiRequest("/api/messages/thread", {
        method: "POST",
        body: JSON.stringify({ teacherUserId: teacherId, studentId, message: text }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages/thread", teacherId, studentId] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages/unread-count"] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages/conversations"] });
      setText("");
      if (textareaRef.current) textareaRef.current.style.height = "auto";
    },
    onError: () => {
      toast({ title: "Failed to send message", variant: "destructive" });
    },
  });

  const renameMutation = useMutation({
    mutationFn: (name: string) =>
      apiRequest("/api/messages/thread-label", {
        method: "PATCH",
        body: JSON.stringify({ teacherUserId: teacherId, studentId, name }),
      }),
    onSuccess: (_data, name) => {
      const trimmed = name.trim();
      setOverrideName(trimmed === "" ? null : trimmed);
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ["/api/messages/conversations"] });
    },
    onError: () => {
      toast({ title: "Failed to rename thread", variant: "destructive" });
    },
  });

  const handleRenameSubmit = () => {
    if (renameMutation.isPending) return;
    renameMutation.mutate(draftName);
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") { e.preventDefault(); handleRenameSubmit(); }
    if (e.key === "Escape") { setIsEditing(false); }
  };

  const handleSend = () => {
    if (!text.trim() || sendMutation.isPending) return;
    sendMutation.mutate();
  };

  // Build groups: consecutive messages from same sender on same day
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

  // ── Tokens ──────────────────────────────────────────────────────────────────
  const SENT_BG    = "#2563eb";
  const SENT_TEXT  = "#ffffff";
  const RECV_BG    = "#f1f5f9";   // cool slate, not flat gray
  const RECV_TEXT  = "#0f172a";
  const META_TEXT  = "#94a3b8";
  const BORDER     = "#e2e8f0";
  const PAGE_BG    = "#ffffff";

  return (
    <div
      className="flex flex-col h-full"
      style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-2 px-3 py-2.5 border-b shrink-0"
        style={{ borderColor: BORDER, background: PAGE_BG }}
      >
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors shrink-0"
              style={{ color: META_TEXT }}
              onMouseEnter={(e) => (e.currentTarget.style.background = RECV_BG)}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}

          {isEditing ? (
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <input
                ref={renameInputRef}
                value={draftName}
                onChange={(e) => setDraftName(e.target.value.slice(0, 60))}
                onKeyDown={handleRenameKeyDown}
                placeholder={title || "Thread name…"}
                maxLength={60}
                className="flex-1 min-w-0 text-sm font-semibold rounded-md border px-2 py-0.5 outline-none"
                style={{
                  color: RECV_TEXT,
                  borderColor: SENT_BG,
                  boxShadow: "0 0 0 2px rgba(37,99,235,0.1)",
                  background: PAGE_BG,
                  letterSpacing: "-0.015em",
                }}
              />
              <button
                onClick={handleRenameSubmit}
                disabled={renameMutation.isPending}
                className="flex items-center justify-center w-6 h-6 rounded-md shrink-0 transition-colors"
                style={{ background: SENT_BG, color: "#fff" }}
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="flex items-center justify-center w-6 h-6 rounded-md shrink-0 transition-colors"
                style={{ background: RECV_BG, color: META_TEXT }}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 flex-1 min-w-0 group">
              <span
                className="text-sm font-semibold truncate flex-1 min-w-0"
                style={{ color: RECV_TEXT, letterSpacing: "-0.015em" }}
              >
                {displayedTitle}
              </span>
              <button
                onClick={() => {
                  setDraftName(overrideName !== undefined ? (overrideName || "") : (customName || ""));
                  setIsEditing(true);
                }}
                className="flex items-center justify-center w-6 h-6 rounded-md shrink-0 transition-colors"
                style={{ color: META_TEXT }}
                title="Rename thread"
                onMouseEnter={(e) => (e.currentTarget.style.background = RECV_BG)}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <Pencil className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

      {/* ── Message list ────────────────────────────────────────────────────── */}
      <div
        className="flex-1 overflow-y-auto min-h-0 px-4 py-3"
        style={{ background: PAGE_BG }}
      >
        {/* Loading skeletons */}
        {isLoading && (
          <div className="flex flex-col gap-4 pt-1">
            {([
              { w: 160, isMe: false },
              { w: 220, isMe: true  },
              { w: 130, isMe: false },
            ] as const).map(({ w, isMe }, i) => (
              <div key={i} className={`flex gap-2.5 ${isMe ? "flex-row-reverse" : ""}`}>
                <div
                  className="w-7 h-7 rounded-full shrink-0 animate-pulse"
                  style={{ background: RECV_BG }}
                />
                <div className="flex flex-col gap-1.5" style={{ alignItems: isMe ? "flex-end" : "flex-start" }}>
                  <div
                    className="h-2.5 w-16 rounded animate-pulse"
                    style={{ background: RECV_BG }}
                  />
                  <div
                    className="h-9 rounded-2xl animate-pulse"
                    style={{ width: w, background: isMe ? "#dbeafe" : RECV_BG }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 py-16">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "#eff6ff" }}
            >
              <MessageSquare className="w-4.5 h-4.5" style={{ color: SENT_BG }} />
            </div>
            <p className="text-xs font-medium" style={{ color: META_TEXT }}>
              No messages yet
            </p>
          </div>
        )}

        {/* Message groups */}
        {!isLoading && messages.length > 0 && (() => {
          const els: React.ReactNode[] = [];
          const seenDays = new Set<string>();

          for (let gi = 0; gi < groups.length; gi++) {
            const group = groups[gi];

            // Day divider
            if (!seenDays.has(group.dayKey)) {
              seenDays.add(group.dayKey);
              els.push(
                <div key={`d-${group.dayKey}`} className="flex items-center gap-3 my-4">
                  <div className="flex-1 h-px" style={{ background: BORDER }} />
                  <span
                    className="text-[10px] font-semibold uppercase tracking-wider px-1"
                    style={{ color: META_TEXT }}
                  >
                    {getDayLabel(group.messages[0].timestamp)}
                  </span>
                  <div className="flex-1 h-px" style={{ background: BORDER }} />
                </div>
              );
            }

            const total = group.messages.length;

            els.push(
              <div
                key={`g-${gi}`}
                className={`flex gap-2.5 mb-3 ${group.isMe ? "flex-row-reverse" : ""}`}
              >
                {/* Avatar — visible only, not sized differently */}
                <div className="shrink-0 flex flex-col justify-end" style={{ width: 28 }}>
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold select-none"
                    style={{
                      background: group.isMe ? "#dbeafe" : RECV_BG,
                      color: group.isMe ? SENT_BG : "#475569",
                    }}
                  >
                    {getInitials(group.senderName)}
                  </div>
                </div>

                {/* Content */}
                <div
                  className="flex flex-col min-w-0 flex-1"
                  style={{
                    alignItems: group.isMe ? "flex-end" : "flex-start",
                    gap: 3,
                  }}
                >
                  {/* Name + time — shown once per group */}
                  <div
                    className={`flex items-center gap-1.5 ${group.isMe ? "flex-row-reverse" : ""}`}
                  >
                    <span
                      className="text-xs font-semibold"
                      style={{ color: RECV_TEXT }}
                    >
                      {group.isMe ? "You" : (group.senderName || `User #${group.senderId}`)}
                    </span>
                    <span className="text-[10px]" style={{ color: META_TEXT }}>
                      {formatSmartTimestamp(group.messages[0].timestamp)}
                    </span>
                  </div>

                  {/* Bubbles — stacked with grouped radii */}
                  {group.messages.map((msg, mi) => {
                    const isFirst  = mi === 0;
                    const isLast   = mi === total - 1;
                    const isSingle = total === 1;
                    const radius   = bubbleRadius(group.isMe, isFirst, isLast, isSingle);

                    return (
                      <div
                        key={msg.id}
                        style={{
                          maxWidth: "78%",
                          padding: "7px 13px",
                          borderRadius: radius,
                          background: group.isMe ? SENT_BG : RECV_BG,
                          color: group.isMe ? SENT_TEXT : RECV_TEXT,
                          fontSize: 13.5,
                          lineHeight: 1.5,
                          wordBreak: "break-word",
                        }}
                      >
                        {msg.message}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          }

          return els;
        })()}

        <div ref={bottomRef} />
      </div>

      {/* ── Input bar ───────────────────────────────────────────────────────── */}
      <div
        className="shrink-0 flex items-end gap-2 px-3 py-2.5 border-t"
        style={{ background: PAGE_BG, borderColor: BORDER }}
      >
        <textarea
          ref={textareaRef}
          placeholder="Message…"
          value={text}
          rows={1}
          onChange={(e) => { setText(e.target.value); autoResize(); }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
          }}
          className="flex-1 resize-none outline-none leading-6 overflow-y-auto rounded-xl border transition-colors duration-150"
          style={{
            fontSize: 13.5,
            minHeight: 38,
            maxHeight: 120,
            padding: "7px 12px",
            color: RECV_TEXT,
            fontFamily: "inherit",
            background: RECV_BG,
            borderColor: BORDER,
            display: "block",
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = SENT_BG;
            e.currentTarget.style.boxShadow   = "0 0 0 3px rgba(37,99,235,0.08)";
            e.currentTarget.style.background   = PAGE_BG;
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = BORDER;
            e.currentTarget.style.boxShadow   = "none";
            e.currentTarget.style.background   = RECV_BG;
          }}
        />

        <button
          onClick={handleSend}
          disabled={!text.trim() || sendMutation.isPending}
          className="shrink-0 flex items-center justify-center rounded-xl transition-all duration-150"
          style={{
            width: 38,
            height: 38,
            flexShrink: 0,
            background: text.trim() && !sendMutation.isPending ? SENT_BG : RECV_BG,
            color:      text.trim() && !sendMutation.isPending ? "#fff"  : META_TEXT,
            cursor:     text.trim() && !sendMutation.isPending ? "pointer" : "default",
            boxShadow:  text.trim() && !sendMutation.isPending
              ? "0 1px 6px rgba(37,99,235,0.35)"
              : "none",
          }}
          onMouseEnter={(e) => { if (text.trim()) e.currentTarget.style.opacity = "0.85"; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
        >
          <Send className="w-4 h-4" style={{ transform: "translateX(1px)" }} />
        </button>
      </div>
    </div>
  );
}
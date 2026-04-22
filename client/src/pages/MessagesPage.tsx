import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Send, MessageSquare } from "lucide-react";
import ModernSidebar from "@/components/ModernSidebar";
import MessageThread from "@/components/MessageThread";

type ConversationSummary = {
  studentId: number;
  teacherUserId: number;
  studentName: string;
  teacherName: string;
  parentName: string | null;
  customName: string | null;
  lastMessage: string | null;
  lastMessageTimestamp: string | null;
  unreadCount: number;
};

function formatPreviewTime(ts: string): string {
  const date = new Date(ts);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0] ?? "")
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function convKey(conv: ConversationSummary) {
  return `${conv.teacherUserId}-${conv.studentId}`;
}

export default function MessagesPage() {
  const { user } = useAuth();
  const [selected, setSelected] = useState<ConversationSummary | null>(null);

  const { data: conversations = [], isLoading } = useQuery<ConversationSummary[]>({
    queryKey: ["/api/messages/conversations"],
    refetchInterval: 15000,
    staleTime: 10000,
  });

  useEffect(() => {
    if (conversations.length === 0) return;
    if (!selected) {
      const first = conversations.find((c) => c.teacherUserId !== 0) ?? null;
      setSelected(first);
      return;
    }
    const stillExists = conversations.some(
      (c) => c.studentId === selected.studentId && c.teacherUserId === selected.teacherUserId,
    );
    if (!stillExists) {
      const first = conversations.find((c) => c.teacherUserId !== 0) ?? null;
      setSelected(first);
    }
  }, [conversations]);

  const getDisplayName = (conv: ConversationSummary): string => {
    if (conv.customName) return conv.customName;
    if (user?.role === "teacher") {
      return conv.parentName
        ? `${conv.studentName} & ${conv.parentName}`
        : conv.studentName;
    }
    if (user?.role === "parent") {
      return conv.studentName;
    }
    return conv.teacherName || "Teacher";
  };

  const canMessage = (conv: ConversationSummary): boolean =>
    conv.teacherUserId !== 0;

  const getEmptyLabel = (): string => {
    if (user?.role === "teacher") return "No students assigned yet";
    if (user?.role === "parent") return "No children with a teacher assigned yet";
    return "No teacher assigned yet";
  };

  return (
    <div className="bg-background">
      <ModernSidebar />

      <div
        className="md:ml-[228px] flex flex-col overflow-hidden"
        style={{ height: "100dvh" }}
      >
        {/* Mobile top bar */}
        <div className="h-14 shrink-0 md:hidden border-b border-border/40 flex items-center px-4 gap-2">
          <Send className="w-4 h-4 text-primary" />
          <span className="font-semibold text-sm">Messages</span>
        </div>

        {/* Two-pane area */}
        <div className="flex flex-1 min-h-0 overflow-hidden">

          {/* ── Left: conversation list ── */}
          <div className="w-full md:w-[300px] shrink-0 border-r border-border/40 flex flex-col overflow-hidden max-h-56 md:max-h-none">
            {/* Desktop header */}
            <div className="px-5 py-4 border-b border-border/30 shrink-0 hidden md:flex items-center gap-2">
              <Send className="w-3.5 h-3.5 text-primary" />
              <h1 className="text-sm font-semibold text-foreground">Messages</h1>
            </div>

            <div className="flex-1 overflow-y-auto">
              {isLoading && (
                <div className="flex flex-col">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-3.5">
                      <div className="w-10 h-10 rounded-full bg-muted animate-pulse shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 w-28 bg-muted animate-pulse rounded" />
                        <div className="h-2.5 w-40 bg-muted animate-pulse rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!isLoading && conversations.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full gap-3 py-12 px-4 text-center">
                  <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-muted-foreground/40" />
                  </div>
                  <p className="text-xs text-muted-foreground">{getEmptyLabel()}</p>
                </div>
              )}

              {!isLoading &&
                conversations.map((conv) => {
                  const isActive =
                    selected?.studentId === conv.studentId &&
                    selected?.teacherUserId === conv.teacherUserId;
                  const disabled = !canMessage(conv);
                  const displayName = getDisplayName(conv);

                  return (
                    <button
                      key={convKey(conv)}
                      onClick={() => !disabled && setSelected(conv)}
                      disabled={disabled}
                      className="w-full text-left transition-colors duration-100 disabled:cursor-default"
                      style={
                        isActive
                          ? {
                              background: "hsl(var(--primary) / 0.08)",
                              borderLeft: "3px solid hsl(var(--primary))",
                            }
                          : { paddingLeft: "3px" }
                      }
                      onMouseEnter={(e) => {
                        if (!isActive && !disabled)
                          e.currentTarget.style.background = "hsl(var(--muted))";
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) e.currentTarget.style.background = "";
                      }}
                    >
                      <div className="flex items-center gap-3 px-4 py-3.5">
                        {/* Avatar */}
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-xs font-bold select-none"
                          style={{
                            background: disabled
                              ? "hsl(var(--muted))"
                              : isActive
                              ? "hsl(var(--primary) / 0.15)"
                              : "hsl(var(--muted))",
                            color: disabled
                              ? "hsl(var(--muted-foreground) / 0.4)"
                              : isActive
                              ? "hsl(var(--primary))"
                              : "hsl(var(--muted-foreground))",
                          }}
                        >
                          {getInitials(displayName)}
                        </div>

                        {/* Text */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-0.5">
                            <span
                              className={`text-sm truncate ${
                                disabled
                                  ? "text-muted-foreground/50"
                                  : isActive || conv.unreadCount > 0
                                  ? "font-semibold text-foreground"
                                  : "font-medium text-foreground/90"
                              }`}
                            >
                              {displayName}
                            </span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {conv.lastMessageTimestamp && !disabled && (
                                <span className="text-[11px] text-muted-foreground">
                                  {formatPreviewTime(conv.lastMessageTimestamp)}
                                </span>
                              )}
                              {conv.unreadCount > 0 && (
                                <span
                                  className="text-[10px] font-bold rounded-full flex items-center justify-center"
                                  style={{
                                    background: "hsl(var(--primary))",
                                    color: "#fff",
                                    minWidth: 18,
                                    height: 18,
                                    padding: "0 5px",
                                  }}
                                >
                                  {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
                                </span>
                              )}
                            </div>
                          </div>

                          {user?.role === "parent" && (
                            <p className="text-[11px] text-muted-foreground/60 truncate mb-0.5">
                              {disabled ? "No teacher assigned" : `w/ ${conv.teacherName}`}
                            </p>
                          )}

                          <p
                            className={`text-xs truncate ${
                              disabled
                                ? "text-muted-foreground/40 italic"
                                : "text-muted-foreground"
                            }`}
                          >
                            {disabled
                              ? "No teacher assigned yet"
                              : conv.lastMessage
                              ? conv.lastMessage.length > 52
                                ? conv.lastMessage.slice(0, 52) + "…"
                                : conv.lastMessage
                              : "No messages yet"}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
            </div>
          </div>

          {/* ── Right: message thread ── */}
          <div className="flex-1 min-w-0 flex flex-col min-h-[320px] md:min-h-0">
            {selected && canMessage(selected) ? (
              <MessageThread
                teacherId={selected.teacherUserId}
                studentId={selected.studentId}
                myUserId={user!.id}
                title={getDisplayName(selected)}
                customName={selected.customName}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground select-none">
                <div className="w-12 h-12 rounded-2xl bg-muted/40 flex items-center justify-center">
                  <Send className="w-5 h-5 opacity-25" />
                </div>
                {conversations.length > 0 && (
                  <p className="text-sm text-muted-foreground/70">
                    Select a conversation to start messaging
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

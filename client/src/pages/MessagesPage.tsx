import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearch } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Send, MessageSquare, PenSquare, Search, X } from "lucide-react";
import ModernSidebar from "@/components/ModernSidebar";
import MessageThread from "@/components/MessageThread";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type ConversationSummary = {
  type?: "student" | "direct";
  studentId: number;
  teacherUserId: number;
  studentName: string;
  teacherName: string;
  parentName: string | null;
  customName: string | null;
  lastMessage: string | null;
  lastMessageTimestamp: string | null;
  unreadCount: number;
  isReadOnly: boolean;
  otherUserId?: number;
  otherUserName?: string;
};

type DirectContact = { id: number; name: string };

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
  if (conv.type === "direct") return `direct-${conv.otherUserId}`;
  return `${conv.teacherUserId}-${conv.studentId}`;
}

export default function MessagesPage() {
  const { user } = useAuth();
  const [selected, setSelected] = useState<ConversationSummary | null>(null);
  const [newDirectOpen, setNewDirectOpen] = useState(false);
  const [contactSearch, setContactSearch] = useState("");
  // Mobile: "list" shows the conversation list; "thread" shows the open thread
  const [mobileView, setMobileView] = useState<"list" | "thread">("list");

  const { data: conversations = [], isLoading } = useQuery<ConversationSummary[]>({
    queryKey: ["/api/messages/conversations"],
    refetchInterval: 15000,
    staleTime: 10000,
  });

  const visibleConvs = conversations.filter(
    (c) => c.type === "direct" || c.teacherUserId !== 0,
  );

  // URL-based auto-selection — computed synchronously so it works
  // whether conversations come from cache or a fresh fetch.
  const search = useSearch();
  const autoParams = new URLSearchParams(search);
  const autoTeacherId = parseInt(autoParams.get("teacherId") ?? "0", 10);
  const autoStudentId = parseInt(autoParams.get("studentId") ?? "0", 10);

  const urlConv = autoTeacherId
    ? visibleConvs.find(
        (c) => c.teacherUserId === autoTeacherId && c.studentId === autoStudentId,
      ) ?? null
    : null;

  // Open the thread panel on mobile when arriving via a URL-based link.
  const urlConvKey = urlConv ? convKey(urlConv) : null;
  useEffect(() => {
    if (urlConvKey) setMobileView("thread");
  }, [urlConvKey]);

  const selectedKey = selected ? convKey(selected) : null;
  const selectedStillExists = selectedKey
    ? visibleConvs.some((c) => convKey(c) === selectedKey)
    : false;

  // Priority: explicit user selection → URL-matched conv → first conv in list
  const effectiveSelected: ConversationSummary | null =
    selected && (selectedStillExists || selected.type === "direct")
      ? selected
      : urlConv ?? visibleConvs[0] ?? null;

  const canUseDirect = user?.role === "teacher" || user?.role === "parent";
  const { data: directContacts = [], isLoading: contactsLoading } = useQuery<DirectContact[]>({
    queryKey: ["/api/messages/direct-contacts"],
    enabled: newDirectOpen && canUseDirect,
    staleTime: 60000,
  });

  const filteredContacts = directContacts.filter((c) =>
    c.name.toLowerCase().includes(contactSearch.toLowerCase()),
  );

  const selectConv = (conv: ConversationSummary) => {
    setSelected(conv);
    setMobileView("thread");
  };

  const startDirect = (contact: DirectContact) => {
    setNewDirectOpen(false);
    setContactSearch("");
    selectConv({
      type: "direct",
      studentId: 0,
      teacherUserId: 0,
      studentName: "",
      teacherName: "",
      parentName: null,
      customName: null,
      lastMessage: null,
      lastMessageTimestamp: null,
      unreadCount: 0,
      isReadOnly: false,
      otherUserId: contact.id,
      otherUserName: contact.name,
    });
  };

  const getDisplayName = (conv: ConversationSummary): string => {
    if (conv.type === "direct") return conv.otherUserName ?? "Direct Message";
    if (conv.customName) return conv.customName;
    if (user?.role === "teacher") return conv.studentName || "Student";
    if (user?.role === "parent") return conv.studentName || "Student";
    return conv.teacherName || "Teacher";
  };

  const getSubtitle = (conv: ConversationSummary): string | null => {
    if (conv.type === "direct") {
      return user?.role === "teacher" ? "Parent" : "Teacher";
    }
    if (user?.role === "teacher") {
      return conv.parentName ? `w/ ${conv.parentName}` : null;
    }
    if (user?.role === "parent") {
      return conv.teacherName ? `w/ ${conv.teacherName}` : null;
    }
    return null;
  };

  const getEmptyLabel = (): string => {
    if (user?.role === "teacher") return "No students assigned yet";
    if (user?.role === "parent") return "No children with a teacher assigned yet";
    return "No teacher assigned yet";
  };

  const SENT_BG = "#2563eb";

  // Students cannot rename threads
  const canRename = user?.role !== "student";

  return (
    <div className="bg-background">
      <ModernSidebar />

      <div
        className="md:ml-[228px] flex flex-col overflow-hidden"
        style={{ height: "100dvh" }}
      >
        {/* Mobile top bar — only shown on list view */}
        <div className={`h-14 shrink-0 md:hidden border-b border-border/40 flex items-center px-4 gap-2 ${mobileView === "thread" ? "hidden" : ""}`}>
          <Send className="w-4 h-4 text-primary" />
          <span className="font-semibold text-sm flex-1">Messages</span>
          {canUseDirect && (
            <button
              onClick={() => setNewDirectOpen(true)}
              className="flex items-center gap-1.5 text-xs font-medium text-primary"
            >
              <PenSquare className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Two-pane area */}
        <div className="flex flex-1 min-h-0 overflow-hidden">

          {/* ── Left: conversation list ── */}
          <div
            className={`
              border-r border-border/40 flex flex-col overflow-hidden
              ${mobileView === "thread" ? "hidden md:flex" : "flex"}
              w-full md:w-[300px] shrink-0
            `}
          >
            {/* Desktop header */}
            <div className="px-4 py-3 border-b border-border/30 shrink-0 hidden md:flex items-center gap-2">
              <Send className="w-3.5 h-3.5 text-primary" />
              <h1 className="text-sm font-semibold text-foreground flex-1">Messages</h1>
              {canUseDirect && (
                <button
                  onClick={() => setNewDirectOpen(true)}
                  title="New direct message"
                  className="flex items-center justify-center w-7 h-7 rounded-lg transition-colors"
                  style={{ color: "#64748b" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#f1f5f9")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <PenSquare className="w-4 h-4" />
                </button>
              )}
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

              {!isLoading && visibleConvs.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full gap-3 py-12 px-4 text-center">
                  <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-muted-foreground/40" />
                  </div>
                  <p className="text-xs text-muted-foreground">{getEmptyLabel()}</p>
                  {canUseDirect && (
                    <button
                      onClick={() => setNewDirectOpen(true)}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      Start a direct message
                    </button>
                  )}
                </div>
              )}

              {!isLoading &&
                visibleConvs.map((conv) => {
                  const isActive = effectiveSelected ? convKey(conv) === convKey(effectiveSelected) : false;
                  const displayName = getDisplayName(conv);
                  const subtitle = getSubtitle(conv);
                  const isDirect = conv.type === "direct";

                  return (
                    <button
                      key={convKey(conv)}
                      onClick={() => selectConv(conv)}
                      className="w-full text-left transition-colors duration-100"
                      style={
                        isActive
                          ? {
                              background: "hsl(var(--primary) / 0.08)",
                              borderLeft: "3px solid hsl(var(--primary))",
                            }
                          : { paddingLeft: "3px" }
                      }
                      onMouseEnter={(e) => {
                        if (!isActive)
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
                            background: isActive
                              ? "hsl(var(--primary) / 0.15)"
                              : isDirect
                              ? "#eff6ff"
                              : "hsl(var(--muted))",
                            color: isActive || isDirect
                              ? "hsl(var(--primary))"
                              : "hsl(var(--muted-foreground))",
                          }}
                        >
                          {getInitials(displayName)}
                        </div>

                        {/* Text */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-0.5">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span
                                className={`text-sm truncate ${
                                  isActive || conv.unreadCount > 0
                                    ? "font-semibold text-foreground"
                                    : "font-medium text-foreground/90"
                                }`}
                              >
                                {displayName}
                              </span>
                              {isDirect && (
                                <span
                                  className="shrink-0 text-[9px] font-semibold px-1 py-px rounded-full"
                                  style={{ background: "#eff6ff", color: SENT_BG }}
                                >
                                  Direct
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {conv.lastMessageTimestamp && (
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

                          {subtitle && (
                            <p className="text-[11px] text-muted-foreground/60 truncate mb-0.5">
                              {subtitle}
                            </p>
                          )}

                          <p className="text-xs text-muted-foreground truncate">
                            {conv.lastMessage
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
          <div
            className={`
              flex-1 min-w-0 flex flex-col min-h-[320px] md:min-h-0
              ${mobileView === "list" ? "hidden md:flex" : "flex"}
            `}
          >
            {effectiveSelected ? (
              effectiveSelected.type === "direct" ? (
                <MessageThread
                  directMode={{ otherUserId: effectiveSelected.otherUserId! }}
                  myUserId={user!.id}
                  title={effectiveSelected.otherUserName!}
                  readOnly={false}
                  canRename={false}
                  onBack={mobileView === "thread" ? () => setMobileView("list") : undefined}
                />
              ) : (
                <MessageThread
                  teacherId={effectiveSelected.teacherUserId}
                  studentId={effectiveSelected.studentId}
                  myUserId={user!.id}
                  title={getDisplayName(effectiveSelected)}
                  customName={effectiveSelected.customName}
                  readOnly={effectiveSelected.isReadOnly}
                  canRename={canRename}
                  onBack={mobileView === "thread" ? () => setMobileView("list") : undefined}
                />
              )
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground select-none">
                <div className="w-12 h-12 rounded-2xl bg-muted/40 flex items-center justify-center">
                  <Send className="w-5 h-5 opacity-25" />
                </div>
                {visibleConvs.length > 0 && (
                  <p className="text-sm text-muted-foreground/70">
                    Select a conversation to start messaging
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── New Direct Message Dialog ── */}
      <Dialog open={newDirectOpen} onOpenChange={(o) => { setNewDirectOpen(o); if (!o) setContactSearch(""); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">New Direct Message</DialogTitle>
          </DialogHeader>

          {/* Search */}
          <div
            className="flex items-center gap-2 rounded-lg border px-3 py-2"
            style={{ borderColor: "#e2e8f0" }}
          >
            <Search className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
            <input
              value={contactSearch}
              onChange={(e) => setContactSearch(e.target.value)}
              placeholder={user?.role === "teacher" ? "Search parents…" : "Search teachers…"}
              className="flex-1 text-sm outline-none bg-transparent"
              autoFocus
            />
            {contactSearch && (
              <button onClick={() => setContactSearch("")}>
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            )}
          </div>

          {/* Contact list */}
          <div className="flex flex-col gap-0.5 max-h-64 overflow-y-auto -mx-1">
            {contactsLoading && (
              <div className="flex flex-col gap-2 px-1 py-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3 py-1.5 px-2">
                    <div className="w-8 h-8 rounded-full bg-muted animate-pulse shrink-0" />
                    <div className="h-3 w-32 bg-muted animate-pulse rounded" />
                  </div>
                ))}
              </div>
            )}

            {!contactsLoading && filteredContacts.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6 px-4">
                {directContacts.length === 0
                  ? user?.role === "teacher"
                    ? "No parents connected to your students yet."
                    : "No teachers assigned to your children yet."
                  : "No contacts match your search."}
              </p>
            )}

            {!contactsLoading &&
              filteredContacts.map((contact) => (
                <button
                  key={contact.id}
                  onClick={() => startDirect(contact)}
                  className="flex items-center gap-3 px-2 py-2 rounded-lg text-left transition-colors hover:bg-muted/60 mx-1"
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                    style={{ background: "#eff6ff", color: SENT_BG }}
                  >
                    {getInitials(contact.name)}
                  </div>
                  <span className="text-sm font-medium text-foreground">{contact.name}</span>
                </button>
              ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

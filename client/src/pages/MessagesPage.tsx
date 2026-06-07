import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Search, PenSquare, X } from "lucide-react";
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

// Dark theme palette
const D = {
  bg:      "#0f0f0f",
  panel:   "#111111",
  border:  "#2a2a2a",
  hover:   "#1c1c1c",
  active:  "#222222",
  text:    "#ffffff",
  muted:   "#888888",
  search:  "#1a1a1a",
  accent:  "#2563eb",
};

function formatDate(ts: string): string {
  const date = new Date(ts);
  const now  = new Date();
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return `${date.getMonth() + 1}/${date.getDate()}`;
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

// Stable avatar colour from name string
const AVATAR_COLORS = [
  ["#1e3a5f", "#4a9eff"],
  ["#1e3d2f", "#4acf8f"],
  ["#3d1e3a", "#cf4acf"],
  ["#3d2e1e", "#cf8f4a"],
  ["#1e2d3d", "#4a6fcf"],
  ["#3d1e1e", "#cf4a4a"],
];
function avatarColors(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

type ConvFilter = "all" | "direct" | "unread";

export default function MessagesPage() {
  const { user } = useAuth();
  const [selected,      setSelected]      = useState<ConversationSummary | null>(null);
  const [newDirectOpen, setNewDirectOpen] = useState(false);
  const [contactSearch, setContactSearch] = useState("");
  const [convSearch,    setConvSearch]    = useState("");
  const [convFilter,    setConvFilter]    = useState<ConvFilter>("all");
  const [mobileView,    setMobileView]    = useState<"list" | "thread">("list");

  const { data: conversations = [], isLoading } = useQuery<ConversationSummary[]>({
    queryKey: ["/api/messages/conversations"],
    refetchInterval: 15000,
    staleTime: 10000,
  });

  const visibleConvs = conversations.filter(
    (c) => c.type === "direct" || c.teacherUserId !== 0,
  );

  // Session-based auto-selection (sessionStorage set by "Message" button on children page)
  const [pendingStudentId] = useState<number>(() => {
    const stored = sessionStorage.getItem("mp_openStudentId");
    return parseInt(stored ?? "0", 10) || 0;
  });
  useEffect(() => {
    sessionStorage.removeItem("mp_openStudentId");
  }, []);

  const urlConv = pendingStudentId
    ? visibleConvs.find((c) => c.studentId === pendingStudentId) ?? null
    : null;

  const urlConvKey = urlConv ? convKey(urlConv) : null;
  useEffect(() => {
    if (urlConvKey) setMobileView("thread");
  }, [urlConvKey]);

  const selectedKey = selected ? convKey(selected) : null;
  const selectedStillExists = selectedKey
    ? visibleConvs.some((c) => convKey(c) === selectedKey)
    : false;

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

  // Apply search + tab filter to conversation list
  const displayedConvs = visibleConvs.filter((c) => {
    if (convFilter === "direct" && c.type !== "direct") return false;
    if (convFilter === "unread" && c.unreadCount === 0) return false;
    if (convSearch) {
      const name = c.type === "direct"
        ? (c.otherUserName ?? "")
        : (c.customName ?? c.studentName ?? c.teacherName ?? "");
      if (!name.toLowerCase().includes(convSearch.toLowerCase())) return false;
    }
    return true;
  });

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
    if (conv.type === "direct") return user?.role === "teacher" ? "Parent" : "Teacher";
    if (user?.role === "teacher") return conv.parentName ? `w/ ${conv.parentName}` : null;
    if (user?.role === "parent") return conv.teacherName ? `Teacher: ${conv.teacherName}` : null;
    return null;
  };

  const canRename = user?.role !== "student";

  const TABS: { id: ConvFilter; label: string }[] = [
    { id: "all",    label: "All"    },
    { id: "direct", label: "Direct" },
    { id: "unread", label: "Unread" },
  ];

  return (
    <div style={{ background: D.bg }}>
      <ModernSidebar />

      <div
        className="md:ml-[228px] flex flex-col overflow-hidden"
        style={{ height: "100dvh", background: D.bg }}
      >
        {/* Mobile top bar */}
        <div
          className={`h-14 shrink-0 md:hidden flex items-center px-4 gap-2 ${mobileView === "thread" ? "hidden" : ""}`}
          style={{ borderBottom: `1px solid ${D.border}`, background: D.panel }}
        >
          <span className="font-semibold text-sm flex-1" style={{ color: D.text }}>Messages</span>
          {canUseDirect && (
            <button onClick={() => setNewDirectOpen(true)} style={{ color: D.muted }}>
              <PenSquare className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Two-pane area */}
        <div className="flex flex-1 min-h-0 overflow-hidden">

          {/* ── Left: conversation list ── */}
          <div
            className={`flex flex-col overflow-hidden ${mobileView === "thread" ? "hidden md:flex" : "flex"} w-full md:w-[300px] shrink-0`}
            style={{ borderRight: `1px solid ${D.border}`, background: D.panel }}
          >
            {/* Search + compose */}
            <div className="flex items-center gap-2 p-3 shrink-0">
              <div
                className="flex items-center gap-2 flex-1 rounded-lg px-3 py-2"
                style={{ background: D.search, border: `1px solid #333` }}
              >
                <Search className="w-3.5 h-3.5 shrink-0" style={{ color: D.muted }} />
                <input
                  value={convSearch}
                  onChange={(e) => setConvSearch(e.target.value)}
                  placeholder="Search chats"
                  className="flex-1 text-sm bg-transparent outline-none"
                  style={{ color: D.text }}
                />
                {convSearch && (
                  <button onClick={() => setConvSearch("")}>
                    <X className="w-3 h-3" style={{ color: D.muted }} />
                  </button>
                )}
              </div>
              {canUseDirect && (
                <button
                  onClick={() => setNewDirectOpen(true)}
                  className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors shrink-0"
                  style={{ color: D.muted }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = D.hover)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  title="New direct message"
                >
                  <PenSquare className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Filter tabs */}
            <div
              className="flex items-center gap-1 px-3 pb-2 shrink-0"
              style={{ borderBottom: `1px solid ${D.border}` }}
            >
              {TABS.map((tab) => {
                const active = convFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setConvFilter(tab.id)}
                    className="text-xs font-medium px-3 py-1 rounded-full transition-colors"
                    style={
                      active
                        ? { background: "#fff", color: "#000" }
                        : { color: D.muted }
                    }
                    onMouseEnter={(e) => {
                      if (!active) e.currentTarget.style.background = D.hover;
                    }}
                    onMouseLeave={(e) => {
                      if (!active) e.currentTarget.style.background = "transparent";
                    }}
                  >
                    {tab.label}
                    {tab.id === "unread" && visibleConvs.filter((c) => c.unreadCount > 0).length > 0 && (
                      <span
                        className="ml-1 text-[10px] font-bold rounded-full px-1"
                        style={{ background: active ? "#333" : "#333", color: "#fff" }}
                      >
                        {visibleConvs.filter((c) => c.unreadCount > 0).length}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Conversation list */}
            <div className="flex-1 overflow-y-auto">
              {isLoading && (
                <div className="flex flex-col">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-3.5">
                      <div className="w-11 h-11 rounded-full shrink-0 animate-pulse" style={{ background: "#222" }} />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 w-28 rounded animate-pulse" style={{ background: "#222" }} />
                        <div className="h-2.5 w-40 rounded animate-pulse" style={{ background: "#1a1a1a" }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!isLoading && displayedConvs.length === 0 && (
                <div className="flex flex-col items-center justify-center gap-2 py-16 px-4 text-center">
                  <p className="text-sm" style={{ color: D.muted }}>
                    {convSearch
                      ? "No chats match your search"
                      : convFilter === "unread"
                      ? "No unread messages"
                      : convFilter === "direct"
                      ? "No direct messages yet"
                      : user?.role === "parent"
                      ? "No children with a teacher assigned yet"
                      : user?.role === "teacher"
                      ? "No students assigned yet"
                      : "No teacher assigned yet"}
                  </p>
                  {canUseDirect && convFilter !== "unread" && !convSearch && (
                    <button
                      onClick={() => setNewDirectOpen(true)}
                      className="text-xs font-medium hover:underline mt-1"
                      style={{ color: D.accent }}
                    >
                      Start a direct message
                    </button>
                  )}
                </div>
              )}

              {!isLoading && displayedConvs.map((conv) => {
                const isActive = effectiveSelected ? convKey(conv) === convKey(effectiveSelected) : false;
                const displayName = getDisplayName(conv);
                const subtitle = getSubtitle(conv);
                const [avatarBg, avatarFg] = avatarColors(displayName);

                return (
                  <button
                    key={convKey(conv)}
                    onClick={() => selectConv(conv)}
                    className="w-full text-left transition-colors duration-100"
                    style={{ background: isActive ? D.active : "transparent" }}
                    onMouseEnter={(e) => {
                      if (!isActive) e.currentTarget.style.background = D.hover;
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) e.currentTarget.style.background = "transparent";
                    }}
                  >
                    <div className="flex items-center gap-3 px-4 py-3">
                      {/* Avatar */}
                      <div
                        className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 text-xs font-bold select-none"
                        style={{ background: avatarBg, color: avatarFg }}
                      >
                        {getInitials(displayName)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <span
                            className="text-sm truncate"
                            style={{
                              color: D.text,
                              fontWeight: conv.unreadCount > 0 ? 700 : 600,
                            }}
                          >
                            {displayName}
                          </span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {conv.unreadCount > 0 && (
                              <span
                                className="text-[10px] font-bold rounded-full flex items-center justify-center"
                                style={{
                                  background: D.accent,
                                  color: "#fff",
                                  minWidth: 17,
                                  height: 17,
                                  padding: "0 4px",
                                }}
                              >
                                {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
                              </span>
                            )}
                            {conv.lastMessageTimestamp && (
                              <span className="text-[11px]" style={{ color: D.muted }}>
                                {formatDate(conv.lastMessageTimestamp)}
                              </span>
                            )}
                          </div>
                        </div>

                        {subtitle && (
                          <p className="text-[11px] truncate mb-0.5" style={{ color: "#666" }}>
                            {subtitle}
                          </p>
                        )}

                        <p className="text-xs truncate" style={{ color: D.muted }}>
                          {conv.lastMessage
                            ? conv.lastMessage.length > 50
                              ? conv.lastMessage.slice(0, 50) + "…"
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
            className={`flex-1 min-w-0 flex flex-col min-h-[320px] md:min-h-0 ${mobileView === "list" ? "hidden md:flex" : "flex"}`}
            style={{ background: D.bg }}
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
              <div
                className="flex flex-col h-full"
                style={{ borderBottom: `1px solid ${D.border}` }}
              >
                {/* "To:" compose header */}
                <div
                  className="flex items-center gap-2 px-5 py-4 shrink-0"
                  style={{ borderBottom: `1px solid ${D.border}` }}
                >
                  <span className="text-sm font-semibold" style={{ color: D.muted }}>To:</span>
                  {canUseDirect ? (
                    <button
                      onClick={() => setNewDirectOpen(true)}
                      className="text-sm flex-1 text-left hover:underline"
                      style={{ color: D.muted }}
                    >
                      Search people…
                    </button>
                  ) : (
                    <span className="text-sm" style={{ color: "#444" }}>
                      {visibleConvs.length > 0 ? "Select a conversation" : "No conversations yet"}
                    </span>
                  )}
                </div>
                <div className="flex-1" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── New Direct Message Dialog ── */}
      <Dialog
        open={newDirectOpen}
        onOpenChange={(o) => { setNewDirectOpen(o); if (!o) setContactSearch(""); }}
      >
        <DialogContent className="sm:max-w-sm" style={{ background: "#1a1a1a", borderColor: D.border }}>
          <DialogHeader>
            <DialogTitle className="text-base" style={{ color: D.text }}>New Direct Message</DialogTitle>
          </DialogHeader>

          <div
            className="flex items-center gap-2 rounded-lg border px-3 py-2"
            style={{ borderColor: "#333", background: D.search }}
          >
            <Search className="w-3.5 h-3.5 shrink-0" style={{ color: D.muted }} />
            <input
              value={contactSearch}
              onChange={(e) => setContactSearch(e.target.value)}
              placeholder={user?.role === "teacher" ? "Search parents…" : "Search teachers…"}
              className="flex-1 text-sm outline-none bg-transparent"
              style={{ color: D.text }}
              autoFocus
            />
            {contactSearch && (
              <button onClick={() => setContactSearch("")}>
                <X className="w-3.5 h-3.5" style={{ color: D.muted }} />
              </button>
            )}
          </div>

          <div className="flex flex-col gap-0.5 max-h-64 overflow-y-auto -mx-1">
            {contactsLoading && (
              <div className="flex flex-col gap-2 px-1 py-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3 py-1.5 px-2">
                    <div className="w-8 h-8 rounded-full animate-pulse shrink-0" style={{ background: "#333" }} />
                    <div className="h-3 w-32 rounded animate-pulse" style={{ background: "#333" }} />
                  </div>
                ))}
              </div>
            )}

            {!contactsLoading && filteredContacts.length === 0 && (
              <p className="text-sm text-center py-6 px-4" style={{ color: D.muted }}>
                {directContacts.length === 0
                  ? user?.role === "teacher"
                    ? "No parents connected to your students yet."
                    : "No teachers assigned to your children yet."
                  : "No contacts match your search."}
              </p>
            )}

            {!contactsLoading && filteredContacts.map((contact) => {
              const [avatarBg, avatarFg] = avatarColors(contact.name);
              return (
                <button
                  key={contact.id}
                  onClick={() => startDirect(contact)}
                  className="flex items-center gap-3 px-2 py-2 rounded-lg text-left transition-colors mx-1"
                  onMouseEnter={(e) => (e.currentTarget.style.background = D.hover)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                    style={{ background: avatarBg, color: avatarFg }}
                  >
                    {getInitials(contact.name)}
                  </div>
                  <span className="text-sm font-medium" style={{ color: D.text }}>{contact.name}</span>
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

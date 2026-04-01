import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useLocation } from "wouter";
import {
  Settings,
  User,
  UserPlus,
  LogOut,
  Menu,
  X,
  FileText,
  Users,
  GraduationCap,
  MessageSquare,
  Send,
  ShieldCheck,
  ArrowLeftRight,
  Loader2,
  School,
  Trash2,
  Bell,
  CheckCheck,
  Star,
  BookOpen,
  ClipboardCheck,
  LayoutList,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Logo } from "@/components/Logo";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface SidebarItem {
  icon: React.ReactNode;
  label: string;
  hash: string;
  badge?: number;
}

interface Notification {
  id: number;
  userId: number;
  type: string;
  title: string;
  body: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

export default function ModernSidebar() {
  const { user, setUser, logout } = useAuth();
  const queryClient = useQueryClient();
  const [location, setLocation] = useLocation();
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ["/api/messages/unread-count"],
    refetchInterval: 15000,
  });
  const unreadCount = unreadData?.count ?? 0;

  const { data: notifCount } = useQuery<{ count: number }>({
    queryKey: ["/api/notifications/count"],
    refetchInterval: 30000,
  });
  const unreadNotifCount = notifCount?.count ?? 0;

  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
    enabled: notifOpen,
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: number) =>
      await apiRequest(`/api/notifications/${id}/read`, { method: "PATCH" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/count"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  const handleNotificationClick = useCallback((n: Notification) => {
    if (!n.isRead) markReadMutation.mutate(n.id);
    if (n.link) {
      setNotifOpen(false);
      const [path, hash] = n.link.split("#");
      if (location !== path) {
        setLocation(path);
        if (hash) setTimeout(() => { window.location.hash = hash; }, 50);
      } else {
        if (hash) window.location.hash = hash;
      }
    }
  }, [markReadMutation, location, setLocation]);

  const markAllReadMutation = useMutation({
    mutationFn: async () =>
      await apiRequest("/api/notifications/read-all", { method: "PATCH" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/count"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  // Close notif panel on outside click
  useEffect(() => {
    if (!notifOpen) return;
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [notifOpen]);

  const switchRoleMutation = useMutation({
    mutationFn: async (role: string) =>
      await apiRequest("/api/user/switch-active-role", { method: "POST", body: JSON.stringify({ role }) }),
    onSuccess: (data) => {
      setUser(data.user);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages/unread-count"] });
      toast({ title: "Context switched", description: `Now viewing as ${data.user.role}.`, type: "success" });
      setTimeout(() => { window.location.href = "/dashboard"; }, 300);
    },
    onError: (error: any) =>
      toast({ title: "Failed to switch", description: error.message || "Something went wrong", type: "error" }),
  });

  const otherRoles = (user?.roles ?? []).filter((r) => r !== user?.role);

  const [currentHash, setCurrentHash] = useState(
    window.location.hash
      ? window.location.hash.replace("#", "")
      : user?.role === "parent"
        ? "children"
        : "classrooms",
  );
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleHashChange = () => {
      setCurrentHash(
        window.location.hash
          ? window.location.hash.replace("#", "")
          : user?.role === "parent"
            ? "children"
            : "classrooms",
      );
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [currentHash, location]);

  const handleNavigation = (hash: string) => {
    if (location !== "/dashboard") {
      setLocation("/dashboard");
      setTimeout(() => { window.location.hash = hash; }, 0);
    } else {
      window.location.hash = hash;
    }
    setMobileOpen(false);
  };

  const teacherItems: SidebarItem[] = [
    { icon: <School className="w-4 h-4" />, label: "Classrooms", hash: "classrooms" },
    { icon: <User className="w-4 h-4" />, label: "Students", hash: "students" },
    { icon: <UserPlus className="w-4 h-4" />, label: "Tutor Requests", hash: "requests" },
    { icon: <MessageSquare className="w-4 h-4" />, label: "Feedback", hash: "feedback" },
    { icon: <Send className="w-4 h-4" />, label: "Messages", hash: "messages", badge: unreadCount },
  ];

  const parentItems: SidebarItem[] = [
    { icon: <Users className="w-4 h-4" />, label: "My Children", hash: "children" },
    { icon: <School className="w-4 h-4" />, label: "Classrooms", hash: "classrooms" },
    { icon: <GraduationCap className="w-4 h-4" />, label: "Find a Tutor", hash: "tutors" },
    { icon: <UserPlus className="w-4 h-4" />, label: "Invite Student", hash: "invites" },
    { icon: <FileText className="w-4 h-4" />, label: "Progress Reports", hash: "reports" },
    { icon: <Send className="w-4 h-4" />, label: "Messages", hash: "messages", badge: unreadCount },
  ];

  const studentItems: SidebarItem[] = [
    { icon: <School className="w-4 h-4" />, label: "Classrooms", hash: "classrooms" },
    { icon: <MessageSquare className="w-4 h-4" />, label: "Feedback", hash: "feedback" },
    { icon: <Send className="w-4 h-4" />, label: "Messages", hash: "messages", badge: unreadCount },
  ];

  const getItems = () => {
    if (user?.role === "teacher") return teacherItems;
    if (user?.role === "parent") return parentItems;
    return studentItems;
  };

  const items = getItems();

  const isActive = (hash: string) =>
    currentHash === hash && location === "/dashboard";

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  function isToday(dateStr: string) {
    const d = new Date(dateStr);
    const now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  }

  function notifIcon(type: string) {
    switch (type) {
      case "new_assignment": return <FileText className="w-3.5 h-3.5 text-blue-500" />;
      case "assignment_graded": return <Star className="w-3.5 h-3.5 text-amber-500" />;
      case "assignment_submitted": return <ClipboardCheck className="w-3.5 h-3.5 text-green-600" />;
      case "tutor_request_update": return <UserPlus className="w-3.5 h-3.5 text-violet-500" />;
      case "new_tutor_request": return <UserPlus className="w-3.5 h-3.5 text-violet-500" />;
      case "progress_report": return <BookOpen className="w-3.5 h-3.5 text-teal-500" />;
      case "new_post": return <MessageSquare className="w-3.5 h-3.5 text-indigo-500" />;
      default: return <LayoutList className="w-3.5 h-3.5 text-gray-400" />;
    }
  }

  // ── Nav item ──────────────────────────────────────────────────────────────
  const NavItem = ({ item }: { item: SidebarItem }) => {
    const active = isActive(item.hash);
    return (
      <button
        onClick={() => handleNavigation(item.hash)}
        data-testid={`sidebar-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
        className={`
          w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm
          transition-colors duration-100
          ${active
            ? "bg-green-50 text-green-800 font-medium"
            : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
          }
        `}
      >
        <span className={active ? "text-green-700" : "text-gray-400"}>
          {item.icon}
        </span>
        <span className="flex-1 text-left">{item.label}</span>
        {item.badge && item.badge > 0 ? (
          <span className="min-w-[18px] h-[18px] px-1.5 rounded-full bg-green-700 text-white text-[10px] font-semibold flex items-center justify-center leading-none">
            {item.badge > 99 ? "99+" : item.badge}
          </span>
        ) : null}
      </button>
    );
  };

  // ── Notification Bell ─────────────────────────────────────────────────────
  const NotificationBell = () => (
    <div className="relative" ref={notifRef}>
      <button
        onClick={() => setNotifOpen((v) => !v)}
        className="relative w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors duration-100"
        aria-label="Notifications"
        data-testid="sidebar-notifications"
      >
        <Bell className="w-4 h-4 text-gray-400 shrink-0" />
        <span className="flex-1 text-left">Notifications</span>
        {unreadNotifCount > 0 && (
          <span className="min-w-[18px] h-[18px] px-1.5 rounded-full bg-green-700 text-white text-[10px] font-semibold flex items-center justify-center leading-none">
            {unreadNotifCount > 99 ? "99+" : unreadNotifCount}
          </span>
        )}
      </button>

      {notifOpen && (
        <div className="absolute left-full top-0 ml-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 z-[200] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="text-sm font-semibold text-gray-800">Notifications</span>
            <div className="flex items-center gap-2">
              {unreadNotifCount > 0 && (
                <button
                  onClick={() => markAllReadMutation.mutate()}
                  disabled={markAllReadMutation.isPending}
                  className="flex items-center gap-1 text-xs text-green-700 hover:text-green-800 font-medium"
                  title="Mark all as read"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setNotifOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* List with time grouping */}
          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-400">
                No notifications yet
              </div>
            ) : (() => {
              const todayItems = notifications.filter((n) => isToday(n.createdAt));
              const earlierItems = notifications.filter((n) => !isToday(n.createdAt));
              const renderItem = (n: Notification) => (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0 ${
                    n.isRead ? "opacity-60" : ""
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <span className="mt-0.5 shrink-0 w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
                      {notifIcon(n.type)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        {!n.isRead && <span className="w-1.5 h-1.5 rounded-full bg-green-600 shrink-0" />}
                        <p className="text-xs font-semibold text-gray-800 truncate">{n.title}</p>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.body}</p>
                      <p className="text-[10px] text-gray-400 mt-1">{timeAgo(n.createdAt)}</p>
                    </div>
                  </div>
                </div>
              );
              return (
                <>
                  {todayItems.length > 0 && (
                    <>
                      <div className="px-4 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wide bg-gray-50">Today</div>
                      {todayItems.map(renderItem)}
                    </>
                  )}
                  {earlierItems.length > 0 && (
                    <>
                      <div className="px-4 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wide bg-gray-50">Earlier</div>
                      {earlierItems.map(renderItem)}
                    </>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );

  // ── Sidebar shell ─────────────────────────────────────────────────────────
  const SidebarContent = () => (
    <div className="flex flex-col h-full">

      {/* Logo */}
      <div className="px-4 py-5 shrink-0">
        <Logo variant="sidebar" />
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-1 space-y-0.5 overflow-y-auto">
        {items.map((item) => (
          <NavItem key={item.hash} item={item} />
        ))}
        <NotificationBell />
      </nav>

      {/* Footer */}
      <div className="shrink-0 border-t border-gray-100 px-3 py-3">

        {/* Admin — only shown when relevant */}
        {(user?.isAdmin || user?.isSuperAdmin) && (
          <Link href="/admin">
            <button
              className={`
                w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm
                transition-colors duration-100 mb-0.5
                ${location === "/admin"
                  ? "bg-green-50 text-green-800 font-medium"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                }
              `}
              data-testid="sidebar-admin"
            >
              <ShieldCheck className={`w-4 h-4 ${location === "/admin" ? "text-green-700" : "text-gray-400"}`} />
              <span className="flex-1 text-left">Admin Panel</span>
              {user?.isSuperAdmin && (
                <span className="text-[10px] font-semibold text-green-700">Super</span>
              )}
            </button>
          </Link>
        )}

        {/* Dev-only: Reset Database button */}
        {import.meta.env.DEV && (
          <button
            onClick={async () => {
              if (!window.confirm("Reset the database? This will delete ALL users and data permanently.")) return;
              try {
                await apiRequest("/api/dev/reset-db", { method: "POST" });
                toast({ title: "Database reset", description: "All data cleared. Reloading…", type: "success" });
                setTimeout(() => { window.location.href = "/"; }, 800);
              } catch (err: any) {
                toast({ title: "Reset failed", description: err?.message || "Unknown error", type: "error" });
              }
            }}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors duration-100"
            data-testid="sidebar-reset-db"
          >
            <Trash2 className="w-4 h-4 shrink-0" />
            <span className="truncate">Reset Database (Dev)</span>
          </button>
        )}

        {/* User pop-up trigger */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors duration-100"
              data-testid="sidebar-user-menu"
            >
              <Avatar className="w-7 h-7 shrink-0">
                <AvatarImage src={user?.profilePicture || ""} />
                <AvatarFallback className="bg-green-50 text-green-800 text-xs font-medium">
                  {user?.name?.charAt(0).toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <span className="flex-1 text-left text-sm font-medium text-gray-800 truncate">
                {user?.name}
              </span>
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            side="top"
            align="start"
            sideOffset={8}
            className="w-56"
          >
            <DropdownMenuItem asChild>
              <Link href="/settings" className="flex items-center gap-2.5 w-full cursor-pointer">
                <Settings className="w-4 h-4 text-gray-500" />
                Settings
              </Link>
            </DropdownMenuItem>

            {/* Context switcher — shown only for dual-role users */}
            {otherRoles.length > 0 && (
              <>
                <DropdownMenuSeparator />
                {otherRoles.map((r) => (
                  <DropdownMenuItem
                    key={r}
                    disabled={switchRoleMutation.isPending}
                    onClick={() => switchRoleMutation.mutate(r)}
                    className="flex items-center gap-2.5 cursor-pointer capitalize"
                  >
                    {switchRoleMutation.isPending
                      ? <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                      : <ArrowLeftRight className="w-4 h-4 text-gray-400" />
                    }
                    Switch to {r}
                  </DropdownMenuItem>
                ))}
              </>
            )}

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={logout}
              className="text-red-500 focus:text-red-500 focus:bg-red-50"
            >
              <LogOut className="w-4 h-4 mr-2.5" />
              Sign out
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <div className="flex items-center gap-3 px-2 py-1.5">
              <Link href="/privacy">
                <span className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer">Privacy</span>
              </Link>
              <Link href="/terms">
                <span className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer">Terms</span>
              </Link>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Desktop */}
      <aside
        className="fixed left-0 top-0 h-screen w-[228px] bg-white border-r border-gray-100 z-50 hidden md:flex flex-col"
        data-testid="sidebar"
      >
        <SidebarContent />
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-white border-b border-gray-100 z-50 flex items-center px-4 gap-3">
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
        <Logo variant="mobile" />
        <div className="flex-1" />
        <Avatar className="w-7 h-7">
          <AvatarImage src={user?.profilePicture || ""} />
          <AvatarFallback className="bg-green-50 text-green-800 text-xs font-medium">
            {user?.name?.charAt(0).toUpperCase() || "U"}
          </AvatarFallback>
        </Avatar>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/20"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={`md:hidden fixed left-0 top-14 bottom-0 w-[228px] bg-white border-r border-gray-100 z-50 flex flex-col transition-transform duration-200 ease-out ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <SidebarContent />
      </aside>
    </>
  );
}

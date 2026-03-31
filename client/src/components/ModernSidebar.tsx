import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  Settings,
  User,
  BookOpen,
  UserPlus,
  LibraryBig,
  ClipboardCheck,
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

export default function ModernSidebar() {
  const { user, setUser, logout } = useAuth();
  const queryClient = useQueryClient();
  const [location, setLocation] = useLocation();

  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ["/api/messages/unread-count"],
    refetchInterval: 15000,
  });
  const unreadCount = unreadData?.count ?? 0;

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
        : "assignments",
  );
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleHashChange = () => {
      setCurrentHash(
        window.location.hash
          ? window.location.hash.replace("#", "")
          : user?.role === "parent"
            ? "children"
            : "assignments",
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
    { icon: <BookOpen className="w-4 h-4" />, label: "Assignments", hash: "assignments" },
    { icon: <ClipboardCheck className="w-4 h-4" />, label: "Grade Submissions", hash: "submissions" },
    { icon: <LibraryBig className="w-4 h-4" />, label: "Study Materials", hash: "materials" },
    { icon: <User className="w-4 h-4" />, label: "Students", hash: "students" },
    { icon: <MessageSquare className="w-4 h-4" />, label: "Feedback", hash: "feedback" },
    { icon: <Send className="w-4 h-4" />, label: "Messages", hash: "messages", badge: unreadCount },
  ];

  const parentItems: SidebarItem[] = [
    { icon: <Users className="w-4 h-4" />, label: "My Children", hash: "children" },
    { icon: <GraduationCap className="w-4 h-4" />, label: "Find a Tutor", hash: "tutors" },
    { icon: <UserPlus className="w-4 h-4" />, label: "Invite Student", hash: "invites" },
    { icon: <FileText className="w-4 h-4" />, label: "Progress Reports", hash: "reports" },
    { icon: <Send className="w-4 h-4" />, label: "Messages", hash: "messages", badge: unreadCount },
  ];

  const studentItems: SidebarItem[] = [
    { icon: <BookOpen className="w-4 h-4" />, label: "Assignments", hash: "assignments" },
    { icon: <LibraryBig className="w-4 h-4" />, label: "Study Materials", hash: "materials" },
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
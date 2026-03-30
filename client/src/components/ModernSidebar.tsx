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
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Logo } from "@/components/Logo";

interface SidebarItem {
  icon: React.ReactNode;
  label: string;
  hash: string;
  badge?: number;
}

export default function ModernSidebar() {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();

  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ["/api/messages/unread-count"],
    refetchInterval: 15000,
  });
  const unreadCount = unreadData?.count ?? 0;

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
      setTimeout(() => {
        window.location.hash = hash;
      }, 0);
    } else {
      window.location.hash = hash;
    }
    setMobileOpen(false);
  };

  const teacherItems: SidebarItem[] = [
    { icon: <BookOpen className="w-5 h-5" />, label: "Assignments", hash: "assignments" },
    { icon: <ClipboardCheck className="w-5 h-5" />, label: "Grade Submissions", hash: "submissions" },
    { icon: <LibraryBig className="w-5 h-5" />, label: "Study Materials", hash: "materials" },
    { icon: <User className="w-5 h-5" />, label: "Students", hash: "students" },
    { icon: <MessageSquare className="w-5 h-5" />, label: "Feedback", hash: "feedback" },
    { icon: <Send className="w-5 h-5" />, label: "Messages", hash: "messages", badge: unreadCount },
  ];

  const parentItems: SidebarItem[] = [
    { icon: <Users className="w-5 h-5" />, label: "My Children", hash: "children" },
    { icon: <GraduationCap className="w-5 h-5" />, label: "Find a Tutor", hash: "tutors" },
    { icon: <UserPlus className="w-5 h-5" />, label: "Invite Student", hash: "invites" },
    { icon: <FileText className="w-5 h-5" />, label: "Progress Reports", hash: "reports" },
    { icon: <Send className="w-5 h-5" />, label: "Messages", hash: "messages", badge: unreadCount },
  ];

  const studentItems: SidebarItem[] = [
    { icon: <BookOpen className="w-5 h-5" />, label: "Assignments", hash: "assignments" },
    { icon: <LibraryBig className="w-5 h-5" />, label: "Study Materials", hash: "materials" },
    { icon: <MessageSquare className="w-5 h-5" />, label: "Feedback", hash: "feedback" },
    { icon: <Send className="w-5 h-5" />, label: "Messages", hash: "messages", badge: unreadCount },
  ];

  const getItems = () => {
    if (user?.role === "teacher") return teacherItems;
    if (user?.role === "parent") return parentItems;
    if (user?.role === "student") return studentItems;
    return [];
  };

  const items = getItems();

  const isActive = (hash: string) =>
    currentHash === hash && location === "/dashboard";

  const roleLabel =
    user?.role === "teacher"
      ? "Teacher"
      : user?.role === "parent"
        ? "Parent"
        : "Student";

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-border">
        <Logo variant="sidebar" />
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {items.map((item, index) => (
          <button
            key={index}
            onClick={() => handleNavigation(item.hash)}
            className={`nav-item ${isActive(item.hash) ? "active" : ""}`}
            data-testid={`sidebar-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
            title={item.label}
          >
            <span className={isActive(item.hash) ? "text-primary" : "text-muted-foreground"}>
              {item.icon}
            </span>
            <span className="flex-1">{item.label}</span>
            {item.badge && item.badge > 0 ? (
              <span className="ml-auto flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
                {item.badge > 99 ? "99+" : item.badge}
              </span>
            ) : null}
          </button>
        ))}
      </nav>

      {/* Bottom: profile & settings */}
      <div className="border-t border-border px-3 py-4 space-y-0.5">
        {(user?.isAdmin || user?.isSuperAdmin) && (
          <Link href="/admin">
            <button
              className={`nav-item ${location === "/admin" ? "active" : ""}`}
              data-testid="sidebar-admin"
            >
              <span className={location === "/admin" ? "text-primary" : "text-muted-foreground"}>
                <ShieldCheck className="w-5 h-5" />
              </span>
              <span>Admin Panel</span>
              {user?.isSuperAdmin && (
                <span className="ml-auto text-[10px] font-bold uppercase tracking-wide text-primary">Super</span>
              )}
            </button>
          </Link>
        )}
        <Link href="/profile">
          <button
            className={`nav-item ${location === "/profile" ? "active" : ""}`}
            data-testid="sidebar-profile"
          >
            <span className={location === "/profile" ? "text-primary" : "text-muted-foreground"}>
              <Settings className="w-5 h-5" />
            </span>
            <span>Settings</span>
          </button>
        </Link>

        {/* User info + logout */}
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg mt-1">
          <Avatar className="w-8 h-8 shrink-0">
            <AvatarImage src={user?.profilePicture || ""} />
            <AvatarFallback className="bg-primary text-white text-sm">
              {user?.name?.charAt(0).toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{user?.name}</p>
            <p className="text-xs text-muted-foreground">{roleLabel}</p>
          </div>
          <button
            onClick={logout}
            className="text-muted-foreground hover:text-destructive transition-colors"
            title="Log out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className="fixed left-0 top-0 h-screen w-[240px] bg-white border-r border-border z-50 hidden md:flex flex-col"
        data-testid="sidebar"
      >
        <SidebarContent />
      </aside>

      {/* Mobile: top bar with hamburger */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-white border-b border-border z-50 flex items-center px-4 gap-3">
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-lg text-muted-foreground hover:bg-muted transition-colors"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
        <Logo variant="mobile" />
        <div className="flex-1" />
        <Avatar className="w-8 h-8">
          <AvatarImage src={user?.profilePicture || ""} />
          <AvatarFallback className="bg-primary text-white text-sm">
            {user?.name?.charAt(0).toUpperCase() || "U"}
          </AvatarFallback>
        </Avatar>
      </div>

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/30"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={`md:hidden fixed left-0 top-14 bottom-0 w-[240px] bg-white border-r border-border z-50 flex flex-col transition-transform duration-200 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <SidebarContent />
      </aside>
    </>
  );
}

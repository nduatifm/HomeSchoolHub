import { Link, useLocation } from "wouter";
import { Home, LayoutGrid, Clock, Settings, User, LogOut, BookOpen, Users, FileText } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

export default function ModernSidebar() {
  const { user, logout } = useAuth();

  const getDashboardPath = () => {
    if (user?.role === "teacher") return "/teacher-dashboard";
    if (user?.role === "parent") return "/parent-dashboard";
    if (user?.role === "student") return "/student-dashboard";
    return "/";
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-24 bg-sidebar flex flex-col items-center py-6 shadow-xl z-50" data-testid="sidebar">
      <div className="flex flex-col items-center gap-8 flex-1">
        <Link href={getDashboardPath()}>
          <a
            className="w-16 h-16 rounded-2xl flex items-center justify-center transition-all hover:scale-110 bg-white text-sidebar-bg shadow-md"
            title="Dashboard"
            data-testid="sidebar-dashboard"
          >
            <Home className="w-6 h-6" />
          </a>
        </Link>
        
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center transition-all text-white opacity-50"
          title="More sections available via tabs"
        >
          <LayoutGrid className="w-6 h-6" />
        </div>
      </div>

      <div className="flex flex-col items-center gap-4 mt-auto">
        <Link href="/profile">
          <a className="w-16 h-16 rounded-2xl flex items-center justify-center text-white hover:bg-white/10 transition-all hover:scale-110" data-testid="sidebar-profile">
            <Settings className="w-6 h-6" />
          </a>
        </Link>
        
        <button
          onClick={logout}
          className="w-14 h-14 rounded-full overflow-hidden ring-2 ring-white/20 hover:ring-white/40 transition-all"
          data-testid="sidebar-avatar"
        >
          <Avatar className="w-full h-full">
            <AvatarImage src={user?.profilePicture || ""} />
            <AvatarFallback className="bg-primary text-white">
              {user?.name?.charAt(0).toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
        </button>
      </div>
    </aside>
  );
}

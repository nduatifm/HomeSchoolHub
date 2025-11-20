import { Link, useLocation } from "wouter";
import { Home, LayoutGrid, Clock, Settings, User, LogOut, BookOpen, Users, FileText } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface SidebarItem {
  icon: React.ReactNode;
  label: string;
  path: string;
}

export default function ModernSidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  const teacherItems: SidebarItem[] = [
    { icon: <Home className="w-6 h-6" />, label: "Dashboard", path: "/teacher-dashboard" },
    { icon: <LayoutGrid className="w-6 h-6" />, label: "Assignments", path: "/teacher-dashboard#assignments" },
    { icon: <BookOpen className="w-6 h-6" />, label: "Materials", path: "/teacher-dashboard#materials" },
    { icon: <Users className="w-6 h-6" />, label: "Students", path: "/teacher-dashboard#students" },
  ];

  const parentItems: SidebarItem[] = [
    { icon: <Home className="w-6 h-6" />, label: "Dashboard", path: "/parent-dashboard" },
    { icon: <Users className="w-6 h-6" />, label: "Children", path: "/parent-dashboard#children" },
    { icon: <FileText className="w-6 h-6" />, label: "Progress", path: "/parent-dashboard#progress" },
    { icon: <Clock className="w-6 h-6" />, label: "Attendance", path: "/parent-dashboard#attendance" },
  ];

  const studentItems: SidebarItem[] = [
    { icon: <Home className="w-6 h-6" />, label: "Dashboard", path: "/student-dashboard" },
    { icon: <FileText className="w-6 h-6" />, label: "Assignments", path: "/student-dashboard#assignments" },
    { icon: <BookOpen className="w-6 h-6" />, label: "Materials", path: "/student-dashboard#materials" },
    { icon: <Clock className="w-6 h-6" />, label: "Schedule", path: "/student-dashboard#schedule" },
  ];

  const getItems = () => {
    if (user?.role === "teacher") return teacherItems;
    if (user?.role === "parent") return parentItems;
    if (user?.role === "student") return studentItems;
    return [];
  };

  const items = getItems();

  return (
    <aside className="fixed left-0 top-0 h-screen w-24 bg-sidebar flex flex-col items-center py-6 shadow-xl z-50" data-testid="sidebar">
      <div className="flex flex-col items-center gap-8 flex-1">
        {items.map((item, index) => (
          <button
            key={index}
            onClick={() => window.location.hash = item.path.split('#')[1] || ''}
            className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all hover:scale-110 ${
              index === 0
                ? "bg-white text-sidebar-bg shadow-md"
                : "text-white hover:bg-white/10"
            }`}
            title={item.label}
            data-testid={`sidebar-${item.label.toLowerCase()}`}
          >
            {item.icon}
          </button>
        ))}
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

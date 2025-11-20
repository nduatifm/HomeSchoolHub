import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  Home,
  LayoutGrid,
  Clock,
  Settings,
  User,
  LogOut,
  BookOpen,
  Users,
  FileText,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Logo } from "@/components/Logo";

interface SidebarItem {
  icon: React.ReactNode;
  label: string;
  hash: string;
}

export default function ModernSidebar() {
  const { user, logout } = useAuth();
  const [currentHash, setCurrentHash] = useState(
    window.location.hash.replace("#", "") || "assignments",
  );

  useEffect(() => {
    const handleHashChange = () => {
      setCurrentHash(window.location.hash.replace("#", "") || "assignments");
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const teacherItems: SidebarItem[] = [
    {
      icon: <Home className="w-6 h-6" />,
      label: "Overview",
      hash: "assignments",
    },
    {
      icon: <LayoutGrid className="w-6 h-6" />,
      label: "Assignments",
      hash: "assignments",
    },
    {
      icon: <BookOpen className="w-6 h-6" />,
      label: "Materials",
      hash: "materials",
    },
    {
      icon: <Users className="w-6 h-6" />,
      label: "Students",
      hash: "students",
    },
  ];

  const parentItems: SidebarItem[] = [
    { icon: <Home className="w-6 h-6" />, label: "Overview", hash: "children" },
    {
      icon: <Users className="w-6 h-6" />,
      label: "Children",
      hash: "children",
    },
    {
      icon: <FileText className="w-6 h-6" />,
      label: "Progress",
      hash: "progress",
    },
    {
      icon: <Clock className="w-6 h-6" />,
      label: "Attendance",
      hash: "attendance",
    },
  ];

  const studentItems: SidebarItem[] = [
    {
      icon: <Home className="w-6 h-6" />,
      label: "Overview",
      hash: "assignments",
    },
    {
      icon: <FileText className="w-6 h-6" />,
      label: "Assignments",
      hash: "assignments",
    },
    {
      icon: <BookOpen className="w-6 h-6" />,
      label: "Materials",
      hash: "materials",
    },
    {
      icon: <Clock className="w-6 h-6" />,
      label: "Schedule",
      hash: "schedule",
    },
  ];

  const getItems = () => {
    if (user?.role === "teacher") return teacherItems;
    if (user?.role === "parent") return parentItems;
    if (user?.role === "student") return studentItems;
    return [];
  };

  const items = getItems();

  return (
    <aside
      className="fixed left-0 top-0 h-screen w-24 bg-sidebar flex flex-col items-center py-6 shadow-xl z-50"
      data-testid="sidebar"
    >
      <Logo variant="sidebar" className="mb-4" />

      <div className="flex flex-col items-center gap-8 flex-1">
        {items.map((item, index) => (
          <button
            key={index}
            onClick={() => (window.location.hash = item.hash)}
            className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all hover:scale-110 ${
              currentHash === item.hash
                ? "bg-white text-sidebar-bg shadow-md"
                : "text-white hover:bg-white/10"
            }`}
            title={item.label}
            data-testid={`sidebar-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
          >
            {item.icon}
          </button>
        ))}
      </div>

      <div className="flex flex-col items-center gap-4 mt-auto">
        <Link href="/profile">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-white hover:bg-white/10 transition-all hover:scale-110 cursor-pointer"
            data-testid="sidebar-profile"
          >
            <Settings className="w-6 h-6" />
          </div>
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

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
  CreditCard,
  Star,
  Calendar,
  MessageSquare,
  Shield,
  HelpCircle,
  Award,
  // UserPlus, // For tutor request - commented for future use
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
    window.location.hash.replace("#", "") || "schedule",
  );

  useEffect(() => {
    const handleHashChange = () => {
      setCurrentHash(window.location.hash.replace("#", "") || "schedule");
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  // Teacher sidebar items
  // Available tabs: schedule, attendance, tutor request (commented), progress report, messages
  const teacherItems: SidebarItem[] = [
    {
      icon: <Calendar className="w-6 h-6" />,
      label: "Schedule",
      hash: "schedule",
    },
    {
      icon: <Clock className="w-6 h-6" />,
      label: "Attendance",
      hash: "attendance",
    },
    // Tutor Request - commented for future use (multiple teachers feature)
    // {
    //   icon: <UserPlus className="w-6 h-6" />,
    //   label: "Tutor Request",
    //   hash: "tutor-request",
    // },
    {
      icon: <FileText className="w-6 h-6" />,
      label: "Progress Report",
      hash: "progress-report",
    },
    {
      icon: <MessageSquare className="w-6 h-6" />,
      label: "Messages",
      hash: "messages",
    },
  ];

  // Parent sidebar items
  // Available tabs: payments, rate tutor, attendance, tutor request (commented), progress report, parental control, messages
  const parentItems: SidebarItem[] = [
    {
      icon: <CreditCard className="w-6 h-6" />,
      label: "Payments",
      hash: "payments",
    },
    {
      icon: <Star className="w-6 h-6" />,
      label: "Rate Tutor",
      hash: "rate-tutor",
    },
    {
      icon: <Clock className="w-6 h-6" />,
      label: "Attendance",
      hash: "attendance",
    },
    // Tutor Request - commented for future use (multiple teachers feature)
    // {
    //   icon: <UserPlus className="w-6 h-6" />,
    //   label: "Tutor Request",
    //   hash: "tutor-request",
    // },
    {
      icon: <FileText className="w-6 h-6" />,
      label: "Progress Report",
      hash: "progress-report",
    },
    {
      icon: <Shield className="w-6 h-6" />,
      label: "Parental Control",
      hash: "parental-control",
    },
    {
      icon: <MessageSquare className="w-6 h-6" />,
      label: "Messages",
      hash: "messages",
    },
  ];

  // Student sidebar items
  // Available tabs: schedule, attendance, rewards, ask questions, messages
  const studentItems: SidebarItem[] = [
    {
      icon: <Calendar className="w-6 h-6" />,
      label: "Schedule",
      hash: "schedule",
    },
    {
      icon: <Clock className="w-6 h-6" />,
      label: "Attendance",
      hash: "attendance",
    },
    {
      icon: <Award className="w-6 h-6" />,
      label: "Rewards",
      hash: "rewards",
    },
    {
      icon: <HelpCircle className="w-6 h-6" />,
      label: "Ask Questions",
      hash: "ask-questions",
    },
    {
      icon: <MessageSquare className="w-6 h-6" />,
      label: "Messages",
      hash: "messages",
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

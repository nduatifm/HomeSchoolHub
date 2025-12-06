import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import {
  Settings,
  User,
  BookOpen,
  FileText,
  UserPlus,
  Presentation,
  MessageSquareQuote,
  LibraryBig,
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
  const [location, setLocation] = useLocation();
  const [currentHash, setCurrentHash] = useState(
    window.location.hash.replace("#", "") || user?.role === "parent"
      ? "children"
      : "assignments",
  );

  const [openMenu, setOpenMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleHashChange = () => {
      setCurrentHash(
        window.location.hash.replace("#", "") || user?.role === "parent"
          ? "children"
          : "assignments",
      );
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: any) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleNavigation = (hash: string) => {
    if (location !== "/dashboard") {
      setLocation(`/dashboard#${hash}`);
      setTimeout(() => {
        window.location.hash = hash;
      }, 50);
    } else {
      window.location.hash = hash;
    }
  };

  // Teacher sidebar items
  const teacherItems: SidebarItem[] = [
    {
      icon: <BookOpen className="w-6 h-6" />,
      label: "Assignments",
      hash: "assignments",
    },
    {
      icon: <LibraryBig className="w-6 h-6" />,
      label: "Study Materials",
      hash: "materials",
    },
    {
      icon: <User className="w-6 h-6" />,
      label: "Students",
      hash: "students",
    },
    {
      icon: <Presentation className="w-6 h-6" />,
      label: "Sessions",
      hash: "sessions",
    },
  ];

  // Parent sidebar items
  const parentItems: SidebarItem[] = [
    {
      icon: <User className="w-6 h-6" />,
      label: "My Children",
      hash: "children",
    },
    {
      icon: <UserPlus className="w-6 h-6" />,
      label: "Invite Student",
      hash: "invites",
    },
  ];

  // Student sidebar items
  const studentItems: SidebarItem[] = [
    {
      icon: <BookOpen className="w-6 h-6" />,
      label: "Assignments",
      hash: "assignments",
    },
    {
      icon: <LibraryBig className="w-6 h-6" />,
      label: "Study Materials",
      hash: "materials",
    },
    {
      icon: <User className="w-6 h-6" />,
      label: "Teachers",
      hash: "teachers",
    },
    {
      icon: <Presentation className="w-6 h-6" />,
      label: "Sessions",
      hash: "sessions",
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
            onClick={() => handleNavigation(item.hash)}
            className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all hover:scale-110 ${
              currentHash === item.hash && location === "/dashboard"
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
            className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all hover:scale-110 cursor-pointer ${
              location === "/profile"
                ? "bg-white text-sidebar-bg shadow-md"
                : "text-white hover:bg-white/10"
            }`}
            data-testid="sidebar-profile"
          >
            <Settings className="w-6 h-6" />
          </div>
        </Link>

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setOpenMenu(!openMenu)}
            className="w-14 h-14 rounded-full overflow-hidden ring-2 ring-white/20 hover:ring-white/40 transition-all"
          >
            <Avatar className="w-full h-full">
              <AvatarImage src={user?.profilePicture || ""} />
              <AvatarFallback className="bg-primary text-white">
                {user?.name?.charAt(0).toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
          </button>

          {openMenu && (
            <div className="absolute left-16 bottom-0 w-60 bg-white shadow-2xl rounded-2xl border p-4 z-[100]">
              <div className="flex items-center gap-3 mb-4">
                <Avatar className="w-12 h-12">
                  <AvatarImage src={user?.profilePicture || ""} />
                  <AvatarFallback className="bg-primary text-white text-lg">
                    {user?.name?.charAt(0).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-gray-900">{user?.name}</p>
                  <p className="text-sm text-gray-600">{user?.email}</p>
                </div>
              </div>

              <button
                onClick={logout}
                className="w-full bg-red-500 hover:bg-red-600 text-white py-2 rounded-xl transition-all"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

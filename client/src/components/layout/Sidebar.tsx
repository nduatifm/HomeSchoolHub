import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { clearAllStorage } from "@/lib/storage";
import { signOut as firebaseSignOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { 
  Home, 
  BookOpen, 
  Calendar, 
  BarChart2, 
  MessageSquare, 
  Settings,
  LogOut
} from "lucide-react";

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const [location] = useLocation();
  const { user, firebaseAuthUser } = useAuth();
  
  const handleLogout = async () => {
    try {
      // If user is authenticated via Firebase, sign out from Firebase
      if (firebaseAuthUser) {
        await firebaseSignOut(auth);
        await fetch("/api/auth/firebase-logout", {
          method: "POST",
          credentials: 'include'
        });
      }
      
      // Clear all browser storage
      clearAllStorage();
      
      // Redirect to home page
      window.location.href = "/";
    } catch (error) {
      console.error("Logout error:", error);
      // Still clear storage and redirect even if there's an error
      clearAllStorage();
      window.location.href = "/";
    }
  };
  
  const navItems = [
    {
      title: "Dashboard",
      href: "/",
      icon: <Home className="h-5 w-5 mr-3" />,
    },
    {
      title: "Assignments",
      href: "/assignments",
      icon: <BookOpen className="h-5 w-5 mr-3" />,
    },
    {
      title: "Sessions",
      href: "/sessions",
      icon: <Calendar className="h-5 w-5 mr-3" />,
    },
    {
      title: "Progress",
      href: "/progress",
      icon: <BarChart2 className="h-5 w-5 mr-3" />,
    },
    {
      title: "Messages",
      href: "/messages",
      icon: <MessageSquare className="h-5 w-5 mr-3" />,
    },
  ];

  // Mock data for students (in a real application this would come from API)
  const students = [
    { id: "1", name: "Alex Thompson", profileImageUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=120&h=120" },
    { id: "2", name: "Emma Davis", profileImageUrl: "https://images.unsplash.com/photo-1580489944761-15a19d654956?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=120&h=120" },
    { id: "3", name: "Nathan Wilson", profileImageUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=120&h=120" },
  ];

  return (
    <aside className={cn("hidden md:flex md:flex-col md:w-64 bg-white shadow-md z-10 dark:bg-gray-900 dark:border-r dark:border-gray-800", className)}>
      <div className="p-4 border-b border-gray-100 dark:border-gray-800">
        <h1 className="text-xl font-bold text-primary flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          HomeschoolSync
        </h1>
      </div>

      <div className="p-4 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center mb-4">
          <img 
            src={user?.profileImageUrl || "https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=120&h=120"} 
            alt="User profile" 
            className="w-10 h-10 rounded-full object-cover mr-3"
          />
          <div>
            <p className="font-semibold">{user?.firstName || user?.email || "User"}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{user?.role || "User"}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-4">
        <h2 className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">Main Menu</h2>
        <ul className="space-y-2">
          {navItems.map((item) => (
            <li key={item.href}>
              <Link href={item.href}>
                <a className={cn(
                  "flex items-center px-3 py-2 rounded-md",
                  location === item.href 
                    ? "text-primary-600 bg-primary-50 dark:bg-primary-900/20 dark:text-primary-400 font-medium" 
                    : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                )}>
                  {item.icon}
                  {item.title}
                </a>
              </Link>
            </li>
          ))}
        </ul>

        {/* Only show students list for tutors */}
        {user?.role === "tutor" && (
          <>
            <h2 className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 mt-8 mb-3">My Students</h2>
            <ul className="space-y-2">
              {students.map((student) => (
                <li key={student.id}>
                  <a href="#" className="flex items-center px-3 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md">
                    <img src={student.profileImageUrl} alt="Student profile" className="w-6 h-6 rounded-full object-cover mr-3" />
                    {student.name}
                  </a>
                </li>
              ))}
            </ul>
          </>
        )}
      </nav>

      <div className="p-4 border-t border-gray-100 dark:border-gray-800">
        <a href="#" className="flex items-center px-3 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md">
          <Settings className="h-5 w-5 mr-3" />
          Settings
        </a>
        <button 
          onClick={handleLogout} 
          className="w-full flex items-center px-3 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md mt-2"
          data-testid="button-logout"
        >
          <LogOut className="h-5 w-5 mr-3" />
          Logout
        </button>
      </div>
    </aside>
  );
}

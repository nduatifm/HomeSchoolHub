import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { 
  Home, 
  BookOpen, 
  Calendar, 
  BarChart2, 
  MessageSquare
} from "lucide-react";

export function MobileNav() {
  const [location] = useLocation();
  
  const navItems = [
    {
      title: "Home",
      href: "/",
      icon: <Home className="h-6 w-6" />,
    },
    {
      title: "Assignments",
      href: "/assignments",
      icon: <BookOpen className="h-6 w-6" />,
    },
    {
      title: "Sessions",
      href: "/sessions",
      icon: <Calendar className="h-6 w-6" />,
    },
    {
      title: "Progress",
      href: "/progress",
      icon: <BarChart2 className="h-6 w-6" />,
    },
    {
      title: "Messages",
      href: "/messages",
      icon: <MessageSquare className="h-6 w-6" />,
    },
  ];

  return (
    <nav className="md:hidden bg-white dark:bg-gray-900 border-t dark:border-gray-800 fixed bottom-0 left-0 right-0 z-20">
      <div className="grid grid-cols-5 h-16">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href}>
            <a className={cn(
              "flex flex-col items-center justify-center",
              location === item.href 
                ? "text-primary-600 dark:text-primary-400" 
                : "text-gray-500 dark:text-gray-400"
            )}>
              {item.icon}
              <span className="text-xs mt-1">{item.title}</span>
            </a>
          </Link>
        ))}
      </div>
    </nav>
  );
}

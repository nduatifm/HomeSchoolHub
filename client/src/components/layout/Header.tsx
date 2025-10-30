import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Bell, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { clearAllStorage } from "@/lib/storage";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "next-themes";

interface HeaderProps {
  onMobileMenuToggle: () => void;
}

export function Header({ onMobileMenuToggle }: HeaderProps) {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  
  const toggleMobileMenu = () => {
    setShowMobileMenu(!showMobileMenu);
    onMobileMenuToggle();
  };
  
  const handleLogout = () => {
    clearAllStorage();
    window.location.href = "/api/logout";
  };

  return (
    <header className="bg-white dark:bg-gray-900 shadow-sm z-10">
      <div className="px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center md:hidden">
          <Button variant="ghost" size="icon" onClick={toggleMobileMenu}>
            <Menu className="h-6 w-6 text-gray-500 dark:text-gray-400" />
          </Button>
          <h1 className="text-lg font-semibold text-primary ml-3 md:hidden">HomeschoolSync</h1>
        </div>

        <div className="flex-1 flex justify-end items-center space-x-4">
          <div className="relative">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-6 w-6 text-gray-500 dark:text-gray-400" />
              <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-500 rounded-full">3</span>
            </Button>
          </div>

          <div className="hidden sm:flex items-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 flex items-center space-x-2">
                  <img 
                    src={user?.profileImageUrl || "https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=120&h=120"} 
                    alt="User profile" 
                    className="h-8 w-8 rounded-full object-cover"
                  />
                  <span className="ml-2 text-gray-700 dark:text-gray-300">
                    {user?.firstName || user?.email?.split('@')[0] || "User"}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Profile</DropdownMenuItem>
                <DropdownMenuItem>Settings</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
                  {theme === 'dark' ? 'Light Theme' : 'Dark Theme'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} data-testid="menuitem-logout">
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}

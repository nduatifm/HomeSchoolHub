import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Bell, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { clearAllStorage } from "@/lib/storage";
import { signOut as firebaseSignOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "next-themes";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Notification } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface HeaderProps {
  onMobileMenuToggle: () => void;
}

export function Header({ onMobileMenuToggle }: HeaderProps) {
  const { user, firebaseAuthUser } = useAuth();
  const { theme, setTheme } = useTheme();
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [notificationsPanelOpen, setNotificationsPanelOpen] = useState(false);
  
  const toggleMobileMenu = () => {
    setShowMobileMenu(!showMobileMenu);
    onMobileMenuToggle();
  };

  // Fetch unread notifications
  const { data: notifications } = useQuery<Notification[]>({
    queryKey: [`/api/notifications/unread/${user?.id}`],
    enabled: !!user?.id,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Mark notification as read mutation
  const markAsRead = useMutation({
    mutationFn: async (notificationId: number) => {
      return apiRequest("PATCH", `/api/notifications/${notificationId}/read`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/notifications/unread/${user?.id}`] });
    },
  });

  // Mark all notifications as read mutation
  const markAllAsRead = useMutation({
    mutationFn: async () => {
      return apiRequest("PATCH", `/api/notifications/read-all/${user?.id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/notifications/unread/${user?.id}`] });
    },
  });

  const unreadCount = notifications?.length || 0;
  
  const handleLogout = async () => {
    try {
      // If user is authenticated via Firebase, sign out from Firebase first
      if (firebaseAuthUser) {
        await firebaseSignOut(auth);
      }
      
      // Call universal logout endpoint to destroy session (works for all auth methods)
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: 'include'
      });
      
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

  return (
    <header className="bg-white dark:bg-gray-900 shadow-sm z-10">
      <div className="px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center md:hidden">
          <Button variant="ghost" size="icon" onClick={toggleMobileMenu} data-testid="button-mobile-menu">
            <Menu className="h-6 w-6 text-gray-500 dark:text-gray-400" />
          </Button>
          <h1 className="text-lg font-semibold text-primary ml-3 md:hidden">HomeschoolSync</h1>
        </div>

        <div className="flex-1 flex justify-end items-center space-x-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative" data-testid="button-notifications">
                <Bell className="h-6 w-6 text-gray-500 dark:text-gray-400" />
                {unreadCount > 0 && (
                  <span 
                    className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-500 rounded-full"
                    data-testid="text-notification-count"
                  >
                    {unreadCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <div className="flex items-center justify-between px-2 py-2">
                <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                {unreadCount > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => markAllAsRead.mutate()}
                    className="h-8 text-xs"
                    data-testid="button-mark-all-read"
                  >
                    Mark all as read
                  </Button>
                )}
              </div>
              <DropdownMenuSeparator />
              <ScrollArea className="h-[300px]">
                {!notifications || notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                    No new notifications
                  </div>
                ) : (
                  <div className="space-y-1">
                    {notifications.map((notification) => (
                      <DropdownMenuItem
                        key={notification.id}
                        className="flex flex-col items-start gap-1 p-3 cursor-pointer"
                        onClick={() => markAsRead.mutate(notification.id)}
                        data-testid={`notification-${notification.id}`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="font-medium text-sm" data-testid={`text-notification-title-${notification.id}`}>
                            {notification.title}
                          </span>
                          {!notification.read && (
                            <Badge variant="default" className="h-2 w-2 p-0 rounded-full bg-primary" />
                          )}
                        </div>
                        <span className="text-xs text-gray-600 dark:text-gray-400" data-testid={`text-notification-message-${notification.id}`}>
                          {notification.message}
                        </span>
                      </DropdownMenuItem>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="hidden sm:flex items-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 flex items-center space-x-2" data-testid="button-profile-menu">
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
                <DropdownMenuItem data-testid="menuitem-profile">Profile</DropdownMenuItem>
                <DropdownMenuItem data-testid="menuitem-settings">Settings</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} data-testid="menuitem-theme">
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

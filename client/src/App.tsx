import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import NotFound from "@/pages/not-found";
import Login from "@/pages/auth/Login";
import TutorDashboard from "@/pages/dashboard/TutorDashboard";
import ParentDashboard from "@/pages/dashboard/ParentDashboard";
import StudentDashboard from "@/pages/dashboard/StudentDashboard";
import Assignments from "@/pages/assignments/Assignments";
import Sessions from "@/pages/sessions/Sessions";
import ProgressTracker from "@/pages/progress/Progress";
import Messages from "@/pages/messages/Messages";

import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

function Router() {
  const { user, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/" component={Login} />
        <Route path="*" component={Login} />
      </Switch>
    );
  }

  // Role-based routing
  const userRole = user?.role || "student";
  
  return (
    <Switch>
      {/* Dashboard routes based on role */}
      <Route path="/">
        {userRole === "tutor" && <TutorDashboard />}
        {userRole === "parent" && <ParentDashboard />}
        {userRole === "student" && <StudentDashboard />}
      </Route>
      
      {/* Common routes for all authenticated users */}
      <Route path="/assignments" component={Assignments} />
      <Route path="/sessions" component={Sessions} />
      <Route path="/progress" component={ProgressTracker} />
      <Route path="/messages" component={Messages} />
      
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

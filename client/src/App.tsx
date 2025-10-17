import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import NotFound from "@/pages/not-found";
import Login from "@/pages/auth/Login";
import VerifyEmail from "@/pages/auth/VerifyEmail";
import TutorDashboard from "@/pages/dashboard/TutorDashboard";
import ParentDashboard from "@/pages/dashboard/ParentDashboard";
import StudentDashboard from "@/pages/dashboard/StudentDashboard";
import Assignments from "@/pages/assignments/Assignments";
import Sessions from "@/pages/sessions/Sessions";
import ProgressTracker from "@/pages/progress/Progress";
import Messages from "@/pages/messages/Messages";

// Onboarding pages
import RoleSelection from "@/pages/onboarding/RoleSelection";
import StudentInfo from "@/pages/onboarding/StudentInfo";
import ParentInfo from "@/pages/onboarding/ParentInfo";
import TutorInfo from "@/pages/onboarding/TutorInfo";
import Preferences from "@/pages/onboarding/Preferences";

import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

function Router() {
  const { user, isLoading, isAuthenticated, firebaseAuthUser } = useAuth();

  // Show loading spinner during auth check
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If not authenticated at all, show login page or verify email
  if (!isAuthenticated && !firebaseAuthUser) {
    return (
      <Switch>
        <Route path="/" component={Login} />
        <Route path="/verify-email" component={VerifyEmail} />
        <Route path="/login" component={Login} />
        <Route path="*" component={Login} />
      </Switch>
    );
  }

  // If we have Firebase auth but no server user yet, redirect to login 
  // to complete the sign-up process properly
  if (firebaseAuthUser && !user) {
    return (
      <Switch>
        <Route path="/" component={Login} />
        <Route path="/onboarding/role-selection" component={RoleSelection} />
        <Route path="/onboarding/student-info" component={StudentInfo} />
        <Route path="/onboarding/parent-info" component={ParentInfo} />
        <Route path="/onboarding/tutor-info" component={TutorInfo} />
        <Route path="/onboarding/preferences" component={Preferences} />
        <Route path="*" component={Login} />
      </Switch>
    );
  }

  // If user is authenticated but has no role, show onboarding routes
  if (user && !user.role) {
    return (
      <Switch>
        <Route path="/" component={RoleSelection} />
        <Route path="/onboarding/role-selection" component={RoleSelection} />
        <Route path="/onboarding/student-info" component={StudentInfo} />
        <Route path="/onboarding/parent-info" component={ParentInfo} />
        <Route path="/onboarding/tutor-info" component={TutorInfo} />
        <Route path="/onboarding/preferences" component={Preferences} />
        <Route path="*" component={RoleSelection} />
      </Switch>
    );
  }

  // Role-based routing for fully authenticated users
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

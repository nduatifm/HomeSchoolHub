import { Route, Switch, Redirect } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { Toaster } from "@/components/ui/toaster";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import StudentSignup from "./pages/StudentSignup";
import VerifyEmail from "./pages/VerifyEmail";
import Profile from "./pages/Profile";
import TeacherDashboard from "./pages/TeacherDashboard";
import ParentDashboard from "./pages/ParentDashboard";
import StudentDashboard from "./pages/StudentDashboard";
import ClassroomDetail from "./pages/ClassroomDetail";
import ClassworkDetail from "./pages/ClassworkDetail";
import ClassroomMaterialPage from "./pages/ClassroomMaterialPage";
import NewAssignmentPage from "./pages/classroom/NewAssignmentPage";
import SubmissionReviewPage from "./pages/classroom/SubmissionReviewPage";
import Landing from "./pages/Landing";
import DevRoleSwitcher from "./components/DevRoleSwitcher";
import AdminUsers from "./pages/AdminUsers";
import NotificationsPage from "./pages/Notifications";
import FormBuilderPage from "./pages/FormBuilderPage";

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto"></div>
          <p className="mt-3 text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  return <Component />;
}

function DashboardRouter() {
  const { user, student, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto"></div>
          <p className="mt-3 text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  if (user.role === "teacher") {
    return <TeacherDashboard />;
  } else if (user.role === "parent") {
    return <ParentDashboard />;
  } else if (user.role === "student") {
    return <StudentDashboard />;
  }

  return <Redirect to="/login" />;
}

function AdminRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto"></div>
          <p className="mt-3 text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || (!user.isAdmin && !user.isSuperAdmin)) {
    return <Redirect to="/dashboard" />;
  }

  return <Component />;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Switch>
      <Route path="/login">
        {user ? <Redirect to="/dashboard" /> : <Login />}
      </Route>
      <Route path="/signup">
        {user ? <Redirect to="/dashboard" /> : <Signup />}
      </Route>
      <Route path="/student-signup">
        {user ? <Redirect to="/dashboard" /> : <StudentSignup />}
      </Route>
      <Route path="/verify-email">
        <VerifyEmail />
      </Route>
      <Route path="/settings">
        <ProtectedRoute component={Profile} />
      </Route>
      <Route path="/admin">
        <AdminRoute component={AdminUsers} />
      </Route>
      <Route path="/notifications">
        <ProtectedRoute component={NotificationsPage} />
      </Route>
      <Route path="/form-builder">
        <ProtectedRoute component={FormBuilderPage} />
      </Route>
      <Route path="/classrooms/:slug/assignments/new">
        <ProtectedRoute component={NewAssignmentPage} />
      </Route>
      <Route path="/classrooms/:slug/submissions/:submissionId/review">
        <ProtectedRoute component={SubmissionReviewPage} />
      </Route>
      <Route path="/classrooms/:slug/classwork/:classworkSlug">
        <ProtectedRoute component={ClassworkDetail} />
      </Route>
      <Route path="/classrooms/:slug/materials/new">
        <ProtectedRoute component={ClassroomMaterialPage} />
      </Route>
      <Route path="/classrooms/:slug/materials/:materialSlug/edit">
        <ProtectedRoute component={ClassroomMaterialPage} />
      </Route>
      <Route path="/classrooms/:slug/materials/:materialSlug">
        <ProtectedRoute component={ClassroomMaterialPage} />
      </Route>
      <Route path="/classrooms/:slug">
        <ProtectedRoute component={ClassroomDetail} />
      </Route>
      <Route path="/dashboard/:tab">
        <DashboardRouter />
      </Route>
      <Route path="/dashboard">
        <DashboardRouter />
      </Route>
      <Route path="/">
        {user ? <Redirect to="/dashboard" /> : <Landing />}
      </Route>
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppRoutes />
        {import.meta.env.DEV && <DevRoleSwitcher />}
      </AuthProvider>
      <Toaster />
    </QueryClientProvider>
  );
}

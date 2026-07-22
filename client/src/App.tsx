import { useEffect, useRef } from "react";
import { Route, Switch, Redirect, useLocation, useRoute } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { Toaster } from "@/components/ui/toaster";
import { incrementNavCount } from "./lib/navigationHistory";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import StudentSignup from "./pages/StudentSignup";
import VerifyEmail from "./pages/VerifyEmail";
import Profile from "./pages/Profile";
import ClassroomDetail from "./pages/ClassroomDetail";
import ClassworkDetail from "./pages/ClassworkDetail";
import ClassroomMaterialPage from "./pages/ClassroomMaterialPage";
import NewAssignmentPage from "./pages/classroom/NewAssignmentPage";
import EditAssignmentPage from "./pages/classroom/EditAssignmentPage";
import SubmissionReviewPage from "./pages/classroom/SubmissionReviewPage";
import Landing from "./pages/Landing";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import DevRoleSwitcher from "./components/DevRoleSwitcher";
import AdminImpersonatorPanel from "./components/AdminImpersonatorPanel";
import ImpersonationBanner from "./components/ImpersonationBanner";
import ManagedChildBanner from "./components/ManagedChildBanner";
import AdminUsers from "./pages/AdminUsers";
import NotificationsPage from "./pages/Notifications";
import FormBuilderPage from "./pages/FormBuilderPage";
import ClassroomsPage from "./pages/ClassroomsPage";
import FolderDetailPage from "./pages/FolderDetailPage";
import MessagesPage from "./pages/MessagesPage";
import PlannerPage from "./pages/PlannerPage";

import TeacherStudentsPage from "./pages/TeacherStudentsPage";
import TutorRequestsPage from "./pages/TutorRequestsPage";
import TeacherFeedbackPage from "./pages/TeacherFeedbackPage";
import StudentClassroomsPage from "./pages/StudentClassroomsPage";
import StudentGradesPage from "./pages/StudentGradesPage";
import StudentFeedbackPage from "./pages/StudentFeedbackPage";
import ParentChildrenPage from "./pages/ParentChildrenPage";
import ParentClassroomsPage from "./pages/ParentClassroomsPage";
import ParentTutorsPage from "./pages/ParentTutorsPage";
import ParentInvitesPage from "./pages/ParentInvitesPage";
import ParentReportsPage from "./pages/ParentReportsPage";
import ReportViewPage from "./pages/ReportViewPage";
import TeamInvitePage from "./pages/TeamInvitePage";

function RouteTracker() {
  const [location] = useLocation();
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    incrementNavCount();
  }, [location]);
  return null;
}

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto" />
        <p className="mt-3 text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <LoadingScreen />;
  if (!user) return <Redirect to="/login" />;
  return <Component />;
}

function TeacherRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <LoadingScreen />;
  if (!user) return <Redirect to="/login" />;
  if (user.role !== "teacher" && !user.roles?.includes("teacher")) return <Redirect to="/classrooms" />;
  return <Component />;
}

function StudentRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <LoadingScreen />;
  if (!user) return <Redirect to="/login" />;
  if (user.role !== "student") return <Redirect to="/classrooms" />;
  return <Component />;
}

function ParentRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <LoadingScreen />;
  if (!user) return <Redirect to="/login" />;
  if (user.role !== "parent") return <Redirect to="/classrooms" />;
  return <Component />;
}

function AdminRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <LoadingScreen />;
  if (!user || (!user.isAdmin && !user.isSuperAdmin)) return <Redirect to="/dashboard" />;
  return <Component />;
}

function DashboardRouter() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <LoadingScreen />;
  if (!user) return <Redirect to="/login" />;
  if (user.role === "teacher") return <Redirect to="/classrooms" />;
  if (user.role === "parent")  return <Redirect to="/children" />;
  if (user.role === "student") return <Redirect to="/classrooms" />;
  return <Redirect to="/login" />;
}

function ClassroomsRouter() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <LoadingScreen />;
  if (!user) return <Redirect to="/login" />;
  if (user.role === "teacher") return <ClassroomsPage />;
  if (user.role === "parent")  return <ParentClassroomsPage />;
  return <StudentClassroomsPage />;
}

function FeedbackRouter() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <LoadingScreen />;
  if (!user) return <Redirect to="/login" />;
  if (user.role === "teacher") return <TeacherFeedbackPage />;
  if (user.role === "student") return <StudentFeedbackPage />;
  return <Redirect to="/children" />;
}

function ClassroomRedirect() {
  const [location] = useLocation();
  const slug = location.split("/")[2] ?? "";
  const qs = window.location.search;
  return <Redirect to={`/classrooms/${slug}/feed${qs}`} />;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <>
      <RouteTracker />
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
        <Route path="/forgot-password">
          {user ? <Redirect to="/dashboard" /> : <ForgotPassword />}
        </Route>
        <Route path="/reset-password">
          <ResetPassword />
        </Route>
        <Route path="/team-invite/:token">
          <TeamInvitePage />
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
        <Route path="/messages">
          <ProtectedRoute component={MessagesPage} />
        </Route>
        <Route path="/planner">
          <ProtectedRoute component={PlannerPage} />
        </Route>

        {/* Teacher-only pages */}
        <Route path="/students">
          <TeacherRoute component={TeacherStudentsPage} />
        </Route>
        <Route path="/requests">
          <TeacherRoute component={TutorRequestsPage} />
        </Route>

        {/* Feedback — teacher or student; parent redirected to /children */}
        <Route path="/feedback">
          <FeedbackRouter />
        </Route>

        {/* Student-only */}
        <Route path="/grades">
          <StudentRoute component={StudentGradesPage} />
        </Route>

        {/* Parent-only pages */}
        <Route path="/children">
          <ParentRoute component={ParentChildrenPage} />
        </Route>
        <Route path="/find-tutor">
          <ParentRoute component={ParentTutorsPage} />
        </Route>
        <Route path="/invites">
          <ParentRoute component={ParentInvitesPage} />
        </Route>
        <Route path="/reports">
          <ParentRoute component={ParentReportsPage} />
        </Route>
        <Route path="/reports/:id/view">
          <ProtectedRoute component={ReportViewPage} />
        </Route>

        {/* Classroom sub-pages — most specific first */}
        <Route path="/classrooms/:slug/assignments/new">
          <TeacherRoute component={NewAssignmentPage} />
        </Route>
        <Route path="/classrooms/:slug/assignments/:assignmentSlug/edit">
          <TeacherRoute component={EditAssignmentPage} />
        </Route>
        <Route path="/classrooms/:slug/submissions/:submissionId/review">
          <TeacherRoute component={SubmissionReviewPage} />
        </Route>
        <Route path="/classrooms/:slug/classwork/:classworkSlug">
          <ProtectedRoute component={ClassworkDetail} />
        </Route>
        <Route path="/classrooms/:slug/materials/new">
          <TeacherRoute component={ClassroomMaterialPage} />
        </Route>
        <Route path="/classrooms/:slug/materials/:materialSlug/edit">
          <TeacherRoute component={ClassroomMaterialPage} />
        </Route>
        <Route path="/classrooms/:slug/materials/:materialSlug">
          <ProtectedRoute component={ClassroomMaterialPage} />
        </Route>

        {/* Folder detail — before :slug/:tab so "folders" isn't matched as slug */}
        <Route path="/classrooms/folders/:folderId">
          <ProtectedRoute component={FolderDetailPage} />
        </Route>

        {/* ClassroomDetail with tab in path */}
        <Route path="/classrooms/:slug/:tab">
          <ProtectedRoute component={ClassroomDetail} />
        </Route>

        {/* Bare /classrooms/:slug → redirect to /classrooms/:slug/feed */}
        <Route path="/classrooms/:slug">
          <ClassroomRedirect />
        </Route>

        {/* Classrooms list — role-aware */}
        <Route path="/classrooms">
          <ClassroomsRouter />
        </Route>

        {/* Legacy dashboard routes → redirect to role's home */}
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
    </>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ImpersonationBanner />
        <ManagedChildBanner />
        <AppRoutes />
        {import.meta.env.DEV && <DevRoleSwitcher />}
        <AdminImpersonatorPanel />
      </AuthProvider>
      <Toaster />
    </QueryClientProvider>
  );
}

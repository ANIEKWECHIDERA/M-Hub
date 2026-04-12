import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthContext } from "@/context/AuthContext";
import Layout from "./Layout";
import { AppContextProvider } from "./context/AppProvider";
import { AuthProvider } from "./context/AuthContext";
import { WorkspaceProvider } from "./context/WorkspaceContext";
import { UserProvider } from "./context/UserContext";
import { Toaster } from "./components/ui/sonner";
import { AuthGuard } from "./components/auth/AuthGuard";
import { Loader } from "lucide-react";
import { UploadStatusProvider } from "./context/UploadStatusContext";
import { MotionConfig } from "framer-motion";
import { PostHogProvider } from "./components/PostHogProvider";

const Dashboard = lazy(() => import("./pages/DashBoard"));
const Projects = lazy(() => import("./pages/Projects"));
const Chat = lazy(() => import("./pages/Chat"));
const Notepad = lazy(() => import("./pages/Notepad"));
const Tools = lazy(() => import("./pages/Tools"));
const Settings = lazy(() => import("./pages/Settings"));
const WorkspaceManager = lazy(() => import("./pages/WorkspaceManager"));
const ProjectDetailWrapper = lazy(
  () => import("./pages/projectDetail/ProjectDetailWrapper"),
);
const LoginPage = lazy(() => import("./pages/LoginPage"));
const SignUpPage = lazy(() => import("./pages/SignupPage"));
const ForgotPasswordPage = lazy(() => import("./pages/ForgotPassword"));
const CompleteProfile = lazy(() => import("./pages/CompleteProfile"));
const CreateCompany = lazy(() => import("./pages/CreateCompany"));
const AcceptInvitePage = lazy(() => import("./pages/AcceptInvitePage"));
const LandingPage = lazy(() => import("./pages/LandingPage"));
const MyTasksPage = lazy(() =>
  import("./pages/MyTasks/MyTasksPage").then((module) => ({
    default: module.MyTasksPage,
  })),
);

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader className="animate-spin" />
    </div>
  );
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { currentUser, loading, authStatus } = useAuthContext();

  if (loading) {
    return <PageLoader />;
  }

  return currentUser ? (
    <Navigate
      to={
        authStatus?.access === "team_member" || authStatus?.access === "member"
          ? "/mytasks"
          : "/dashboard"
      }
      replace
    />
  ) : (
    <>{children}</>
  );
}

function AdminOnlyRoute({ children }: { children: React.ReactNode }) {
  const { loading, authStatus } = useAuthContext();

  if (loading || !authStatus) {
    return <PageLoader />;
  }

  if (authStatus.access === "team_member" || authStatus.access === "member") {
    return <Navigate to="/mytasks" replace />;
  }

  return <>{children}</>;
}

function DashboardRoute({ children }: { children: React.ReactNode }) {
  const { loading, authStatus } = useAuthContext();

  if (loading || !authStatus) {
    return <PageLoader />;
  }

  if (authStatus.access === "team_member" || authStatus.access === "member") {
    return <Navigate to="/mytasks" replace />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <MotionConfig
      reducedMotion="user"
      transition={{ duration: 0.22, ease: [0, 0, 0.2, 1] }}
    >
      <AuthProvider>
        <UserProvider>
          <UploadStatusProvider>
            <PostHogProvider>
              <Toaster position="top-center" richColors />
              <AppWithAuth />
            </PostHogProvider>
          </UploadStatusProvider>
        </UserProvider>
      </AuthProvider>
    </MotionConfig>
  );
}

function AppProvidersLayout() {
  return (
    <WorkspaceProvider>
      <AppContextProvider>
        <Layout />
      </AppContextProvider>
    </WorkspaceProvider>
  );
}

function AppWithAuth() {
  const { currentUser, authStatus, loading } = useAuthContext();

  const homeElement = loading ? (
    <PageLoader />
  ) : currentUser ? (
    <Navigate
      to={
        authStatus?.access === "team_member" || authStatus?.access === "member"
          ? "/mytasks"
          : "/dashboard"
      }
      replace
    />
  ) : (
    <LandingPage />
  );

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />
        <Route
          path="/signup"
          element={
            <PublicRoute>
              <SignUpPage />
            </PublicRoute>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <PublicRoute>
              <ForgotPasswordPage />
            </PublicRoute>
          }
        />
        <Route path="/invite/accept/:token" element={<AcceptInvitePage />} />

        <Route path="/" element={homeElement} />

        <Route element={<AuthGuard />}>
          <Route path="/onboarding/profile" element={<CompleteProfile />} />
          <Route path="/onboarding/company" element={<CreateCompany />} />

          <Route element={<AppProvidersLayout />}>
            <Route
              path="dashboard"
              element={
                <DashboardRoute>
                  <Dashboard />
                </DashboardRoute>
              }
            />
            <Route path="projects" element={<Projects />} />
            <Route path="chat" element={<Chat />} />
            <Route path="notepad" element={<Notepad />} />
            <Route
              path="tools"
              element={
                <AdminOnlyRoute>
                  <Tools />
                </AdminOnlyRoute>
              }
            />
            <Route path="settings" element={<Settings />} />
            <Route
              path="workspace-manager"
              element={
                <AdminOnlyRoute>
                  <WorkspaceManager />
                </AdminOnlyRoute>
              }
            />
            <Route path="mytasks" element={<MyTasksPage />} />
            <Route path="projectdetails/:id" element={<ProjectDetailWrapper />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export default App;

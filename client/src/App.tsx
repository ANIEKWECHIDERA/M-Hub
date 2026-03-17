import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthContext } from "@/context/AuthContext";
import Layout from "./Layout";
import Dashboard from "./pages/DashBoard";
import Projects from "./pages/Projects";
import Chat from "./pages/Chat";
import Notepad from "./pages/Notepad";
import Tools from "./pages/Tools";
import Settings from "./pages/Settings";
import ProjectDetailWrapper from "./pages/projectDetail/ProjectDetailWrapper";
import { AppContextProvider } from "./context/AppProvider";
import LoginPage from "./pages/LoginPage";
import SignUpPage from "./pages/SignupPage";
import { AuthProvider } from "./context/AuthContext";
import ForgotPasswordPage from "./pages/ForgotPassword";
import CompleteProfile from "./pages/CompleteProfile";
import { UserProvider } from "./context/UserContext";
import { Toaster } from "./components/ui/sonner";
import { MyTasksPage } from "./pages/MyTasks/MyTasksPage";
import { AuthGuard } from "./components/auth/AuthGuard";
import CreateCompany from "./pages/CreateCompany";
import { Loader } from "lucide-react";
import AcceptInvitePage from "./pages/AcceptInvitePage";
import { UploadStatusProvider } from "./context/UploadStatusContext";

function useRedirectPath() {
  const { currentUser, authStatus } = useAuthContext();

  if (!currentUser) {
    return "/signup";
  }

  return authStatus?.access === "team_member" ||
    authStatus?.access === "member"
    ? "/mytasks"
    : "/dashboard";
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { currentUser, loading, authStatus } = useAuthContext();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader className="animate-spin" />
      </div>
    );
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
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader className="animate-spin" />
      </div>
    );
  }

  if (authStatus.access === "team_member" || authStatus.access === "member") {
    return <Navigate to="/mytasks" replace />;
  }

  return <>{children}</>;
}

function DashboardRoute({ children }: { children: React.ReactNode }) {
  const { loading, authStatus } = useAuthContext();

  if (loading || !authStatus) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader className="animate-spin" />
      </div>
    );
  }

  if (authStatus.access === "team_member" || authStatus.access === "member") {
    return <Navigate to="/mytasks" replace />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <AuthProvider>
      <UserProvider>
        <UploadStatusProvider>
          <Toaster position="top-center" richColors />
          <AppWithAuth />
        </UploadStatusProvider>
      </UserProvider>
    </AuthProvider>
  );
}

function AppProvidersLayout() {
  return (
    <AppContextProvider>
      <Layout />
    </AppContextProvider>
  );
}

function AppWithAuth() {
  const redirectPath = useRedirectPath();

  return (
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

      <Route path="/" element={<Navigate to={redirectPath} replace />} />

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
          <Route path="mytasks" element={<MyTasksPage />} />
          <Route path="projectdetails/:id" element={<ProjectDetailWrapper />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to={redirectPath} replace />} />
    </Routes>
  );
}

export default App;

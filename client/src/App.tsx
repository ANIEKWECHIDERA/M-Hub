import { Routes, Route, Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthContext } from "@/context/AuthContext";
import Layout from "./Layout";
import Dashboard from "./pages/DashBoard";
import Projects from "./pages/Projects";
import Chat from "./pages/Chat";
import Notepad from "./pages/Notepad";
import Tools from "./pages/Tools";
import Settings from "./pages/Settings";
import ProjectDetailWrapper from "./pages/projectDetail/ProjectDetailWrapper";
// import MyTasksPage from "./pages/MyTasks";
import { AppContextProvider } from "./context/AppProvider";
import LoginPage from "./pages/LoginPage";
import SignUpPage from "./pages/SignupPage";
import { AuthProvider } from "./context/AuthContext";
import ForgotPasswordPage from "./pages/ForgotPassword";
import CompleteProfile from "./pages/CompleteProfile";
import { UserProvider, useUser } from "./context/UserContext";
import { Toaster } from "./components/ui/sonner";
import { MyTasksPage } from "./pages/MyTasks/MyTasksPage";
import CreateCompany from "./pages/CreateCompany";

// Protected Route: Only authenticated users
function useRedirectPath() {
  const { currentUser } = useAuthContext();
  return currentUser ? "/dashboard" : "/signup";
}
function ProtectedRoute() {
  const { currentUser, loading } = useAuthContext();
  const { profile, loading: profileLoading } = useUser();
  const location = useLocation();

  if (loading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  const onCompleteProfile = location.pathname === "/complete-profile";
  const onCreateCompany = location.pathname === "/create-company";

  console.log("ProtectedRoute - currentUser:", profile);

  if (!profile?.profile_complete && !onCompleteProfile) {
    return <Navigate to="/complete-profile" replace />;
  }

  if (profile?.profile_complete && !profile?.has_company && !onCreateCompany) {
    return <Navigate to="/create-company" replace />;
  }

  return <Outlet />;
}

// Public Route: Only unauthenticated users (blocks logged-in users)
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { currentUser, loading } = useAuthContext();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return currentUser ? <Navigate to="/dashboard" replace /> : <>{children}</>;
}

function App() {
  return (
    <AuthProvider>
      <UserProvider>
        <Toaster position="top-center" richColors />
        <AppWithAuth /> {/* New component that uses hooks */}
      </UserProvider>
    </AuthProvider>
  );
}

function AppWithAuth() {
  const redirectPath = useRedirectPath(); // now safe
  return (
    <AppContextProvider>
      <Routes>
        {/* Public Routes */}
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

        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* Protected Routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/complete-profile" element={<CompleteProfile />} />
          <Route path="/create-company" element={<CreateCompany />} />
          <Route element={<Layout />}>
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="projects" element={<Projects />} />
            <Route path="chat" element={<Chat />} />
            <Route path="notepad" element={<Notepad />} />
            <Route path="tools" element={<Tools />} />
            <Route path="settings" element={<Settings />} />
            {/* <Route path="mytasks" element={<MyTasksPage />} /> */}
            <Route path="mytasks" element={<MyTasksPage />} />
            <Route
              path="projectdetails/:id"
              element={<ProjectDetailWrapper />}
            />
          </Route>
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to={redirectPath} replace />} />
      </Routes>
    </AppContextProvider>
  );
}

export default App;

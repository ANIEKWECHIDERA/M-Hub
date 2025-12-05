import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import { useAuthContext } from "@/context/AuthContext";
import Layout from "./Layout";
import Dashboard from "./pages/DashBoard";
import Projects from "./pages/Projects";
import Chat from "./pages/Chat";
import Notepad from "./pages/Notepad";
import Tools from "./pages/Tools";
import Settings from "./pages/Settings";
import ProjectDetailWrapper from "./pages/projectDetail/ProjectDetailWrapper";
import MyTasksPage from "./pages/MyTasks";
import { AppContextProvider } from "./context/AppProvider";
import LoginPage from "./pages/LoginPage";
import SignUpPage from "./pages/SignupPage";
import { AuthProvider } from "./context/AuthContext";

// Protected Route: Only authenticated users
function ProtectedRoute() {
  const { currentUser, loading } = useAuthContext();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return currentUser ? <Outlet /> : <Navigate to="/signup" replace />;
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
      <AppContextProvider>
        <Routes>
          {/* Public Routes: Only for guests */}
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

          {/* Default redirect for root */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* Protected Routes: Only for logged-in users */}
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="projects" element={<Projects />} />
              <Route path="chat" element={<Chat />} />
              <Route path="notepad" element={<Notepad />} />
              <Route path="tools" element={<Tools />} />
              <Route path="settings" element={<Settings />} />
              <Route path="mytasks" element={<MyTasksPage />} />
              <Route
                path="projectdetails/:id"
                element={<ProjectDetailWrapper />}
              />
            </Route>
          </Route>

          {/* Catch-all: Redirect to dashboard if authenticated, else signup */}
          <Route
            path="*"
            element={
              <Navigate
                to={(state) => {
                  const { currentUser } = useAuthContext();
                  return currentUser ? "/dashboard" : "/login";
                }}
                replace
              />
            }
          />
        </Routes>
      </AppContextProvider>
    </AuthProvider>
  );
}

export default App;

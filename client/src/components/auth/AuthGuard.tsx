import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthContext } from "@/context/AuthContext";
import { Loader } from "lucide-react";

export const AuthGuard = () => {
  const { currentUser, authStatus, loading } = useAuthContext();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader className="animate-spin" />
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (!authStatus) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader className="animate-spin" />
      </div>
    );
  }

  const state = authStatus.onboardingState;
  const isProfilePage = location.pathname.startsWith("/onboarding/profile");
  const isCompanyPage = location.pathname.startsWith("/onboarding/company");

  if (state === "AUTHENTICATED_NO_PROFILE" && !isProfilePage) {
    return <Navigate to="/onboarding/profile" replace />;
  }

  if (state === "PROFILE_COMPLETE_NO_COMPANY" && !isCompanyPage) {
    return <Navigate to="/onboarding/company" replace />;
  }

  return <Outlet />;
};

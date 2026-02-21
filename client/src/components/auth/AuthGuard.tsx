import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthContext } from "@/context/AuthContext";
import { Loader } from "lucide-react";

export const AuthGuard = () => {
  const { currentUser, authStatus, loading } = useAuthContext();
  const location = useLocation();

  // 1️⃣ Still resolving Firebase + backend sync
  if (loading || authStatus === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader className="animate-spin" />
      </div>
    );
  }

  // 2️⃣ Not authenticated → go to login
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  const state = authStatus.onboardingState;

  const isProfilePage = location.pathname.startsWith("/onboarding/profile");
  const isCompanyPage = location.pathname.startsWith("/onboarding/company");

  // 3️⃣ Enforce onboarding
  if (state === "AUTHENTICATED_NO_PROFILE" && !isProfilePage) {
    return <Navigate to="/onboarding/profile" replace />;
  }

  if (state === "PROFILE_COMPLETE_NO_COMPANY" && !isCompanyPage) {
    return <Navigate to="/onboarding/company" replace />;
  }

  console.log("AUTH GUARD RUNNING", {
    user: currentUser?.uid,
    state: authStatus?.onboardingState,
    path: location.pathname,
    authStatus,
  });

  // 4️⃣ Fully active → allow
  return <Outlet />;
};

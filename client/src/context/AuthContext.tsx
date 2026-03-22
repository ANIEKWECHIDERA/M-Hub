import {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
} from "react";
import {
  auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  signInWithPopup,
  googleProvider,
} from "../firebase/firebase";
import type { AuthContextType, AuthStatus } from "@/Types/types";
import type { User } from "firebase/auth";
import { API_CONFIG } from "@/lib/api";
import { authAPI } from "@/api/auth.api";

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuthContext = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthContext must be used within AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null);
  const [isWorkspaceSwitching, setIsWorkspaceSwitching] = useState(false);
  const [workspaceSwitchCompanyId, setWorkspaceSwitchCompanyId] = useState<
    string | null
  >(null);

  const clearError = () => setError(null);

  const isAppReady =
    !!currentUser && !!authStatus && authStatus.onboardingState === "ACTIVE";

  const fetchToken = useCallback(async (firebaseUser: User) => {
    const token = await firebaseUser.getIdToken();
    setIdToken(token);
    return token;
  }, []);

  const syncUser = useCallback(async (user: User | null) => {
    if (!user) {
      setCurrentUser(null);
      setIdToken(null);
      setAuthStatus(null);
      setIsWorkspaceSwitching(false);
      setWorkspaceSwitchCompanyId(null);
      return;
    }

    try {
      const token = await user.getIdToken();
      setIdToken(token);
      setCurrentUser(user);

      const status = await authAPI.getStatus(token);
      setAuthStatus(status);
    } catch (err) {
      console.error("Auth sync failed:", err);
      setAuthStatus(null);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = auth.onIdTokenChanged(async (user) => {
      await syncUser(user);
      setInitialLoading(false);
    });

    return () => unsubscribe();
  }, [syncUser]);

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    const interval = window.setInterval(async () => {
      const freshToken = await currentUser.getIdToken(true);
      setIdToken(freshToken);
    }, 50 * 60 * 1000);

    return () => window.clearInterval(interval);
  }, [currentUser]);

  const refreshStatus = async () => {
    if (!currentUser) return;

    const freshToken = await currentUser.getIdToken();
    setIdToken(freshToken);

    const res = await fetch(`${API_CONFIG.backend}/api/status`, {
      headers: { Authorization: `Bearer ${freshToken}` },
      method: "GET",
    });

    if (!res.ok) return;

    const data = await res.json();
    setAuthStatus(data);
  };

  const signUp = async (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    termsAccepted: boolean,
  ) => {
    let uidToDelete: string | null = null;

    try {
      clearError();
      setAuthLoading(true);

      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );

      const token = await fetchToken(userCredential.user);
      uidToDelete = userCredential.user.uid;

      const res = await authAPI.createProfile(
        { firstName, lastName, email, termsAccepted },
        token,
      );

      if (!res?.success) {
        throw new Error("Failed to create user profile");
      }

      return {
        user: userCredential.user,
        error: null,
        uidToDeleteOnError: null,
      };
    } catch (err: any) {
      let message = err.message;

      if (err.code === "auth/email-already-in-use") {
        message = "This email has already been used.";
      } else if (err.code === "auth/invalid-email") {
        message = "Please enter a valid email address.";
      } else if (err.code === "auth/weak-password") {
        message = "Your password is too weak. Please use a stronger password.";
      } else if (err.code === "auth/too-many-requests") {
        message = "Too many requests. Please try again later.";
      } else if (err.code === "auth/network-request-failed") {
        message = "Please check your network connection and try again";
      }

      setError(message);
      return { user: null, error: message, uidToDeleteOnError: uidToDelete };
    } finally {
      setAuthLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      clearError();
      setAuthLoading(true);

      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password,
      );

      const pendingInviteToken = localStorage.getItem("pendingInviteToken");
      if (pendingInviteToken) {
        localStorage.removeItem("pendingInviteToken");
      }

      return { user: userCredential.user, idToken: null, error: null };
    } catch (err: any) {
      let message = err.message;

      if (err.code === "auth/user-not-found") {
        message = "No account found with this email.";
      } else if (err.code === "auth/wrong-password") {
        message = "Incorrect password or email. Please try again.";
      } else if (err.code === "auth/invalid-email") {
        message = "Incorrect password or email. Please try again.";
      } else if (err.code === "auth/too-many-requests") {
        message = "Too many login attempts. Please try again later.";
      } else if (err.code === "auth/user-disabled") {
        message = "This account has been disabled. Please contact support.";
      } else if (err.code === "auth/invalid-credential") {
        message = "Incorrect password or email. Please try again.";
      }

      setError(message);
      return { user: null, idToken: null, error: message };
    } finally {
      setAuthLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    try {
      clearError();

      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const token = await fetchToken(user);

      await authAPI.sync(token);
      return result;
    } catch (err: any) {
      setError(err.message);
    }
  };

  const logout = async () => {
    try {
      setAuthLoading(true);

      if (idToken) await authAPI.logout(idToken);

      await signOut(auth);

      setCurrentUser(null);
      setAuthStatus(null);
      setIdToken(null);
      setIsWorkspaceSwitching(false);
      setWorkspaceSwitchCompanyId(null);
    } finally {
      setAuthLoading(false);
    }
  };

  const startWorkspaceSwitch = (companyId: string) => {
    setWorkspaceSwitchCompanyId(companyId);
    setIsWorkspaceSwitching(true);
  };

  const finishWorkspaceSwitch = () => {
    setIsWorkspaceSwitching(false);
    setWorkspaceSwitchCompanyId(null);
  };

  const value: AuthContextType = {
    isAppReady,
    authStatus,
    refreshStatus,
    currentUser,
    loading: authLoading,
    error,
    signUp,
    signIn,
    signInWithGoogle,
    logout,
    clearError,
    idToken,
    isWorkspaceSwitching,
    workspaceSwitchCompanyId,
    startWorkspaceSwitch,
    finishWorkspaceSwitch,
  };

  return (
    <AuthContext.Provider value={value}>
      {!initialLoading && children}
    </AuthContext.Provider>
  );
};

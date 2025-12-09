import { createContext, useState, useContext, useEffect } from "react";
import {
  auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  signInWithPopup,
  googleProvider,
} from "../firebase/firebase";
import type { AuthContextType } from "@/Types/types";
import type { User } from "firebase/auth";
import { API_CONFIG } from "@/lib/api";
import { toast } from "sonner";

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

  // Clear error utility
  const clearError = () => setError(null);

  const signUp = async (email: string, password: string) => {
    try {
      clearError();
      setAuthLoading(true);
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      return userCredential.user;
    } catch (err: any) {
      setError(err.message);
      return null;
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
        password
      );
      return userCredential.user;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setAuthLoading(false);
    }
  };

  // Google Sign-In (popup)
  const signInWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      const name =
        user.displayName ?? user.providerData?.[0]?.displayName ?? null;
      const email = user.email ?? user.providerData?.[0]?.email ?? null;

      // fetch ID token
      const idToken = await user.getIdToken();
      setIdToken(idToken);
      // console.log("ID Token:", idToken);

      // send to backend to sync
      await fetch(`${API_CONFIG.backend}/api/sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ name, email, avatar: user.photoURL ?? null }),
      });

      return result;
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Google Sign-Up (same function as sign-in, but you may rename it)
  const signUpWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const idToken = await user.getIdToken();

      // Sync basic data
      await fetch(`${API_CONFIG.backend}/api/sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          name: user.displayName,
          email: user.email,
          avatar: user.photoURL,
        }),
      });

      // Check if profile is incomplete → trigger popup
      const profileRes = await fetch(`${API_CONFIG.backend}/api/user`, {
        headers: { Authorization: `Bearer ${idToken}` },
      });

      if (profileRes.ok) {
        const { profile } = await profileRes.json();
        const isIncomplete = !profile.first_name || !profile.last_name;

        if (isIncomplete) {
          setTimeout(() => {
            const opened = window.open(
              `/complete-profile?token=${idToken}`,
              "completeProfile",
              "width=500,height=600"
            );

            if (!opened || opened.closed) {
              toast.error("Please allow popups to complete your profile", {
                action: {
                  label: "Open Form",
                  onClick: () => (window.location.href = "/complete-profile"),
                },
              });
            }
          }, 2000);
        }
      }

      return result;
    } catch (err: any) {
      setError(err.message);
    }
  };

  const logout = async () => {
    try {
      clearError();
      await signOut(auth);
      setIdToken(null);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Listen for login/logout/auth changes
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setInitialLoading(false);
      if (user) {
        user.getIdToken().then((token) => {
          setIdToken(token); // Get the ID token on initial load
        });
      } else {
        setIdToken(null);
      }
    });

    const unsubscribeToken = auth.onIdTokenChanged(async (user) => {
      if (user) {
        const newToken = await user.getIdToken();
        setIdToken(newToken); // Update the ID token if it changes
      } else {
        setIdToken(null); // Clear ID token when user is logged out
      }
    });

    return () => {
      unsubscribeAuth();
      unsubscribeToken(); // Clean up both listeners on component unmount
    };
  }, []);

  const value: AuthContextType = {
    currentUser,
    loading: authLoading,
    error,
    signUp,
    signIn,
    signInWithGoogle,
    signUpWithGoogle,
    logout,
    clearError,
    idToken,
  };

  return (
    <AuthContext.Provider value={value}>
      {!initialLoading && children}
    </AuthContext.Provider>
  );
};

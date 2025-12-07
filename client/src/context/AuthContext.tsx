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

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuthContext = () => useContext(AuthContext)!;

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

      // send to backend to sync
      await fetch(`${API_CONFIG}/api/sync`, {
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
      return result;
    } catch (err: any) {
      setError(err.message);
    }
  };

  const logout = async () => {
    try {
      clearError();
      await signOut(auth);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Listen for login/logout/auth changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setInitialLoading(false);
    });

    return unsubscribe;
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
  };

  return (
    <AuthContext.Provider value={value}>
      {!initialLoading && children}
    </AuthContext.Provider>
  );
};

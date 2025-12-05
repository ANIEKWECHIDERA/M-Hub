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

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuthContext = () => useContext(AuthContext)!;

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Clear error utility
  const clearError = () => setError(null);

  const signUp = async (email: string, password: string) => {
    try {
      clearError();
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      return userCredential.user;
    } catch (err: any) {
      setError(err.message);
      return null;
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      clearError();
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      return userCredential.user;
    } catch (err: any) {
      setError(err.message);
      return null;
    }
  };

  // Google Sign-In (popup)
  const signInWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
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
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value: AuthContextType = {
    currentUser,
    loading,
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
      {!loading && children}
    </AuthContext.Provider>
  );
};

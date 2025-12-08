// src/context/UserContext.tsx
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { useAuthContext } from "./AuthContext";
import type { UserContextType, UserProfile } from "@/Types/types";
import { API_CONFIG } from "@/lib/api";

const UserContext = createContext<UserContextType>({
  profile: null,
  loading: true,
  updateProfile: async () => false,
  deleteAccount: async () => false,
});

export const useUser = () => useContext(UserContext);

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const { currentUser, idToken } = useAuthContext();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Placeholder for future Supabase fetch
  const fetchUserProfile =
    useCallback(async (): Promise<UserProfile | null> => {
      if (!idToken) return null;

      try {
        const res = await fetch(`${API_CONFIG.backend}/api/users/me`, {
          headers: { Authorization: `Bearer ${idToken}` },
        });

        if (!res.ok) throw new Error("Failed to fetch");

        const { profile: data } = await res.json();

        return {
          id: data.id,
          firebaseUid: data.firebase_uid,
          email: data.email,
          displayName: data.display_name || currentUser?.displayName || "User",
          photoURL: data.photo_url || currentUser?.photoURL,
          firstName: data.first_name,
          lastName: data.last_name,
          role: data.role,
          companyId: data.company_id,
          lastLogin: data.last_login ? new Date(data.last_login) : undefined,
          createdAt: data.created_at ? new Date(data.created_at) : undefined,
          updatedAt: data.updated_at ? new Date(data.updated_at) : undefined,
        };
      } catch (err) {
        console.error("fetchProfile error:", err);
        return null;
      }
    }, [idToken, currentUser]);

  useEffect(() => {
    if (!currentUser) {
      setProfile(null);
      setLoading(false);
      return;
    }

    const loadProfile = useCallback(async () => {
      setLoading(true);
      const data = await fetchUserProfile();
      setProfile(
        data || {
          id: currentUser?.uid,
          firebaseUid: currentUser?.uid,
          displayName: currentUser?.displayName || "User",
          email: currentUser?.email || "",
          photoURL: currentUser?.photoURL ?? undefined, // Ensure `photoURL` is either a string or undefined
          firstName: currentUser?.displayName?.split(" ")[0] ?? undefined, // You can infer firstName if needed
          lastName: currentUser?.displayName?.split(" ")[1] ?? undefined, // Same for lastName if needed
        }
      );
      setLoading(false);
    }, [fetchUserProfile, currentUser]);

    loadProfile();
  }, [currentUser]);

  const updateProfile = useCallback(
    async (updates: Partial<UserProfile>): Promise<boolean> => {
      if (!idToken) return false;

      try {
        const res = await fetch(`${API_CONFIG.backend}/api/users/me`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify(updates),
        });

        if (!res.ok) throw new Error("Update failed");

        const { profile: updated } = await res.json();
        setProfile((prev) => ({ ...prev!, ...updated }));
        return true;
      } catch (err) {
        console.error("updateProfile error:", err);
        return false;
      }
    },
    [idToken]
  );

  const deleteAccount = useCallback(async (): Promise<boolean> => {
    if (!idToken || !confirm("Delete your account? This cannot be undone."))
      return false;

    try {
      const res = await fetch(`${API_CONFIG.backend}/api/users/me`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${idToken}` },
      });

      if (!res.ok) throw new Error("Delete failed");

      setProfile(null);
      return true;
    } catch (err) {
      console.error("deleteAccount error:", err);
      return false;
    }
  }, [idToken]);

  const value: UserContextType = {
    profile,
    loading,
    updateProfile,
    deleteAccount /*, refreshProfile */,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

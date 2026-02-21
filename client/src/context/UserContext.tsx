import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { useAuthContext } from "./AuthContext";
import type { UserContextType, UserProfile } from "@/Types/types";
import { API_CONFIG } from "@/lib/api";

const UserContext = createContext<UserContextType>({
  profile: null,
  loading: true,
  updateProfile: async () => false,
  deleteAccount: async () => false,
  fetchUserProfile: async () => null,
  setProfile: () => {},
});

export const useUser = () => useContext(UserContext);

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const { currentUser, idToken } = useAuthContext();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Helps prevent stale async overwrites
  const requestIdRef = useRef(0);

  const buildFallbackProfile = useCallback((): UserProfile | null => {
    if (!currentUser) return null;

    return {
      id: currentUser.uid,
      firebaseUid: currentUser.uid,
      displayName: currentUser.displayName || "User",
      email: currentUser.email || "",
      photoURL: currentUser.photoURL ?? undefined,
      first_name: currentUser.displayName?.split(" ")[0],
      last_name: currentUser.displayName?.split(" ")[1],
      role: undefined,
      company_id: undefined,
    } as UserProfile;
  }, [currentUser]);

  const fetchUserProfile = useCallback(
    async (token: string): Promise<UserProfile | null> => {
      try {
        const res = await fetch(`${API_CONFIG.backend}/api/user`, {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          if (res.status === 404) return null;
          throw new Error(`Fetch failed: ${res.statusText}`);
        }

        const { profile: data } = await res.json();

        return {
          id: data.id,
          firebaseUid: data.firebase_uid,
          email: data.email,
          displayName: data.display_name || currentUser?.displayName || "User",
          photoURL: data.photo_url || currentUser?.photoURL,
          first_name: data.first_name,
          last_name: data.last_name,
          role: data.role,
          company_id: data.company_id,
          lastLogin: data.last_login ? new Date(data.last_login) : undefined,
          createdAt: data.created_at ? new Date(data.created_at) : undefined,
          updatedAt: data.updated_at ? new Date(data.updated_at) : undefined,
        };
      } catch (err) {
        console.error("fetchUserProfile error:", err);
        return null;
      }
    },
    [currentUser],
  );

  const loadProfile = useCallback(async () => {
    if (!currentUser || !idToken) return;

    setLoading(true);

    const requestId = ++requestIdRef.current;

    const data = await fetchUserProfile(idToken);

    // Ignore stale responses
    if (requestId !== requestIdRef.current) return;

    setProfile(data ?? buildFallbackProfile());
    setLoading(false);
  }, [currentUser, idToken, fetchUserProfile, buildFallbackProfile]);

  useEffect(() => {
    if (!currentUser) {
      requestIdRef.current++;
      setProfile(null);
      setLoading(false);
      return;
    }

    if (!idToken) {
      setLoading(true);
      return;
    }

    loadProfile();
  }, [currentUser, idToken, loadProfile]);

  const updateProfile = useCallback(
    async (updates: Partial<UserProfile>): Promise<boolean> => {
      if (!idToken) return false;

      try {
        const res = await fetch(`${API_CONFIG.backend}/api/user`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify(updates),
        });

        if (!res.ok) throw new Error("Update failed");

        const { profile: updated } = await res.json();

        setProfile((prev) => (prev ? { ...prev, ...updated } : prev));

        return true;
      } catch (err) {
        console.error("updateProfile error:", err);
        return false;
      }
    },
    [idToken],
  );

  const deleteAccount = useCallback(async (): Promise<boolean> => {
    if (!idToken || !confirm("Delete your account? This cannot be undone."))
      return false;

    try {
      const res = await fetch(`${API_CONFIG.backend}/api/user`, {
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
    deleteAccount,
    fetchUserProfile,
    setProfile,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

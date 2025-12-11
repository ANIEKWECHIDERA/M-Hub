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
  fetchUserProfile: async () => null,
  setProfile: () => {},
});

export const useUser = () => useContext(UserContext);

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const { currentUser, idToken } = useAuthContext();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // console.log("UserProvider: currentUser:", currentUser); // Log Firebase user data
  // console.log("UserProvider: idToken present?", !!idToken); // Check if token is available

  const fetchUserProfile =
    useCallback(async (): Promise<UserProfile | null> => {
      // console.log(
      //   "fetchUserProfile() CALLED - idToken:",
      //   idToken ? "YES" : "NO"
      // );
      // if (!idToken) {
      //   console.log("fetchUserProfile: No idToken, skipping fetch");
      //   return null;
      // }

      try {
        const res = await fetch(`${API_CONFIG.backend}/api/user`, {
          method: "GET",
          headers: { Authorization: `Bearer ${idToken}` },
        });
        // console.log("Making GET request to:", `${API_CONFIG.backend}/api/user`);
        // console.log("fetchUserProfile: Response status:", res.status); // Log status

        if (!res.ok) {
          if (res.status === 404) {
            console.log(
              "fetchUserProfile: 404 - Profile not found. Consider creating one."
            );
            // Optional: Auto-create profile if 404 (uncomment if desired)
            // await createProfileIfMissing();
          }
          throw new Error(`Failed to fetch: ${res.statusText}`);
        }

        const { profile: data } = await res.json();
        // console.log("Fetched user profile:", data);

        return {
          id: data.id,
          firebaseUid: data.firebase_uid,
          email: data.email,
          displayName: data.display_name || currentUser?.displayName || "User",
          photoURL: data.photo_url || currentUser?.photoURL,
          first_name: data.first_name,
          last_name: data.last_name,
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

  // Optional auto-create function (if you uncomment above)
  // const createProfileIfMissing = async () => {
  //   if (!currentUser) return;
  //   try {
  //     const res = await fetch(`${API_CONFIG.backend}/api/user`, {
  //       method: "POST",
  //       headers: {
  //         "Content-Type": "application/json",
  //         Authorization: `Bearer ${idToken}`,
  //       },
  //       body: JSON.stringify({
  //         firstName: currentUser.displayName?.split(" ")[0] || "",
  //         lastName: currentUser.displayName?.split(" ")[1] || "",
  //         email: currentUser.email,
  //         firebase_uid: currentUser.uid,
  //       }),
  //     });
  //     if (res.ok) {
  //       console.log("createProfileIfMissing: Profile created successfully");
  //     }
  //   } catch (err) {
  //     console.error("createProfileIfMissing error:", err);
  //   }
  // };

  const loadProfile = useCallback(async () => {
    setLoading(true);
    const data = await fetchUserProfile();

    const newProfile = data || {
      id: currentUser?.uid ?? "",
      firebaseUid: currentUser?.uid ?? "",
      displayName: currentUser?.displayName || "User",
      email: currentUser?.email || "",
      photoURL: currentUser?.photoURL ?? undefined,
      firstName: currentUser?.displayName?.split(" ")[0] ?? undefined,
      lastName: currentUser?.displayName?.split(" ")[1] ?? undefined,
    };
    setProfile(newProfile);
    // console.log("loadProfile: Set profile to:", newProfile); // Log final profile

    setLoading(false);
  }, [fetchUserProfile, currentUser]);

  useEffect(() => {
    // console.log("useEffect: currentUser changed:", currentUser); // Log on user change
    // console.log("UserProvider useEffect - currentUser:", !!currentUser);
    // console.log("UserProvider useEffect - idToken ready:", !!idToken);
    if (!currentUser) {
      // console.log("No Firebase user → clearing profile");
      setProfile(null);
      setLoading(false);
      return;
    }

    if (!idToken) {
      // console.log("Firebase user exists but idToken missing → waiting...");
      setLoading(true);
      return;
    }
    // console.log("Both user + token ready → fetching profile from backend");
    loadProfile();
  }, [currentUser, loadProfile, idToken]); // Added loadProfile to deps for safety

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

        // console.log("updateProfile: Response status:", res.status);

        if (!res.ok) throw new Error("Update failed");

        const { profile: updated } = await res.json();
        setProfile((prev) => ({ ...prev!, ...updated }));
        console.log("updateProfile: Updated profile:", updated);
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
      const res = await fetch(`${API_CONFIG.backend}/api/user`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${idToken}` },
      });

      // console.log("deleteAccount: Response status:", res.status);

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
    fetchUserProfile,
    setProfile,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

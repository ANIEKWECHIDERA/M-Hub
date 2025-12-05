// src/context/UserContext.tsx
import { createContext, useContext, useState, useEffect } from "react";
import { useAuthContext } from "./AuthContext";

interface UserProfile {
  displayName: string;
  email: string;
  photoURL?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  company?: string;
  // Add any other fields you plan to store in Supabase
  phone?: string;
  bio?: string;
  department?: string;
}

interface UserContextType {
  profile: UserProfile | null;
  loading: boolean;
  refreshProfile?: () => Promise<void>; // Optional: manual refresh
}

const UserContext = createContext<UserContextType>({
  profile: null,
  loading: true,
});

export const useUser = () => useContext(UserContext);

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const { currentUser } = useAuthContext();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Placeholder for future Supabase fetch
  const fetchUserProfile = async (uid: string) => {
    // TODO: Replace with Supabase when ready
    // Example:
    // const { data, error } = await supabase
    //   .from('profiles')
    //   .select('*')
    //   .eq('id', uid)
    //   .single();

    // For now: Simulate or fallback to Firebase Auth data
    return {
      displayName: currentUser?.displayName || "User",
      email: currentUser?.email || "",
      photoURL: currentUser?.photoURL || undefined,
      firstName: undefined,
      lastName: undefined,
      role: undefined,
      company: undefined,
    };
  };

  useEffect(() => {
    if (!currentUser) {
      setProfile(null);
      setLoading(false);
      return;
    }

    const loadProfile = async () => {
      setLoading(true);
      try {
        const data = await fetchUserProfile(currentUser.uid);

        setProfile({
          displayName: data.displayName || "User",
          email: data.email || "",
          photoURL: data.photoURL,
          firstName: data.firstName,
          lastName: data.lastName,
          role: data.role,
          company: data.company,
          // Add more fields when Supabase is ready
        });
      } catch (error) {
        console.error("Failed to load user profile:", error);
        // Fallback to basic auth data
        setProfile({
          displayName: currentUser.displayName || "User",
          email: currentUser.email || "",
          photoURL: currentUser.photoURL || undefined,
        });
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [currentUser]);

  // Optional: Allow manual refresh (useful after profile update)
  //   const refreshProfile = async () => {
  //     if (!currentUser) return;
  //     setLoading(true);
  //     const data = await fetchUserProfile(currentUser.uid);
  //     setProfile({
  //       displayName: data.displayName || "User",
  //       email: data.email || "",
  //       photoURL: data.photoURL,
  //       ...data,
  //     });
  //     setLoading(false);
  //   };

  return (
    <UserContext.Provider value={{ profile, loading }}>
      {children}
    </UserContext.Provider>
  );
};

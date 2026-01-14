import { teamMembersAPI } from "@/api/teamMember.api";
import type { TeamMember } from "@/Types/types";
import { createContext, useContext, useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuthContext } from "./AuthContext";

const TeamContext = createContext<any>(null);

export const useTeamContext = () => {
  const context = useContext(TeamContext);
  if (!context)
    throw new Error("useTeamContext must be used within TeamProvider");
  return context;
};

export const TeamContextProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { idToken } = useAuthContext();

  const fetchTeamMembers = async () => {
    if (!idToken) {
      setError("Authentication required");
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await teamMembersAPI.getAll(idToken);
      setTeamMembers(data);
    } catch {
      setError("Failed to fetch team members");
    } finally {
      setLoading(false);
    }
  };

  const inviteMember = async (payload: {
    email: string;
    role: string;
    access: "admin" | "team_member";
  }) => {
    if (!idToken) {
      setError("Authentication required");
      setLoading(false);
      return;
    }
    try {
      const member = await teamMembersAPI.invite(payload, idToken);
      setTeamMembers((prev) => [member, ...prev]);
      toast.success("Invite sent successfully");
    } catch {
      toast.error("Failed to invite team member");
    }
  };

  const updateTeamMember = async (id: string, payload: Partial<TeamMember>) => {
    if (!idToken) {
      setError("Authentication required");
      setLoading(false);
      return;
    }
    try {
      const updated = await teamMembersAPI.update(id, payload, idToken);

      setTeamMembers((prev) => prev.map((m) => (m.id === id ? updated : m)));

      toast.success("Team member updated");
    } catch {
      toast.error("Failed to update team member");
    }
  };

  const deleteTeamMember = async (id: string) => {
    if (!idToken) {
      setError("Authentication required");
      setLoading(false);
      return;
    }
    await teamMembersAPI.delete(id, idToken);
    setTeamMembers((prev) => prev.filter((m) => m.id !== id));
    toast.success("Team member removed");
  };

  useEffect(() => {
    fetchTeamMembers();
  }, []);

  return (
    <TeamContext.Provider
      value={{
        teamMembers,
        fetchTeamMembers,
        inviteMember,
        updateTeamMember,
        deleteTeamMember,
        loading,
        error,
      }}
    >
      {children}
    </TeamContext.Provider>
  );
};

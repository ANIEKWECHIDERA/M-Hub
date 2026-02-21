import { teamMembersAPI } from "@/api/teamMember.api";
import type { TeamMember } from "@/Types/types";
import { createContext, useContext, useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuthContext } from "./AuthContext";
import { useUser } from "./UserContext";

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
  const { profile } = useUser();

  const currentMember =
    teamMembers.find((member) => member.user_id === profile?.id) ?? null;

  // console.log(
  //   "CurrentUser:",
  //   profile,
  //   "TeamMembers:",
  //   teamMembers,
  //   "Current Member:",
  //   currentMember,
  // );

  const fetchTeamMembers = async () => {
    if (!idToken) {
      setError("Authentication required");
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await teamMembersAPI.getAll(idToken);
      setTeamMembers(data || []);
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
      throw new Error("No auth token");
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
      throw new Error("No auth token");
    }

    const promise = teamMembersAPI.update(id, payload, idToken);

    toast.promise(promise, {
      loading: "Updating Team member...",
      success: "Team member updated",
      error: "Failed to update Team member",
    });

    const updated = await promise;
    if (!updated) throw new Error("Update failed");

    setTeamMembers((prev) => prev.map((m) => (m.id === id ? updated : m)));
  };

  const deleteTeamMember = async (id: string) => {
    if (!idToken) {
      setError("Authentication required");
      throw new Error("No auth token");
    }

    const promise = teamMembersAPI.delete(id, idToken);
    toast.promise(promise, {
      loading: "Removing Team member...",
      success: "Team member deleted",
      error: "Failed to delete Team member",
    });
    await promise;
    setTeamMembers((prev) => prev.filter((m) => m.id !== id));
  };

  useEffect(() => {
    if (!idToken) return;
    fetchTeamMembers();
  }, [idToken]);

  return (
    <TeamContext.Provider
      value={{
        teamMembers,
        currentMember,
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

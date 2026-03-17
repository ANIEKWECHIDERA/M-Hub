import { teamMembersAPI } from "@/api/teamMember.api";
import { inviteAPI } from "@/api/invite.api";
import type { TeamMember } from "@/Types/types";
import { createContext, useContext, useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuthContext } from "./AuthContext";
import { useUser } from "./UserContext";

const TeamContext = createContext<any>(null);

export const useTeamContext = () => {
  const context = useContext(TeamContext);
  if (!context) {
    throw new Error("useTeamContext must be used within TeamProvider");
  }
  return context;
};

export const TeamContextProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [memberToDelete, setMemberToDelete] = useState<TeamMember | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { idToken, authStatus } = useAuthContext();
  const { profile } = useUser();

  const currentMember =
    teamMembers.find((member) => member.user_id === profile?.id) ?? null;

  const fetchTeamMembers = async () => {
    if (!idToken || !authStatus?.companyId) {
      setTeamMembers([]);
      return;
    }

    setLoading(true);
    setError(null);

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
      throw new Error("No auth token");
    }

    const promise = inviteAPI.create(payload, idToken);

    toast.promise(promise, {
      loading: "Sending invite...",
      success: "Invite sent successfully",
      error: "Failed to send invite",
    });

    await promise;
  };

  const updateTeamMember = async (id: string, payload: Partial<TeamMember>) => {
    if (!idToken) {
      throw new Error("No auth token");
    }

    const promise = teamMembersAPI.update(id, payload, idToken);

    toast.promise(promise, {
      loading: "Updating team member...",
      success: "Team member updated",
      error: "Failed to update team member",
    });

    const updated = await promise;
    if (!updated) {
      throw new Error("Update failed");
    }

    setTeamMembers((prev) => prev.map((m) => (m.id === id ? updated : m)));
  };

  const deleteTeamMember = async (id: string) => {
    if (!idToken) {
      throw new Error("No auth token");
    }

    const promise = teamMembersAPI.delete(id, idToken);

    toast.promise(promise, {
      loading: "Removing team member...",
      success: "Team member deleted",
      error: "Failed to delete team member",
    });

    await promise;
    setTeamMembers((prev) => prev.filter((m) => m.id !== id));
  };

  const confirmDelete = async () => {
    if (!memberToDelete) {
      return;
    }

    await deleteTeamMember(memberToDelete.id);
    setMemberToDelete(null);
    setIsDeleteDialogOpen(false);
  };

  useEffect(() => {
    if (!idToken || authStatus?.onboardingState !== "ACTIVE") {
      return;
    }

    fetchTeamMembers();
  }, [idToken, authStatus?.companyId, authStatus?.onboardingState]);

  useEffect(() => {
    if (!profile?.id) {
      return;
    }

    setTeamMembers((prev) =>
      prev.map((member) =>
        member.user_id === profile.id
          ? {
              ...member,
              name:
                [profile.first_name, profile.last_name]
                  .filter(Boolean)
                  .join(" ") || member.name,
              avatar: profile.photoURL ?? member.avatar,
            }
          : member,
      ),
    );
  }, [profile?.first_name, profile?.id, profile?.last_name, profile?.photoURL]);

  return (
    <TeamContext.Provider
      value={{
        teamMembers,
        setTeamMembers,
        currentMember,
        fetchTeamMembers,
        inviteMember,
        updateTeamMember,
        deleteTeamMember,
        memberToDelete,
        setMemberToDelete,
        isDeleteDialogOpen,
        setIsDeleteDialogOpen,
        confirmDelete,
        loading,
        error,
      }}
    >
      {children}
    </TeamContext.Provider>
  );
};

import { createContext, useContext } from "react";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import type { TeamContextType } from "../Types/types";

const TeamContext = createContext<TeamContextType | null>(null);

export const useTeamContext = () => {
  const context = useContext(TeamContext);
  if (!context) {
    throw new Error("useTeamContext must be used within a TeamProvider");
  }
  return context;
};

export const TeamContextProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const {
    teamMembers,
    setTeamMembers,
    currentMember,
    setCurrentMember,
    fetchTeamMembers,
    addTeamMember,
    updateTeamMember,
    deleteTeamMember,
    loading,
    error,
  } = useTeamMembers();

  const value = {
    teamMembers,
    setTeamMembers,
    currentMember,
    setCurrentMember,
    fetchTeamMembers,
    addTeamMember,
    updateTeamMember,
    deleteTeamMember,
    loading,
    error,
  };

  return <TeamContext.Provider value={value}>{children}</TeamContext.Provider>;
};

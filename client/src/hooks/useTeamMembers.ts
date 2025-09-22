// hooks/useTeamMembers.ts
import { useState, useEffect } from "react";
import type { TeamMember } from "../Types/types";

const mockTeamMembers: TeamMember[] = [
  {
    id: 1,
    name: "John Doe",
    role: "Designer",
    avatar: "/placeholder.svg?height=32&width=32",
  },
  {
    id: 2,
    name: "Sarah Smith",
    role: "Project Manager",
    avatar: "/placeholder.svg?height=32&width=32",
  },
  {
    id: 3,
    name: "Mike Johnson",
    role: "Developer",
    avatar: "/placeholder.svg?height=32&width=32",
  },
];

export function useTeamMembers() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [currentMember, setCurrentMember] = useState<TeamMember | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTeamMembers = async () => {
    setLoading(true);
    try {
      // TODO: Replace with real backend call
      setTeamMembers(mockTeamMembers);
      setError(null);
    } catch (err) {
      setError("Failed to fetch team members.");
    } finally {
      setLoading(false);
    }
  };

  const addTeamMember = async (member: TeamMember) => {
    setTeamMembers((prev) => [...prev, member]);
    // TODO: Save to backend
  };

  const updateTeamMember = async (id: number, data: Partial<TeamMember>) => {
    setTeamMembers((prev) =>
      prev.map((member) => (member.id === id ? { ...member, ...data } : member))
    );
    // TODO: Update in backend
  };

  const deleteTeamMember = async (id: number) => {
    setTeamMembers((prev) => prev.filter((member) => member.id !== id));
    // TODO: Delete from backend
  };

  useEffect(() => {
    fetchTeamMembers();
  }, []);

  return {
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
}

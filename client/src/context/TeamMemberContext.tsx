import { createContext, useContext } from "react";
import { useState, useEffect } from "react";
import type { TeamMember } from "../Types/types";
import type { TeamContextType } from "../Types/types";

const TeamContext = createContext<TeamContextType | null>(null);

export const useTeamContext = () => {
  const context = useContext(TeamContext);
  if (!context) {
    throw new Error("useTeamContext must be used within a TeamProvider");
  }
  return context;
};

const mockTeamMembers: TeamMember[] = [
  {
    id: 1,
    companyId: [1],
    firstname: "John",
    lastname: "Doe",
    email: "john.doe@company.com",
    role: "Designer",
    access: "Team",
    lastlogin: "2023-10-01T10:00:00Z",
    avatar: "/placeholder.svg?height=32&width=32",
    status: "active",
  },
  {
    id: 2,
    companyId: [1],
    firstname: "Sarah",
    lastname: "Smith",
    email: "sarah.smith@company.com",
    role: "Project Manager",
    access: "Team",
    lastlogin: "2023-10-02T11:30:00Z",
    avatar: "/placeholder.svg?height=32&width=32",
    status: "active",
  },
  {
    id: 3,
    companyId: [1],
    firstname: "Mike",
    lastname: "Johnson",
    email: "mike.johnson@company.com",
    role: "CEO",
    access: "Admin",
    lastlogin: "2023-10-03T09:15:00Z",
    avatar: "/placeholder.svg?height=32&width=32",
    status: "active",
  },
  {
    id: 4,
    companyId: [1],
    firstname: "Wale",
    lastname: "Johnson",
    email: "wale.johnson@company.com",
    role: "Developer",
    access: "Admin",
    lastlogin: "2023-10-03T09:15:00Z",
    avatar: "/placeholder.svg?height=32&width=32",
    status: "inactive",
  },
  {
    id: 5,
    companyId: [1],
    firstname: "Emily",
    lastname: "Clark",
    email: "emily.clark@company.com",
    role: "Content Writer",
    access: "Team",
    lastlogin: "2023-10-04T08:20:00Z",
    avatar: "/placeholder.svg?height=32&width=32",
    status: "active",
  },
  {
    id: 6,
    companyId: [1],
    firstname: "Robert",
    lastname: "Nguyen",
    email: "robert.nguyen@company.com",
    role: "Backend Developer",
    access: "Team",
    lastlogin: "2023-10-05T12:45:00Z",
    avatar: "/placeholder.svg?height=32&width=32",
    status: "active",
  },
  {
    id: 7,
    companyId: [1],
    firstname: "Linda",
    lastname: "Perez",
    email: "linda.perez@company.com",
    role: "UI/UX Designer",
    access: "Team",
    lastlogin: "2023-10-06T14:10:00Z",
    avatar: "/placeholder.svg?height=32&width=32",
    status: "inactive",
  },
  {
    id: 8,
    companyId: [1],
    firstname: "James",
    lastname: "Brown",
    email: "james.brown@company.com",
    role: "Frontend Developer",
    access: "Team",
    lastlogin: "2023-10-07T09:30:00Z",
    avatar: "/placeholder.svg?height=32&width=32",
    status: "active",
  },
  {
    id: 9,
    companyId: [1],
    firstname: "Anna",
    lastname: "Khan",
    email: "anna.khan@company.com",
    role: "Marketing Specialist",
    access: "Team",
    lastlogin: "2023-10-08T11:00:00Z",
    avatar: "/placeholder.svg?height=32&width=32",
    status: "active",
  },
  {
    id: 10,
    companyId: [1],
    firstname: "David",
    lastname: "Miller",
    email: "david.miller@company.com",
    role: "Data Analyst",
    access: "Team",
    lastlogin: "2023-10-09T15:00:00Z",
    avatar: "/placeholder.svg?height=32&width=32",
    status: "inactive",
  },
  {
    id: 11,
    companyId: [1],
    firstname: "Sophia",
    lastname: "Lee",
    email: "sophia.lee@company.com",
    role: "QA Engineer",
    access: "Team",
    lastlogin: "2023-10-10T13:15:00Z",
    avatar: "/placeholder.svg?height=32&width=32",
    status: "active",
  },
  {
    id: 12,
    companyId: [1],
    firstname: "Henry",
    lastname: "Garcia",
    email: "henry.garcia@company.com",
    role: "DevOps Engineer",
    access: "Admin",
    lastlogin: "2023-10-11T10:40:00Z",
    avatar: "/placeholder.svg?height=32&width=32",
    status: "active",
  },
  {
    id: 13,
    companyId: [1],
    firstname: "Isabella",
    lastname: "Martinez",
    email: "isabella.martinez@company.com",
    role: "Support Specialist",
    access: "Team",
    lastlogin: "2023-10-12T16:25:00Z",
    avatar: "/placeholder.svg?height=32&width=32",
    status: "active",
  },
  {
    id: 14,
    companyId: [1],
    firstname: "Daniel",
    lastname: "Anderson",
    email: "daniel.anderson@company.com",
    role: "Business Analyst",
    access: "Team",
    lastlogin: "2023-10-13T14:50:00Z",
    avatar: "/placeholder.svg?height=32&width=32",
    status: "inactive",
  },
];

export const TeamContextProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [currentMember, setCurrentMember] = useState<TeamMember | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [memberToDelete, setMemberToDelete] = useState<TeamMember | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
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

  const confirmDelete = () => {
    if (memberToDelete) {
      deleteTeamMember(memberToDelete.id);
      setMemberToDelete(null);
      setIsDeleteDialogOpen(false);
    }
  };

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
    confirmDelete,
    memberToDelete,
    setMemberToDelete,
    isDeleteDialogOpen,
    setIsDeleteDialogOpen,
  };

  return <TeamContext.Provider value={value}>{children}</TeamContext.Provider>;
};

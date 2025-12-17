import { createContext, useContext } from "react";
import type { Project, ProjectContextType } from "../Types/types";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useTeamContext } from "./TeamMemberContext";

const ProjectContext = createContext<ProjectContextType | null>(null);

export const useProjectContext = () => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error("useProjects must be used within a ProjectProvider");
  }
  return context;
};

export const ProjectContextProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { teamMembers } = useTeamContext();

  const mockProjects: Project[] = [
    {
      id: "1",
      companyId: "comp-123",
      title: "Brand Redesign for LexCorp",
      client: "LexCorp Inc.",
      status: "In Progress",
      deadline: "2024-02-15",
      description:
        "Complete brand overhaul including logo, colors, and guidelines",
      team: [1, 2, 3],
    },
    {
      id: "2",
      companyId: "comp-123",
      title: "Website Development",
      client: "StartupXYZ",
      status: "Active",
      deadline: "2024-03-01",
      description: "Develop a responsive website for StartupXYZ",
      team: [4, 3],
    },
    {
      id: "3",
      companyId: "comp-123",
      title: "Marketing Campaign",
      client: "RetailCo",
      status: "Completed",
      deadline: "2024-01-20",
      description:
        "Launch a marketing campaign for RetailCo’s new product line",
      team: [6, 7],
    },
    {
      id: "4",
      companyId: "comp-123",
      title: "Internal Tool Migration",
      client: "InHouse Ops",
      status: "Planning",
      deadline: "2024-12-01",
      description: "Migrate legacy internal tools to a modern tech stack.",
      team: [4, 5, 12],
    },
    {
      id: "5",
      companyId: "comp-123",
      title: "Customer Feedback System",
      client: "EchoWare",
      status: "In Progress",
      deadline: "2024-11-10",
      description: "Build a customer feedback collection and analysis system.",
      team: [8, 10, 13],
    },
    {
      id: "6",
      companyId: "comp-123",
      title: "Mobile App Launch",
      client: "Appify",
      status: "Active",
      deadline: "2024-09-30",
      description: "Launch MVP of new social media mobile app.",
      team: [1, 9, 11],
    },
    {
      id: "7",
      companyId: "comp-123",
      title: "SEO Optimization",
      client: "GreenSprout",
      status: "In Progress",
      deadline: "2024-10-20",
      description: "Improve search engine visibility for all web assets.",
      team: [6, 9],
    },
    {
      id: "8",
      companyId: "comp-123",
      title: "Cloud Infrastructure Overhaul",
      client: "TechNova",
      status: "Planning",
      deadline: "2024-12-15",
      description: "Redesign and optimize cloud architecture for scale.",
      team: [3, 12, 14],
    },
    {
      id: "9",
      companyId: "comp-123",
      title: "Brand Awareness Campaign",
      client: "NovaFoods",
      status: "Completed",
      deadline: "2024-08-01",
      description: "Design and execute a brand awareness campaign for Q3.",
      team: [2, 5, 6],
    },
    {
      id: "10",
      companyId: "comp-123",
      title: "Data Dashboard",
      client: "MetricHub",
      status: "In Progress",
      deadline: "2024-10-05",
      description: "Develop a real-time data visualization dashboard.",
      team: [10, 11, 13],
    },
  ];

  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // 🔄 Fetch projects from API or mock on mount
  const fetchProjects = async () => {
    setLoading(true);
    setError(null);
    try {
      // TODO: Replace with real API call (e.g., Firebase Firestore)
      // Example with Firebase:
      // import { collection, getDocs } from 'firebase/firestore';
      // import { db } from '../lib/firebase';
      // const querySnapshot = await getDocs(collection(db, 'projects'));
      // const projectsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
      // setProjects(projectsData);

      setProjects(mockProjects);
      setLoading(false);
    } catch (err) {
      setError("Failed to fetch projects");
      setLoading(false);
      console.error("Failed to fetch projects:", err);
    }
  };

  // ⏱ Fetch on component mount
  useEffect(() => {
    fetchProjects();
  }, []);

  // ➕ Add project
  const addProject = async (project: Project) => {
    setProjects((prev) => [...prev, project]);
    toast.success("Project added successfully!");
    // TODO: POST to API (e.g., Firebase Firestore)
    // Example:
    // import { collection, addDoc } from 'firebase/firestore';
    // import { db } from '../lib/firebase';
    // try {
    //   await addDoc(collection(db, 'projects'), project);
    // } catch (err) {
    //   console.error('Failed to add project:', err);
    // }
  };

  // 🛠 Update project
  const updateProject = async (id: string, data: Partial<Project>) => {
    setProjects((prev) =>
      prev.map((proj) => (proj.id === id ? { ...proj, ...data } : proj))
    );
    toast.success("Project updated successfully!");
    // TODO: PATCH/PUT to API (e.g., Firebase Firestore)
    // Example:
    // import { doc, updateDoc } from 'firebase/firestore';
    // import { db } from '../lib/firebase';
    // try {
    //   await updateDoc(doc(db, 'projects', id.toString()), data);
    // } catch (err) {
    //   console.error('Failed to update project:', err);
    // }
  };

  // ❌ Delete project
  const deleteProject = async (id: string) => {
    setProjects((prev) => prev.filter((proj) => proj.id !== id));
    toast.success("Project deleted successfully!");
    // TODO: DELETE from API (e.g., Firebase Firestore)
    // Example:
    // import { doc, deleteDoc } from 'firebase/firestore';
    // import { db } from '../lib/firebase';
    // try {
    //   await deleteDoc(doc(db, 'projects', id.toString()));
    // } catch (err) {
    //   console.error('Failed to delete project:', err);
    // }
  };

  const confirmDelete = () => {
    if (projectToDelete) {
      deleteProject(projectToDelete.id);
      setProjectToDelete(null);
      setIsDeleteDialogOpen(false);
    }
  };

  const getTeamMembersDetails = (memberIds: number[]) => {
    return teamMembers.filter((member) => memberIds.includes(member.id));
  };

  const value = {
    projects,
    setProjects,
    currentProject,
    setCurrentProject,
    loading,
    error,
    fetchProjects,
    addProject,
    updateProject,
    deleteProject,
    confirmDelete,
    projectToDelete,
    setProjectToDelete,
    isDeleteDialogOpen,
    setIsDeleteDialogOpen,
    getTeamMembersDetails,
  };

  return (
    <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>
  );
};

import { createContext, useContext } from "react";
import type { ProjectContextType } from "../Types/types";
import { useProjects } from "@/hooks/useProjects";

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
  const {
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
  } = useProjects();

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
  };

  return (
    <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>
  );
};

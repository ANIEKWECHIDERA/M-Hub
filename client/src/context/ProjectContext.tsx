import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { toast } from "sonner";
import { useAuthContext } from "./AuthContext";
import type {
  CreateProjectDTO,
  Project,
  ProjectContextType,
  UpdateProjectDTO,
} from "../Types/types";
import { ProjectAPI } from "@/api/projects.api";

const ProjectContext = createContext<ProjectContextType | null>(null);

export const useProjectContext = () => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error(
      "useProjectContext must be used within ProjectContextProvider"
    );
  }
  return context;
};

export const ProjectContextProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { idToken } = useAuthContext();

  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const fetchProjects = useCallback(async () => {
    if (!idToken) {
      setError("Authentication required");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const fetchedProjects = await ProjectAPI.getAll(idToken);
      setProjects(fetchedProjects);
    } catch (err: any) {
      const msg = err.message || "Failed to load projects";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [idToken]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const addProject = async (data: CreateProjectDTO) => {
    const project = await ProjectAPI.create(data, idToken);
    setProjects((prev) => [project, ...prev]);
    toast.success("Project created successfully");
    return project;
  };

  const updateProject = async (id: string, data: UpdateProjectDTO) => {
    const updated = await ProjectAPI.update(id, data, idToken);
    if (!updated) return;

    setProjects((prev) => prev.map((p) => (p.id === id ? updated : p)));

    if (currentProject?.id === id) {
      setCurrentProject(updated);
    }

    toast.success("Project updated");
  };

  const deleteProject = async (id: string) => {
    await ProjectAPI.delete(id, idToken);
    setProjects((prev) => prev.filter((p) => p.id !== id));

    if (currentProject?.id === id) {
      setCurrentProject(null);
    }

    toast.success("Project deleted");
  };

  const confirmDelete = () => {
    if (projectToDelete?.id) {
      deleteProject(projectToDelete.id);
    }
    setProjectToDelete(null);
    setIsDeleteDialogOpen(false);
  };

  return (
    <ProjectContext.Provider
      value={{
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
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
};

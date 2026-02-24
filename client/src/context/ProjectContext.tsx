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
      "useProjectContext must be used within ProjectContextProvider",
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
    if (!idToken) {
      setError("Authentication required");
      throw new Error("No auth token");
    }
    const promise = ProjectAPI.create(data, idToken);
    toast.promise(promise, {
      loading: "Creating project...",
      success: "Project created successfully",
      error: "Failed to create project",
    });

    const project = await promise;
    setProjects((prev) => [project, ...prev]);

    return project;
  };

  const updateProject = async (
    id: string,
    data: UpdateProjectDTO,
  ): Promise<Project> => {
    if (!idToken) {
      setError("Authentication required");
      throw new Error("No auth token");
    }
    const promise = ProjectAPI.update(id, data, idToken);

    toast.promise(promise, {
      loading: "Updating project...",
      success: "Project updated",
      error: "Failed to update project",
    });

    const updated = await promise;
    if (!updated) throw new Error("Update failed");

    setProjects((prev) =>
      prev.map((proj) => (proj.id === id ? updated : proj)),
    );
    setCurrentProject((proj) => (proj?.id === id ? updated : proj));

    return updated;
  };

  const deleteProject = async (id: string): Promise<void> => {
    if (!idToken) {
      setError("Authentication required");
      throw new Error("No auth token");
    }
    const promise = ProjectAPI.delete(id, idToken);

    toast.promise(promise, {
      loading: "Deleting project...",
      success: "Project deleted",
      error: "Failed to delete project",
    });

    await promise;

    setProjects((prev) => prev.filter((proj) => proj.id !== id));
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

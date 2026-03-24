import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
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

const buildOptimisticProject = (
  data: CreateProjectDTO | UpdateProjectDTO,
  existing?: Project | null,
): Project => ({
  id: existing?.id ?? `temp-project-${Date.now()}`,
  company_id: existing?.company_id ?? "",
  title: data.title ?? existing?.title ?? "Untitled project",
  description: data.description ?? existing?.description ?? null,
  status: data.status ?? existing?.status ?? "Planning",
  deadline: data.deadline ?? existing?.deadline ?? null,
  created_at: existing?.created_at ?? new Date().toISOString(),
  client:
    data.client?.name !== undefined
      ? {
          id: existing?.client?.id ?? `temp-client-${Date.now()}`,
          name: data.client.name,
        }
      : data.client_id
        ? existing?.client ?? null
        : existing?.client ?? null,
  team_members: existing?.team_members ?? [],
  task_count: existing?.task_count ?? 0,
  completed_task_count: existing?.completed_task_count ?? 0,
  progress: existing?.progress ?? 0,
});

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
  const { idToken, authStatus } = useAuthContext();

  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const projectsById = useMemo(
    () => new Map(projects.map((project) => [project.id, project] as const)),
    [projects],
  );

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
      const fetchedProjectsById = new Map(
        fetchedProjects.map((project) => [project.id, project] as const),
      );
      setProjects(fetchedProjects);
      setCurrentProject((prev) =>
        prev
          ? fetchedProjectsById.get(prev.id) ?? prev
          : prev,
      );
    } catch (err: any) {
      const msg = err.message || "Failed to load projects";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [idToken]);

  useEffect(() => {
    if (!idToken || authStatus?.onboardingState !== "ACTIVE") {
      setProjects([]);
      return;
    }
    fetchProjects();
  }, [fetchProjects, idToken, authStatus?.companyId, authStatus?.onboardingState]);

  const addProject = async (data: CreateProjectDTO) => {
    if (!idToken) {
      setError("Authentication required");
      throw new Error("No auth token");
    }

    const tempProject = buildOptimisticProject(data);
    setProjects((prev) => [tempProject, ...prev]);

    const promise = ProjectAPI.create(data, idToken);
    toast.promise(promise, {
      loading: "Creating project...",
      success: "Project created successfully",
      error: "Failed to create project",
    });

    try {
      const project = await promise;
      setProjects((prev) =>
        prev.map((item) => (item.id === tempProject.id ? project : item)),
      );

      return project;
    } catch (error) {
      setProjects((prev) => prev.filter((item) => item.id !== tempProject.id));
      throw error;
    }
  };

  const updateProject = async (
    id: string,
    data: UpdateProjectDTO,
  ): Promise<Project> => {
    if (!idToken) {
      setError("Authentication required");
      throw new Error("No auth token");
    }
    const previousProjects = projects;
    const previousCurrentProject = currentProject;
    const existingProject = projectsById.get(id) ?? null;
    const optimisticProject = buildOptimisticProject(data, existingProject);

    setProjects((prev) =>
      prev.map((proj) => (proj.id === id ? optimisticProject : proj)),
    );
    setCurrentProject((proj) => (proj?.id === id ? optimisticProject : proj));

    const promise = ProjectAPI.update(id, data, idToken);

    toast.promise(promise, {
      loading: "Updating project...",
      success: "Project updated",
      error: "Failed to update project",
    });

    try {
      const updated = await promise;
      if (!updated) throw new Error("Update failed");

      setProjects((prev) =>
        prev.map((proj) => (proj.id === id ? updated : proj)),
      );
      setCurrentProject((proj) => (proj?.id === id ? updated : proj));

      return updated;
    } catch (error) {
      setProjects(previousProjects);
      setCurrentProject(previousCurrentProject);
      throw error;
    }
  };

  const deleteProject = async (id: string): Promise<void> => {
    if (!idToken) {
      setError("Authentication required");
      throw new Error("No auth token");
    }
    const previousProjects = projects;
    const previousCurrentProject = currentProject;
    setProjects((prev) => prev.filter((proj) => proj.id !== id));
    setCurrentProject((proj) => (proj?.id === id ? null : proj));

    const promise = ProjectAPI.delete(id, idToken);

    toast.promise(promise, {
      loading: "Deleting project...",
      success: "Project deleted",
      error: "Failed to delete project",
    });

    try {
      await promise;
    } catch (error) {
      setProjects(previousProjects);
      setCurrentProject(previousCurrentProject);
      throw error;
    }
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

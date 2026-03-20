import { createContext, useContext, useState, useEffect } from "react";
import { toast } from "sonner";

import type { TaskContextType, TaskWithAssigneesDTO } from "@/Types/types";
import { tasksAPI } from "@/api/tasks.api";
import { useAuthContext } from "./AuthContext";
import { normalizeTask } from "@/mapper/task.mapper";
import { useProjectContext } from "./ProjectContext";

const TaskContext = createContext<TaskContextType | null>(null);

export const useTaskContext = () => {
  const context = useContext(TaskContext);
  if (!context)
    throw new Error("useTaskContext must be used within TaskContextProvider");
  return context;
};

export const TaskContextProvider = ({
  projectId,
  children,
  projectIds,
}: {
  projectId: string;
  children: React.ReactNode;
  projectIds?: string[];
}) => {
  const [tasks, setTasks] = useState<TaskWithAssigneesDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<TaskWithAssigneesDTO | null>(
    null,
  );
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<TaskWithAssigneesDTO | null>(
    null,
  );
  const { idToken } = useAuthContext();
  const { projects, setProjects, currentProject, setCurrentProject } =
    useProjectContext();

  const ids = projectIds?.length ? projectIds : projectId ? [projectId] : [];

  const calculateProgress = (taskCount: number, completedTaskCount: number) =>
    taskCount > 0 ? Math.round((completedTaskCount / taskCount) * 100) : 0;

  const updateProjectTaskStats = (
    targetProjectId: string,
    updater: (current: {
      task_count: number;
      completed_task_count: number;
    }) => {
      task_count: number;
      completed_task_count: number;
    },
  ) => {
    setProjects((prev) =>
      prev.map((project) => {
        if (project.id !== targetProjectId) {
          return project;
        }

        const nextCounts = updater({
          task_count: project.task_count ?? 0,
          completed_task_count: project.completed_task_count ?? 0,
        });

        return {
          ...project,
          task_count: Math.max(0, nextCounts.task_count),
          completed_task_count: Math.max(0, nextCounts.completed_task_count),
          progress: calculateProgress(
            Math.max(0, nextCounts.task_count),
            Math.max(0, nextCounts.completed_task_count),
          ),
        };
      }),
    );

    setCurrentProject((prev) => {
      if (!prev || prev.id !== targetProjectId) {
        return prev;
      }

      const nextCounts = updater({
        task_count: prev.task_count ?? 0,
        completed_task_count: prev.completed_task_count ?? 0,
      });

      return {
        ...prev,
        task_count: Math.max(0, nextCounts.task_count),
        completed_task_count: Math.max(0, nextCounts.completed_task_count),
        progress: calculateProgress(
          Math.max(0, nextCounts.task_count),
          Math.max(0, nextCounts.completed_task_count),
        ),
      };
    });
  };

  // Fetch tasks from API
  const fetchTasks = async () => {
    if (!idToken) {
      setError("Authentication required");
      setLoading(false);
      return;
    }

    // if (!ids.length) {
    //   setTasks([]);
    //   setLoading(false);
    //   return;
    // }

    setLoading(true);
    setError(null);

    try {
      const allTasks = await Promise.all(
        ids.map((id) => tasksAPI.getAllByProject(id, idToken)),
      );
      // Flatten the results and normalize
      setTasks(allTasks.flat().map(normalizeTask));
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to fetch tasks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!projectId || !idToken) return;
    fetchTasks();
  }, [projectId, idToken]);

  // Optimistic add
  const addTask = async (
    data: Partial<TaskWithAssigneesDTO>,
  ): Promise<TaskWithAssigneesDTO | undefined> => {
    if (!idToken) {
      setError("Authentication required");
      throw new Error("No auth token");
    }

    const tempId = `temp-${Date.now()}`;

    const optimisticTask: TaskWithAssigneesDTO = {
      id: tempId,
      companyId: "",
      projectId,
      title: data.title || "",
      description: data.description || "",
      status: data.status || "To-Do",
      priority: data.priority || "medium",
      progress: 0,
      due_date: data.due_date || "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      team_members: [],
    };

    setTasks((prev) => [optimisticTask, ...prev]);
    updateProjectTaskStats(projectId, (current) => ({
      task_count: current.task_count + 1,
      completed_task_count:
        current.completed_task_count + (optimisticTask.status === "Done" ? 1 : 0),
    }));

    const promise = tasksAPI.create(projectId, data, idToken);

    toast.promise(promise, {
      loading: "Creating task...",
      success: "Task created!",
      error: "Failed to create task",
    });

    try {
      const savedTask = await promise;

      setTasks((prev) =>
        prev.map((t) => (t.id === tempId ? normalizeTask(savedTask) : t)),
      );

      return normalizeTask(savedTask);
    } catch (err) {
      setTasks((prev) => prev.filter((t) => t.id !== tempId));
      updateProjectTaskStats(projectId, (current) => ({
        task_count: current.task_count - 1,
        completed_task_count:
          current.completed_task_count - (optimisticTask.status === "Done" ? 1 : 0),
      }));
      throw err;
    }
  };

  // Optimistic update
  const updateTask = async (
    id: string,
    data: Partial<TaskWithAssigneesDTO>,
  ): Promise<TaskWithAssigneesDTO> => {
    if (!idToken) {
      setError("Authentication required");
      throw new Error("No auth token");
    }

    const previousTasks = tasks;
    const previousProjects = projects;
    const previousSelectedTask = selectedTask;
    const previousCurrentProject = currentProject;
    const optimisticTask =
      tasks.find((task) => task.id === id) ?? selectedTask ?? null;

    if (optimisticTask) {
      const mergedTask = {
        ...optimisticTask,
        ...data,
        updatedAt: new Date().toISOString(),
      };

      setTasks((prev) => prev.map((t) => (t.id === id ? mergedTask : t)));
      setSelectedTask((task) => (task?.id === id ? mergedTask : task));

      const previousProjectId = optimisticTask.projectId;
      const nextProjectId = mergedTask.projectId ?? previousProjectId;
      const wasCompleted = optimisticTask.status === "Done";
      const isCompleted = mergedTask.status === "Done";

      if (previousProjectId === nextProjectId) {
        if (wasCompleted !== isCompleted) {
          updateProjectTaskStats(previousProjectId, (current) => ({
            task_count: current.task_count,
            completed_task_count:
              current.completed_task_count + (isCompleted ? 1 : -1),
          }));
        }
      } else {
        updateProjectTaskStats(previousProjectId, (current) => ({
          task_count: current.task_count - 1,
          completed_task_count:
            current.completed_task_count - (wasCompleted ? 1 : 0),
        }));
        updateProjectTaskStats(nextProjectId, (current) => ({
          task_count: current.task_count + 1,
          completed_task_count:
            current.completed_task_count + (isCompleted ? 1 : 0),
        }));
      }
    }

    const promise = tasksAPI.update(id, data, idToken);

    toast.promise(promise, {
      loading: "Updating task...",
      success: "Task updated!",
      error: "Failed to update task",
    });

    try {
      const updatedTask = await promise;
      const normalizedTask = normalizeTask(updatedTask);

      setTasks((prev) =>
        prev.map((t) => (t.id === id ? normalizedTask : t)),
      );
      setSelectedTask((task) => (task?.id === id ? normalizedTask : task));

      return normalizedTask;
    } catch (err) {
      setTasks(previousTasks);
      setProjects(previousProjects);
      setSelectedTask(previousSelectedTask);
      setCurrentProject(previousCurrentProject);
      throw err;
    }
  };

  // Optimistic delete
  const deleteTask = async (id: string): Promise<void> => {
    if (!idToken) {
      setError("Authentication required");
      throw new Error("No auth token");
    }

    const prevTasks = tasks;
    const previousProjects = projects;
    const previousCurrentProject = currentProject;
    const taskToRemove = tasks.find((task) => task.id === id) ?? null;

    setTasks((prev) => prev.filter((t) => t.id !== id));
    if (taskToRemove) {
      updateProjectTaskStats(taskToRemove.projectId, (current) => ({
        task_count: current.task_count - 1,
        completed_task_count:
          current.completed_task_count - (taskToRemove.status === "Done" ? 1 : 0),
      }));
    }

    const promise = tasksAPI.delete(id, idToken);

    toast.promise(promise, {
      loading: "Deleting task...",
      success: "Task deleted!",
      error: "Failed to delete task",
    });

    try {
      await promise;
    } catch (err) {
      setTasks(prevTasks); // rollback
      setProjects(previousProjects);
      setCurrentProject(previousCurrentProject);
      throw err;
    }
  };

  return (
    <TaskContext.Provider
      value={{
        tasks,
        setTasks,
        loading,
        error,
        addTask,
        updateTask,
        deleteTask,
        selectedTask,
        setSelectedTask,
        isDeleteDialogOpen,
        setIsDeleteDialogOpen,
        taskToDelete,
        setTaskToDelete,
        confirmDelete: async () => {
          deleteTask(taskToDelete!.id);
          setIsDeleteDialogOpen(false);
        },
      }}
    >
      {children}
    </TaskContext.Provider>
  );
};

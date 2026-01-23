import { createContext, useContext, useState, useEffect } from "react";
import { toast } from "sonner";

import type { TaskContextType, TaskWithAssigneesDTO } from "@/Types/types";
import { tasksAPI } from "@/api/tasks.api";
import { useAuthContext } from "./AuthContext";
import { normalizeTask } from "@/mapper/task.mapper";

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

  const ids = projectIds?.length ? projectIds : projectId ? [projectId] : [];

  // Fetch tasks from API
  const fetchTasks = async () => {
    if (!idToken || !ids?.length) {
      setError("Authentication required");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const allTasks = await Promise.all(
        ids.map((id) => tasksAPI.getAllByProject(id, idToken)),
      );
      console.log("All tasks:", allTasks);
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
  const addTask = async (data: Partial<TaskWithAssigneesDTO>) => {
    if (!idToken) {
      setError("Authentication required");
      return;
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
      team_members: [], // ✅ no project reference
    };

    setTasks((prev) => [optimisticTask, ...prev]);

    try {
      const savedTask = await tasksAPI.create(projectId, data, idToken);

      setTasks((prev) =>
        prev.map((t) => (t.id === tempId ? normalizeTask(savedTask) : t)),
      );

      toast.success("Task created!");
      return savedTask;
    } catch (err: any) {
      setTasks((prev) => prev.filter((t) => t.id !== tempId));
      toast.error("Failed to create task");
      console.error(err);
    }
  };

  // Optimistic update
  const updateTask = async (
    id: string,
    data: Partial<TaskWithAssigneesDTO>,
  ) => {
    if (!idToken) {
      setError("Authentication required");
      return;
    }

    try {
      const updatedTask = await tasksAPI.update(id, data, idToken);
      console.log("Updated Task:", updatedTask);
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? normalizeTask(updatedTask) : t)),
      );

      toast.success("Task updated!");
    } catch (err: any) {
      toast.error("Failed to update task");
      console.error(err);
    }
  };

  // Optimistic delete
  const deleteTask = async (id: string) => {
    if (!idToken) {
      setError("Authentication required");
      setLoading(false);
      return;
    }
    const prevTasks = [...tasks];
    setTasks((prev) => prev.filter((t) => t.id !== id));

    try {
      await tasksAPI.delete(id, idToken);
      toast.success("Task deleted!");
    } catch (err: any) {
      setTasks(prevTasks);
      toast.error("Failed to delete task");
      console.error(err);
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

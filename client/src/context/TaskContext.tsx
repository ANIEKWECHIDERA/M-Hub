import { createContext, useContext, useState, useEffect } from "react";
import { toast } from "sonner";

import type { CreateTaskPayload, TaskWithAssigneesDTO } from "@/Types/types";
import { tasksAPI } from "@/api/tasks.api";
import { useAuthContext } from "./AuthContext";

type TaskContextType = {
  tasks: TaskWithAssigneesDTO[];
  setTasks: React.Dispatch<React.SetStateAction<TaskWithAssigneesDTO[]>>;

  loading: boolean;
  error: string | null;

  addTask: (
    data: Partial<CreateTaskPayload>
  ) => Promise<TaskWithAssigneesDTO | void>;

  updateTask: (
    id: string,
    data: Partial<TaskWithAssigneesDTO>
  ) => Promise<void>;

  deleteTask: (id: string) => Promise<void>;

  selectedTask: TaskWithAssigneesDTO | null;
  setSelectedTask: React.Dispatch<
    React.SetStateAction<TaskWithAssigneesDTO | null>
  >;

  // 🔽 delete dialog state
  isDeleteDialogOpen: boolean;
  setIsDeleteDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;

  taskToDelete: TaskWithAssigneesDTO | null;
  setTaskToDelete: React.Dispatch<
    React.SetStateAction<TaskWithAssigneesDTO | null>
  >;

  confirmDelete: () => Promise<void>;
};

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
}: {
  projectId: string;
  children: React.ReactNode;
}) => {
  const [tasks, setTasks] = useState<TaskWithAssigneesDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<TaskWithAssigneesDTO | null>(
    null
  );
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<TaskWithAssigneesDTO | null>(
    null
  );
  const { idToken } = useAuthContext();

  // Fetch tasks from API
  const fetchTasks = async () => {
    if (!idToken) {
      setError("Authentication required");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await tasksAPI.getAllByProject(projectId, idToken); // Fetch tasks by projectId
      setTasks(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to fetch tasks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [projectId, idToken]); // Re-fetch when projectId or idToken changes

  // Optimistic add
  const addTask = async (data: Partial<TaskWithAssigneesDTO>) => {
    if (!idToken) {
      setError("Authentication required");
      setLoading(false);
      return;
    }
    const tempId = "temp-" + Date.now();
    const optimisticTask: TaskWithAssigneesDTO = {
      id: tempId,
      companyId: "", // filled by backend
      projectId: projectId, // Set the correct projectId
      title: data.title || "",
      description: data.description || "",
      status: data.status || "To-Do",
      priority: data.priority || "medium",
      progress: 0,
      due_date: data.due_date || "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      assignees: data.assignees || [],
    };

    setTasks((prev) => [optimisticTask, ...prev]);
    console.log("Adding task:", data, "to project:");
    try {
      const savedTask = await tasksAPI.create(projectId, data, idToken); // Pass projectId to the API
      setTasks((prev) => prev.map((t) => (t.id === tempId ? savedTask : t)));
      toast.success("Task created!");
    } catch (err: any) {
      setTasks((prev) => prev.filter((t) => t.id !== tempId));
      toast.error("Failed to create task");
      console.error(err);
    }
  };

  // Optimistic update
  const updateTask = async (
    id: string,
    data: Partial<TaskWithAssigneesDTO>
  ) => {
    if (!idToken) {
      setError("Authentication required");
      setLoading(false);
      return;
    }
    const prevTasks = [...tasks];
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, ...data, updatedAt: new Date().toISOString() } : t
      )
    );
    console.log("Updating task:", id, data);
    try {
      await tasksAPI.update(id, data, idToken);
      toast.success("Task updated!");
    } catch (err: any) {
      setTasks(prevTasks);
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
        confirmDelete: async () => {},
      }}
    >
      {children}
    </TaskContext.Provider>
  );
};

import { createContext, useContext, useEffect, useState } from "react";
import type { MyTasksContextType, TaskWithAssigneesDTO } from "@/Types/types";
import { tasksAPI } from "@/api/tasks.api";
import { useAuthContext } from "./AuthContext";
import { useTaskContext } from "./TaskContext";

const MyTasksContext = createContext<MyTasksContextType | null>(null);
export const useMyTasksContext = () => {
  const context = useContext(MyTasksContext);
  if (!context) {
    throw new Error("useMyTasksContext must be used within MyTasksProvider");
  }
  return context;
};

export const MyTasksProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { idToken } = useAuthContext();
  const { tasks: allTasks, updateTask } = useTaskContext();

  const [tasks, setTasks] = useState<TaskWithAssigneesDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMyTasks = async () => {
    if (!idToken) {
      setError("Authentication required");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const promise = tasksAPI.getMyTasks(idToken);

    // toast.promise(promise, {
    //   loading: "Loading your tasks...",
    //   error: "Failed to load your tasks",
    // });

    try {
      const data = await promise;
      setTasks(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to fetch my tasks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setTasks((prev) =>
      prev.map((myTask) => {
        const globalMatch = allTasks.find((t) => t.id === myTask.id);
        return globalMatch ?? myTask;
      }),
    );
  }, [allTasks]);

  const updateTaskOptimistic = async (
    taskId: string,
    updates: Partial<TaskWithAssigneesDTO>,
  ) => {
    // Snapshot (for rollback)
    const previousTasks = tasks;

    // Optimistic update
    setTasks((prev) =>
      prev.map((task) => (task.id === taskId ? { ...task, ...updates } : task)),
    );
    try {
      await updateTask(taskId, updates);
    } catch (error) {
      // Rollback if failed
      setTasks(previousTasks);
    }
  };

  useEffect(() => {
    fetchMyTasks();
  }, [idToken]);

  return (
    <MyTasksContext.Provider
      value={{
        tasks,
        loading,
        error,
        refetch: fetchMyTasks,
        updateTaskOptimistic,
      }}
    >
      {children}
    </MyTasksContext.Provider>
  );
};

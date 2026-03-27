import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import type { MyTasksContextType, TaskWithAssigneesDTO } from "@/Types/types";
import { tasksAPI } from "@/api/tasks.api";
import { useAuthContext } from "./AuthContext";
import { useTaskContext } from "./TaskContext";
import { useTeamContext } from "./TeamMemberContext";
import { subscribeToTaskSync, type TaskSyncPayload } from "@/lib/task-sync";

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
  const location = useLocation();
  const { idToken, authStatus } = useAuthContext();
  const { tasks: allTasks, updateTask } = useTaskContext();
  const { currentMember } = useTeamContext();
  const shouldPreloadMyTasks =
    location.pathname === "/mytasks" ||
    location.pathname.startsWith("/projectdetails/");

  const [tasks, setTasks] = useState<TaskWithAssigneesDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const allTasksById = useMemo(
    () => new Map(allTasks.map((task) => [task.id, task] as const)),
    [allTasks],
  );

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
        const globalMatch = allTasksById.get(myTask.id);
        return globalMatch ?? myTask;
      }),
    );
  }, [allTasksById]);

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
    if (!idToken || authStatus?.onboardingState !== "ACTIVE") {
      setTasks([]);
      setLoading(false);
      return;
    }

    if (!shouldPreloadMyTasks) {
      setLoading(false);
      return;
    }

    fetchMyTasks();
  }, [
    authStatus?.companyId,
    authStatus?.onboardingState,
    idToken,
    shouldPreloadMyTasks,
  ]);

  useEffect(() => {
    const unsubscribe = subscribeToTaskSync((payload: TaskSyncPayload) => {
      if (payload.type === "delete") {
        setTasks((prev) => prev.filter((task) => task.id !== payload.taskId));
        return;
      }

      const assignedToCurrentMember = Boolean(
        currentMember?.id &&
          payload.task.team_members?.some((member) => member.id === currentMember.id),
      );

      setTasks((prev) => {
        const existingIndex = prev.findIndex((task) => task.id === payload.task.id);
        const existingTask = existingIndex >= 0 ? prev[existingIndex] : null;

        if (!assignedToCurrentMember) {
          return existingIndex >= 0
            ? prev.filter((task) => task.id !== payload.task.id)
            : prev;
        }

        const nextTask = existingTask
          ? {
              ...existingTask,
              ...payload.task,
              project: payload.task.project ?? existingTask.project,
              team_members:
                payload.task.team_members?.length || !existingTask.team_members?.length
                  ? payload.task.team_members
                  : existingTask.team_members,
            }
          : payload.task;

        if (existingIndex >= 0) {
          return prev.map((task) =>
            task.id === payload.task.id ? nextTask : task,
          );
        }

        return [nextTask, ...prev];
      });
    });

    return unsubscribe;
  }, [currentMember?.id]);

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

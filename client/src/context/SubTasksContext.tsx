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
  Subtask,
  SubtaskContextType,
  CreateSubtaskDTO,
  UpdateSubtaskDTO,
} from "@/Types/types";
import { subtasksAPI } from "@/api/subtask.api";
import { useUser } from "./UserContext";
import { useTeamContext } from "./TeamMemberContext";

const SubTasksContext = createContext<SubtaskContextType | null>(null);

export const useSubTasksContext = () => {
  const context = useContext(SubTasksContext);
  if (!context) {
    throw new Error(
      "useSubTasksContext must be used within SubTasksContextProvider",
    );
  }
  return context;
};

export const SubTasksContextProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { idToken } = useAuthContext();
  const { profile } = useUser();
  const { currentMember } = useTeamContext();

  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubtasks = useCallback(async () => {
    if (!idToken) {
      setError("Authentication required");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const fetchedSubtasks = await subtasksAPI.getAll(idToken);
      setSubtasks(fetchedSubtasks);
    } catch (err: any) {
      const msg = err.message || "Failed to load subtasks";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [idToken]);

  useEffect(() => {
    fetchSubtasks();
  }, [fetchSubtasks]);

  const addSubtask = async (data: CreateSubtaskDTO): Promise<Subtask> => {
    if (!idToken) {
      setError("Authentication required");
      throw new Error("No auth token");
    }

    // insert temporary optimistic subtask to UI
    const tempId = `temp-${crypto.randomUUID()}`;
    const optimisticSubtask: Subtask = {
      id: tempId,
      ...data,
      company_id: profile?.company_id || "", // placeholder, backend will ignore this
      team_member_id: currentMember?.id || "temp-member", // placeholder, backend will ignore this
      completed: data.completed ?? false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Immediately update UI
    setSubtasks((prev) => [optimisticSubtask, ...prev]);

    try {
      // try to call backend
      const createdSubtask = await subtasksAPI.create(data, idToken);

      // replace optimistic subtask with real one from backend
      setSubtasks((prev) =>
        prev.map((subtask) =>
          subtask.id === tempId ? createdSubtask : subtask,
        ),
      );

      return createdSubtask;
    } catch (err) {
      // if backend call fails, remove optimistic subtask and show error
      setSubtasks((prev) => prev.filter((subtask) => subtask.id !== tempId));
      const msg = err instanceof Error ? err.message : "Failed to add subtask";
      setError(msg);
      toast.error(msg);
      throw err;
    }
  };

  const updateSubtask = async (
    id: string,
    data: UpdateSubtaskDTO,
  ): Promise<Subtask> => {
    if (!idToken) {
      setError("Authentication required");
      throw new Error("No auth token");
    }

    // save prvious state for roll back in case update fails
    const previousSubstasks = subtasks;

    // Optimistically update UI
    setSubtasks((prev) =>
      prev.map((subtask) =>
        subtask.id === id
          ? { ...subtask, ...data, updated_at: new Date().toISOString() }
          : subtask,
      ),
    );
    try {
      const updated = await subtasksAPI.update(id, data, idToken);
      if (!updated) throw new Error("Update failed");

      return updated;
    } catch (err) {
      // Rollback to previous state if update fails
      setSubtasks(previousSubstasks);
      const msg =
        err instanceof Error ? err.message : "Failed to update subtask";
      setError(msg);
      toast.error(msg);
      throw err;
    }
  };

  const deleteSubtask = async (id: string): Promise<void> => {
    if (!idToken) {
      setError("Authentication required");
      throw new Error("No auth token");
    }

    // save previous state for rollback in case delete fails
    const previousSubtasks = subtasks;

    // Optimistically update UI
    setSubtasks((prev) => prev.filter((subtask) => subtask.id !== id));

    try {
      const deletedSubtask = await subtasksAPI.delete(id, idToken);
      if (!deletedSubtask) throw new Error("Delete failed");
      toast.success("Subtask deleted");
    } catch (err) {
      // Rollback to previous state if delete fails
      setSubtasks(previousSubtasks);
      const msg =
        err instanceof Error ? err.message : "Failed to delete subtask";
      setError(msg);
      toast.error(msg);
      throw err;
    }
  };

  const getSubtasksByIds = (ids: string[]) => {
    if (!ids || ids.length === 0) return [];
    const idSet = new Set(ids);
    return subtasks.filter((s) => idSet.has(s.id));
  };

  const getSubtasksByTaskId = (taskId: string) => {
    return subtasks.filter((s) => s.task_id === taskId);
  };

  return (
    <SubTasksContext.Provider
      value={{
        subtasks,
        setSubtasks,
        loading,
        error,
        fetchSubtasks,
        addSubtask,
        updateSubtask,
        deleteSubtask,
        getSubtasksByIds,
        getSubtasksByTaskId,
      }}
    >
      {children}
    </SubTasksContext.Provider>
  );
};

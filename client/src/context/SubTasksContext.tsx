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

    const promise = subtasksAPI.create(data, idToken);

    toast.promise(promise, {
      loading: "Creating subtask...",
      success: "Subtask created",
      error: "Failed to create subtask",
    });

    const subtask = await promise;
    const subtaskWithCreatedAt: Subtask = {
      ...subtask,
      created_at: subtask.created_at || new Date().toISOString(),
    };
    setSubtasks((prev) => [subtaskWithCreatedAt, ...prev]);

    return subtaskWithCreatedAt;
  };

  const updateSubtask = async (
    id: string,
    data: UpdateSubtaskDTO,
  ): Promise<Subtask> => {
    if (!idToken) {
      setError("Authentication required");
      throw new Error("No auth token");
    }

    const promise = subtasksAPI.update(id, data, idToken);

    toast.promise(promise, {
      loading: "Updating subtask...",
      success: "Subtask updated",
      error: "Failed to update subtask",
    });

    const updated = await promise;
    if (!updated) throw new Error("Update failed");

    setSubtasks((prev) => prev.map((s) => (s.id === id ? updated : s)));

    return updated;
  };

  const deleteSubtask = async (id: string): Promise<void> => {
    if (!idToken) {
      setError("Authentication required");
      throw new Error("No auth token");
    }

    const promise = subtasksAPI.delete(id, idToken);

    toast.promise(promise, {
      loading: "Deleting subtask...",
      success: "Subtask deleted",
      error: "Failed to delete subtask",
    });

    await promise;

    setSubtasks((prev) => prev.filter((s) => s.id !== id));
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

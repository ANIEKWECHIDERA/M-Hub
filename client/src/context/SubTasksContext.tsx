import { createContext, useContext, useEffect, useState } from "react";
import type { Subtask, SubtaskContextType } from "@/Types/types";
import { toast } from "sonner";

const SubTasksContext = createContext<SubtaskContextType | null>(null);

export const useSubTasksContext = () => {
  const context = useContext(SubTasksContext);
  if (!context) {
    throw new Error(
      "useSubTasksContext must be used within a SubTasksContextProvider",
    );
  }
  return context;
};

export const SubTasksContextProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  // Centralized mock subtasks model
  const mockSubtasks: Subtask[] = [
    {
      id: 1,
      companyId: 1,
      title: "Research competitor logos",
      completed: true,
      createdAt: "2024-01-10T10:00:00Z",
    },
    {
      id: 2,
      companyId: 1,
      title: "Sketch initial concepts",
      completed: true,
      createdAt: "2024-01-10T11:00:00Z",
    },
    {
      id: 3,
      companyId: 1,
      title: "Create digital mockups",
      completed: false,
      createdAt: "2024-01-15T09:00:00Z",
    },

    {
      id: 4,
      companyId: 1,
      title: "Choose primary and secondary colors",
      completed: true,
      createdAt: "2024-01-11T10:00:00Z",
    },
    {
      id: 5,
      companyId: 1,
      title: "Define typography rules",
      completed: false,
      createdAt: "2024-01-15T08:45:00Z",
    },

    {
      id: 6,
      companyId: 1,
      title: "Create sketches for home screen",
      completed: false,
      createdAt: "2024-02-01T12:30:00Z",
    },
    {
      id: 7,
      companyId: 1,
      title: "Design settings screen layout",
      completed: false,
      createdAt: "2024-02-01T13:00:00Z",
    },

    {
      id: 8,
      companyId: 2,
      title: "Design database schema",
      completed: true,
      createdAt: "2024-03-05T10:30:00Z",
    },
    {
      id: 9,
      companyId: 2,
      title: "Implement login API",
      completed: true,
      createdAt: "2024-03-07T09:00:00Z",
    },
    {
      id: 10,
      companyId: 2,
      title: "Create user CRUD endpoints",
      completed: false,
      createdAt: "2024-03-10T14:00:00Z",
    },

    {
      id: 11,
      companyId: 2,
      title: "Write unit tests for login API",
      completed: false,
      createdAt: "2024-03-16T08:30:00Z",
    },
    {
      id: 12,
      companyId: 2,
      title: "Test user CRUD operations",
      completed: false,
      createdAt: "2024-03-16T09:00:00Z",
    },

    {
      id: 13,
      companyId: 3,
      title: "Gather survey data",
      completed: true,
      createdAt: "2024-01-05T15:30:00Z",
    },
    {
      id: 14,
      companyId: 3,
      title: "Perform statistical analysis",
      completed: true,
      createdAt: "2024-01-20T14:00:00Z",
    },

    {
      id: 15,
      companyId: 3,
      title: "Draft campaign messages",
      completed: true,
      createdAt: "2024-02-10T11:30:00Z",
    },
    {
      id: 16,
      companyId: 3,
      title: "Schedule posts",
      completed: false,
      createdAt: "2024-02-15T09:00:00Z",
    },

    {
      id: 17,
      companyId: 4,
      title: "Select cloud provider",
      completed: false,
      createdAt: "2024-04-01T10:30:00Z",
    },
    {
      id: 18,
      companyId: 4,
      title: "Design migration plan",
      completed: false,
      createdAt: "2024-04-02T09:00:00Z",
    },

    {
      id: 19,
      companyId: 4,
      title: "Review firewall configurations",
      completed: false,
      createdAt: "2024-04-05T08:30:00Z",
    },

    {
      id: 20,
      companyId: 5,
      title: "Research topic areas",
      completed: true,
      createdAt: "2024-01-20T14:30:00Z",
    },
    {
      id: 21,
      companyId: 5,
      title: "Draft first post",
      completed: true,
      createdAt: "2024-01-25T10:00:00Z",
    },
    {
      id: 22,
      companyId: 5,
      title: "Edit and publish posts",
      completed: false,
      createdAt: "2024-02-01T15:00:00Z",
    },
  ];

  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubtasks = async () => {
    setLoading(true);
    setError(null);
    try {
      // TODO: Replace with real API call
      setSubtasks(mockSubtasks);
    } catch (err) {
      setError("Failed to fetch subtasks");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const addSubtask = async (data: Omit<Subtask, "id">): Promise<Subtask> => {
    const newSubtask: Subtask = { ...data, id: Date.now() };
    setSubtasks((prev) => [...prev, newSubtask]);
    toast.success("Subtask added");
    // TODO: Persist to backend
    return newSubtask;
  };

  const updateSubtask = async (id: number, data: Partial<Subtask>) => {
    setSubtasks((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...data } : s)),
    );
    toast.success("Subtask updated");
    // TODO: Persist to backend
  };

  const deleteSubtask = async (id: number) => {
    setSubtasks((prev) => prev.filter((s) => s.id !== id));
    toast.success("Subtask deleted");
    // TODO: Persist to backend
  };

  const getSubtasksByIds = (ids: number[]) => {
    if (!ids || ids.length === 0) return [];
    const idSet = new Set(ids);
    return subtasks.filter((s) => idSet.has(s.id));
  };

  useEffect(() => {
    fetchSubtasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value: SubtaskContextType = {
    subtasks,
    setSubtasks,
    fetchSubtasks,
    addSubtask,
    updateSubtask,
    deleteSubtask,
    getSubtasksByIds,
    loading,
    error,
  };

  return (
    <SubTasksContext.Provider value={value}>
      {children}
    </SubTasksContext.Provider>
  );
};

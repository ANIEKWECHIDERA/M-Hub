import { createContext, useContext } from "react";
import { useTasks } from "@/hooks/useTasks";
import type { TaskContextType } from "../Types/types";
import { useParams } from "react-router-dom";

// 1. Create the context
const TaskContext = createContext<TaskContextType | null>(null);

// 2. Custom hook to access the context
export const useTaskContext = () => {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error("useTaskContext must be used within a TaskProvider");
  }
  return context;
};

// 3. Context provider
export const TaskContextProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { id } = useParams();
  const {
    tasks,
    setTasks,
    currentTask,
    setCurrentTask,
    fetchTasks,
    addTask,
    updateTask,
    deleteTask,
    loading,
    error,
    selectedTask,
    setSelectedTask,
  } = useTasks(id ? Number(id) : 0);

  const value = {
    tasks,
    setTasks,
    currentTask,
    setCurrentTask,
    fetchTasks,
    addTask,
    updateTask,
    deleteTask,
    loading,
    error,
    selectedTask,
    setSelectedTask,
  };

  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
};

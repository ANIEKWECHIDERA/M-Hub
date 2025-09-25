import { createContext, useContext } from "react";
import type { TaskContextType } from "../Types/types";
import { useState, useEffect } from "react";
import type { Task } from "../Types/types";
import { toast } from "sonner";

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
  projectId,
}: {
  children: React.ReactNode;
  projectId?: number;
}) => {
  const mockTasks: Task[] = [
    {
      id: 1,
      projectId: 1,
      title: "Logo Design",
      assignee: "John Doe",
      status: "To-Do",
      dueDate: "2024-01-15",
      description: "Create new logo concepts",
    },
    {
      id: 2,
      projectId: 1,
      title: "Color Palette",
      assignee: "John Doe",
      status: "Done",
      dueDate: "2024-01-20",
      description: "Define brand colors",
    },
    {
      id: 3,
      projectId: 2,
      title: "Brand Guidelines",
      assignee: "Sarah Smith",
      status: "Done",
      dueDate: "2026-10-25",
      description: "Document brand standards",
    },
    {
      id: 4,
      projectId: 2,
      title: "Website Mockups",
      assignee: "Mike Johnson",
      status: "To-Do",
      dueDate: "2026-08-01",
      description: "Create website designs",
    },
    {
      id: 5,
      projectId: 1,
      title: "Logo Design",
      assignee: "John Doe",
      status: "To-Do",
      dueDate: "2026-01-15",
      description: "Create new logo concepts",
    },
    {
      id: 6,
      projectId: 3,
      title: "Color Palette",
      assignee: "John Doe",
      status: "Done",
      dueDate: "2024-01-20",
      description: "Define brand colors",
    },
    {
      id: 7,
      projectId: 3,
      title: "Brand Guidelines",
      assignee: "Sarah Smith",
      status: "Done",
      dueDate: "2026-01-25",
      description: "Document brand standards",
    },
    {
      id: 8,
      projectId: 3,
      title: "Website Mockups",
      assignee: "Mike Johnson",
      status: "To-Do",
      dueDate: "2026-08-01",
      description: "Create website designs",
    },
  ];

  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentTask, setCurrentTask] = useState<Task | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [TaskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // 🔄 Fetch tasks from API or mock
  const fetchTasks = async () => {
    setLoading(true);
    setError(null);
    try {
      // TODO: Replace with actual backend fetch (e.g., Firebase Firestore)
      // Example with Firebase:
      // import { collection, getDocs } from 'firebase/firestore';
      // import { db } from '../lib/firebase';
      // const querySnapshot = await getDocs(collection(db, `projects/${projectId}/tasks`));
      // const tasksData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
      // setTasks(tasksData);

      setTasks(mockTasks);
      setLoading(false);
    } catch (err) {
      setError("Failed to fetch tasks");
      setLoading(false);
      console.error("Failed to fetch tasks:", err);
    }
  };

  // ⏱ Fetch tasks on mount or when projectId changes
  useEffect(() => {
    fetchTasks();
  }, [projectId]);

  // ➕ Add task
  const addTask = async (projectId: number, data: Partial<Task>) => {
    const newTask: Task = {
      id: tasks.length + 1,
      projectId,
      title: data.title || "",
      description: data.description || "",
      assignee: data.assignee || "",
      status: data.status || "To-Do",
      dueDate: data.dueDate || "",
    };
    setTasks([...tasks, newTask]);
    toast.success("Task added successfully!");

    // TODO: Save task to backend (e.g., Firebase Firestore)
    // Example:
    // import { collection, addDoc } from 'firebase/firestore';
    // import { db } from '../lib/firebase';
    // try {
    //   await addDoc(collection(db, `projects/${projectId}/tasks`), newTask);
    // } catch (err) {
    //   console.error('Failed to save task:', err);
    // }
  };

  // 🛠 Update task
  const updateTask = async (id: number, data: Partial<Task>) => {
    setTasks(
      tasks.map((task) => (task.id === id ? { ...task, ...data } : task))
    );
    toast.success("Task updated successfully!");
    // TODO: Update task in backend (e.g., Firebase Firestore)
    // Example:
    // import { doc, updateDoc } from 'firebase/firestore';
    // import { db } from '../lib/firebase';
    // try {
    //   await updateDoc(doc(db, `projects/${projectId}/tasks`, id.toString()), data);
    // } catch (err) {
    //   console.error('Failed to update task:', err);
    // }
  };

  // ❌ Delete task
  const deleteTask = async (id: number) => {
    setTasks(tasks.filter((task) => task.id !== id));
    toast.success("Task deleted successfully!");
    // TODO: Delete task from backend (e.g., Firebase Firestore)
    // Example:
    // import { doc, deleteDoc } from 'firebase/firestore';
    // import { db } from '../lib/firebase';
    // try {
    //   await deleteDoc(doc(db, `projects/${projectId}/tasks`, id.toString()));
    // } catch (err) {
    //   console.error('Failed to delete task:', err);
    // }
  };

  const confirmDelete = () => {
    if (TaskToDelete) {
      deleteTask(TaskToDelete.id);
      setTaskToDelete(null);
      setIsDeleteDialogOpen(false);
    }
  };

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
    confirmDelete,
    TaskToDelete,
    setTaskToDelete,
    setIsDeleteDialogOpen,
    isDeleteDialogOpen,
  };

  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
};

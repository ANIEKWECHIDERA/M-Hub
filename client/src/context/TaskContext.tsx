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
      companyId: 1,
      projectId: 1,
      title: "Create Logo Concepts",
      assignee: [1],
      status: "To-Do",
      dueDate: "2024-10-01",
      description: "Sketch and iterate on 3 logo options.",
    },
    {
      id: 2,
      companyId: 1,
      projectId: 1,
      title: "Review Brand Guidelines",
      assignee: [2, 3],
      status: "In Progress",
      dueDate: "2024-10-10",
      description: "Ensure all brand assets align with new identity.",
    },
    {
      id: 3,
      companyId: 1,
      projectId: 2,
      title: "Setup Project Repo",
      assignee: [4],
      status: "Done",
      dueDate: "2024-09-01",
      description: "Initialize GitHub repo and CI/CD config.",
    },
    {
      id: 4,
      companyId: 1,
      projectId: 2,
      title: "Design Homepage UI",
      assignee: [10],
      status: "To-Do",
      dueDate: "2024-10-05",
      description: "Create Figma wireframes and hi-fi design.",
    },
    {
      id: 5,
      companyId: 1,
      projectId: 3,
      title: "Write Campaign Copy",
      assignee: [6],
      status: "In Progress",
      dueDate: "2024-09-28",
      description: "Craft marketing copy for product launch.",
    },
    {
      id: 6,
      companyId: 1,
      projectId: 3,
      title: "Setup Email Automation",
      assignee: [7, 5],
      status: "To-Do",
      dueDate: "2024-10-10",
      description: "Configure welcome and launch email workflows.",
    },
    {
      id: 7,
      companyId: 1,
      projectId: 4,
      title: "Test Mobile Responsiveness",
      assignee: [8],
      status: "To-Do",
      dueDate: "2024-10-12",
      description: "Ensure the site works seamlessly on mobile devices.",
    },
    {
      id: 8,
      companyId: 1,
      projectId: 4,
      title: "Client Feedback Review",
      assignee: [2],
      status: "Done",
      dueDate: "2024-09-25",
      description: "Incorporate client's feedback into new designs.",
    },
    {
      id: 9,
      companyId: 1,
      projectId: 5,
      title: "Final Testing",
      assignee: [9, 4],
      status: "To-Do",
      dueDate: "2024-10-20",
      description: "Conduct end-to-end testing before launch.",
    },
    {
      id: 10,
      companyId: 1,
      projectId: 5,
      title: "Deploy to Production",
      assignee: [4],
      status: "To-Do",
      dueDate: "2024-10-25",
      description: "Go live with final version.",
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
  const addTask = async (
    projectId: number,
    companyId: number,
    data: Partial<Task>
  ) => {
    const newTask: Task = {
      id: tasks.length + 1,
      projectId,
      companyId,
      title: data.title || "",
      description: data.description || "",
      assignee: data.assignee || [],
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

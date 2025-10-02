import { createContext, useContext } from "react";
import type { EnrichedTask, Task, TaskContextType } from "../Types/types";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useProjectContext } from "./ProjectContext";

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
  const { projects } = useProjectContext();

  const mockTasks: Task[] = [
    {
      id: 1,
      companyId: 1,
      projectId: 1,
      title: "Create Logo Concepts",
      description: "Sketch and iterate on 3 logo options.",
      status: "To-Do",
      assignee: [1],
      dueDate: "2024-10-01",
      priority: "high",
      createdAt: "2024-01-10T10:00:00Z",
      updatedAt: "2024-01-16T14:30:00Z",
      attachments: 3,
      comments: 5,
      subtasks: [
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
      ],
    },
    {
      id: 2,
      companyId: 1,
      projectId: 1,
      title: "Develop Branding Guidelines",
      description: "Create brand standards for color, typography, and use.",
      status: "In Progress",
      assignee: [2],
      dueDate: "2024-10-05",
      priority: "medium",
      createdAt: "2024-01-11T09:30:00Z",
      updatedAt: "2024-01-20T13:45:00Z",
      attachments: 2,
      comments: 3,
      subtasks: [
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
      ],
    },
    {
      id: 3,
      companyId: 1,
      projectId: 2,
      title: "User Interface Wireframes",
      description:
        "Design wireframes for the mobile app home screen and settings.",
      status: "To-Do",
      assignee: [3, 4],
      dueDate: "2024-10-10",
      priority: "high",
      createdAt: "2024-02-01T12:00:00Z",
      updatedAt: "2024-02-02T14:00:00Z",
      attachments: 1,
      comments: 0,
      subtasks: [
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
      ],
    },
    {
      id: 4,
      companyId: 1,
      projectId: 3,
      title: "Backend API Development",
      description:
        "Develop RESTful APIs for user management and authentication.",
      status: "In Progress",
      assignee: [5],
      dueDate: "2024-10-20",
      priority: "high",
      createdAt: "2024-03-05T10:00:00Z",
      updatedAt: "2024-03-15T11:00:00Z",
      attachments: 4,
      comments: 8,
      subtasks: [
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
      ],
    },
    {
      id: 5,
      companyId: 1,
      projectId: 3,
      title: "Quality Assurance Testing",
      description: "Conduct unit and integration tests for APIs.",
      status: "To-Do",
      assignee: [6],
      dueDate: "2024-10-25",
      priority: "medium",
      createdAt: "2024-03-16T08:00:00Z",
      updatedAt: "2024-03-16T08:00:00Z",
      attachments: 2,
      comments: 1,
      subtasks: [
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
      ],
    },
    {
      id: 6,
      companyId: 1,
      projectId: 4,
      title: "Market Research Analysis",
      description: "Compile and analyze data from recent customer surveys.",
      status: "Done",
      assignee: [7],
      dueDate: "2024-09-30",
      priority: "low",
      createdAt: "2024-01-05T15:00:00Z",
      updatedAt: "2024-01-29T16:00:00Z",
      attachments: 5,
      comments: 7,
      subtasks: [
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
      ],
    },
    {
      id: 7,
      companyId: 1,
      projectId: 5,
      title: "Social Media Campaign",
      description:
        "Plan and launch a social media campaign for product awareness.",
      status: "In Progress",
      assignee: [8],
      dueDate: "2024-10-05",
      priority: "high",
      createdAt: "2024-02-10T11:00:00Z",
      updatedAt: "2024-02-20T14:00:00Z",
      attachments: 3,
      comments: 4,
      subtasks: [
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
      ],
    },
    {
      id: 8,
      companyId: 1,
      projectId: 6,
      title: "Cloud Infrastructure Setup",
      description: "Configure cloud servers and migrate existing applications.",
      status: "To-Do",
      assignee: [9, 10],
      dueDate: "2024-11-01",
      priority: "high",
      createdAt: "2024-04-01T10:00:00Z",
      updatedAt: "2024-04-01T10:00:00Z",
      attachments: 6,
      comments: 2,
      subtasks: [
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
      ],
    },
    {
      id: 9,
      companyId: 1,
      projectId: 6,
      title: "Security Audit",
      description:
        "Perform security vulnerability assessment on internal systems.",
      status: "To-Do",
      assignee: [11],
      dueDate: "2024-11-10",
      priority: "medium",
      createdAt: "2024-04-05T08:00:00Z",
      updatedAt: "2024-04-05T08:00:00Z",
      attachments: 1,
      comments: 0,
      subtasks: [
        {
          id: 19,
          companyId: 4,
          title: "Review firewall configurations",
          completed: false,
          createdAt: "2024-04-05T08:30:00Z",
        },
      ],
    },
    {
      id: 10,
      companyId: 1,
      projectId: 7,
      title: "Content Creation for Blog",
      description: "Write and edit 5 blog posts on industry trends.",
      status: "In Progress",
      assignee: [12],
      dueDate: "2024-10-15",
      priority: "low",
      createdAt: "2024-01-20T14:00:00Z",
      updatedAt: "2024-02-01T16:00:00Z",
      attachments: 4,
      comments: 6,
      subtasks: [
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
      ],
    },
  ];

  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentTask, setCurrentTask] = useState<Task | null>(null);
  const [selectedTask, setSelectedTask] = useState<EnrichedTask | null>(null);
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
      priority: data.priority || "medium",
      createdAt: data.createdAt || "",
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

  const getEnrichedTasks = (): EnrichedTask[] => {
    return tasks.map((task) => {
      const project = projects.find((proj) => proj.id === task.projectId);
      return {
        ...task,
        projectTitle: project?.title || "Unknown Project",
        clientName: project?.client || "Unknown Client",
      };
    });
  };

  const getEnrichedTaskById = (id: number): EnrichedTask | undefined => {
    return getEnrichedTasks().find((task) => task.id === id);
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
    getEnrichedTasks,
    getEnrichedTaskById,
  };

  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
};

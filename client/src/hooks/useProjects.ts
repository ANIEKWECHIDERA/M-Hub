import { useState, useEffect } from "react";
import type { Project } from "../Types/types";

const mockProjects: Project[] = [
  {
    id: 1,
    title: "Brand Redesign for LexCorp",
    client: "LexCorp Inc.",
    status: "In Progress",
    progress: 65,
    deadline: "2024-02-15",
    description:
      "Complete brand overhaul including logo, colors, and guidelines",
    tasks: { total: 12, completed: 8 },
    team: [
      {
        id: 1,
        name: "John Doe",
        role: "Designer",
        avatar: "/placeholder.svg?height=32&width=32",
      },
      {
        id: 2,
        name: "Sarah Smith",
        role: "Project Manager",
        avatar: "/placeholder.svg?height=32&width=32",
      },
      {
        id: 3,
        name: "Mike Johnson",
        role: "Developer",
        avatar: "/placeholder.svg?height=32&width=32",
      },
    ],
  },
  {
    id: 2,
    title: "Website Development",
    client: "StartupXYZ",
    status: "Active",
    progress: 30,
    deadline: "2024-03-01",
    description: "Develop a responsive website for StartupXYZ",
    tasks: { total: 20, completed: 6 },
    team: [
      {
        id: 4,
        name: "Alice Brown",
        role: "Designer",
        avatar: "/placeholder.svg?height=32&width=32",
      },
      {
        id: 5,
        name: "Bob Wilson",
        role: "Developer",
        avatar: "/placeholder.svg?height=32&width=32",
      },
    ],
  },
  {
    id: 3,
    title: "Marketing Campaign",
    client: "RetailCo",
    status: "Completed",
    progress: 100,
    deadline: "2024-01-20",
    description: "Launch a marketing campaign for RetailCo’s new product line",
    tasks: { total: 8, completed: 8 },
    team: [
      {
        id: 6,
        name: "Emma Davis",
        role: "Marketer",
        avatar: "/placeholder.svg?height=32&width=32",
      },
      {
        id: 7,
        name: "David Lee",
        role: "Copywriter",
        avatar: "/placeholder.svg?height=32&width=32",
      },
    ],
  },
];

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 🔄 Fetch projects from API or mock on mount
  const fetchProjects = async () => {
    setLoading(true);
    setError(null);
    try {
      // TODO: Replace with real API call (e.g., Firebase Firestore)
      // Example with Firebase:
      // import { collection, getDocs } from 'firebase/firestore';
      // import { db } from '../lib/firebase';
      // const querySnapshot = await getDocs(collection(db, 'projects'));
      // const projectsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
      // setProjects(projectsData);

      setProjects(mockProjects);
      setLoading(false);
    } catch (err) {
      setError("Failed to fetch projects");
      setLoading(false);
      console.error("Failed to fetch projects:", err);
    }
  };

  // ⏱ Fetch on component mount
  useEffect(() => {
    fetchProjects();
  }, []);

  // ➕ Add project
  const addProject = async (project: Project) => {
    setProjects((prev) => [...prev, project]);
    // TODO: POST to API (e.g., Firebase Firestore)
    // Example:
    // import { collection, addDoc } from 'firebase/firestore';
    // import { db } from '../lib/firebase';
    // try {
    //   await addDoc(collection(db, 'projects'), project);
    // } catch (err) {
    //   console.error('Failed to add project:', err);
    // }
  };

  // 🛠 Update project
  const updateProject = async (id: number, data: Partial<Project>) => {
    setProjects((prev) =>
      prev.map((proj) => (proj.id === id ? { ...proj, ...data } : proj))
    );
    // TODO: PATCH/PUT to API (e.g., Firebase Firestore)
    // Example:
    // import { doc, updateDoc } from 'firebase/firestore';
    // import { db } from '../lib/firebase';
    // try {
    //   await updateDoc(doc(db, 'projects', id.toString()), data);
    // } catch (err) {
    //   console.error('Failed to update project:', err);
    // }
  };

  // ❌ Delete project
  const deleteProject = async (id: number) => {
    setProjects((prev) => prev.filter((proj) => proj.id !== id));
    // TODO: DELETE from API (e.g., Firebase Firestore)
    // Example:
    // import { doc, deleteDoc } from 'firebase/firestore';
    // import { db } from '../lib/firebase';
    // try {
    //   await deleteDoc(doc(db, 'projects', id.toString()));
    // } catch (err) {
    //   console.error('Failed to delete project:', err);
    // }
  };

  return {
    projects,
    setProjects,
    currentProject,
    setCurrentProject,
    loading,
    error,
    fetchProjects,
    addProject,
    updateProject,
    deleteProject,
  };
}

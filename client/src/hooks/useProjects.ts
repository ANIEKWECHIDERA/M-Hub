import { useState, useEffect } from "react";
import type { Project } from "../Types/types";

const mockProjects: Project[] = [
  {
    id: 1,
    title: "Brand Redesign for TechCorp",
    client: "TechCorp Inc.",
    status: "In Progress",
    progress: 65,
    deadline: "2024-02-15",
    tasks: { total: 12, completed: 8 },
    team: ["John", "Sarah", "Mike"],
  },
  {
    id: 2,
    title: "Website Development",
    client: "StartupXYZ",
    status: "Active",
    progress: 30,
    deadline: "2024-03-01",
    tasks: { total: 20, completed: 6 },
    team: ["Alice", "Bob"],
  },
  {
    id: 3,
    title: "Marketing Campaign",
    client: "RetailCo",
    status: "Completed",
    progress: 100,
    deadline: "2024-01-20",
    tasks: { total: 8, completed: 8 },
    team: ["Emma", "David"],
  },
];

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>(mockProjects);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // TODO: Replace with actual backend fetch (e.g., Firebase Firestore)
  // Example with Firebase:
  // import { collection, getDocs } from 'firebase/firestore';
  // import { db } from '../lib/firebase';
  // useEffect(() => {
  //   const fetchProjects = async () => {
  //     try {
  //       const querySnapshot = await getDocs(collection(db, 'projects'));
  //       const projectsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
  //       setProjects(projectsData);
  //       setLoading(false);
  //     } catch (err) {
  //       setError('Failed to fetch projects');
  //       setLoading(false);
  //     }
  //   };
  //   fetchProjects();
  // }, []);

  // Simulate loading for mock data
  useEffect(() => {
    setLoading(false);
  }, []);

  return { projects, loading, error };
}

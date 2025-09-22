// hooks/useNotes.ts
import { useState, useEffect } from "react";
import type { Note } from "../Types/types";

export function useNotes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [currentNote, setCurrentNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sample mock notes
  const mockNotes: Note[] = [
    {
      id: 1,
      title: "Project Meeting Notes",
      content:
        "Discussed timeline and deliverables for TechCorp project. Key points:\n- Logo concepts due by Friday\n- Client feedback session next Tuesday\n- Final delivery by month end",
      project: "TechCorp Project",
      tags: ["meeting", "important"],
      createdAt: "2024-01-15",
      updatedAt: "2024-01-15",
    },
    {
      id: 2,
      title: "Design Ideas",
      content:
        "Color palette inspiration:\n- Deep blue (#1e40af)\n- Warm gray (#6b7280)\n- Accent green (#10b981)\n\nTypography: Consider Inter or Poppins for clean, modern look.",
      project: null,
      tags: ["design", "inspiration"],
      createdAt: "2024-01-14",
      updatedAt: "2024-01-16",
    },
    {
      id: 3,
      title: "Client Feedback",
      content:
        "Client loves the direction we're taking with the brand. Requested minor adjustments to logo spacing and wants to see alternative color options.",
      project: "TechCorp Project",
      tags: ["feedback", "client"],
      createdAt: "2024-01-16",
      updatedAt: "2024-01-16",
    },
  ];

  const fetchNotes = async () => {
    setLoading(true);
    try {
      // TODO: Replace with API call
      // const response = await fetch('/api/notes');
      // const data = await response.json();
      const data = mockNotes;
      setNotes(data);
      setError(null);
    } catch (err) {
      setError("Failed to fetch notes.");
    } finally {
      setLoading(false);
    }
  };

  const addNote = async (note: Note) => {
    setNotes((prev) => [...prev, note]);
    // TODO: POST to API
  };

  const updateNote = async (id: number, data: Partial<Note>) => {
    setNotes((prev) =>
      prev.map((note) =>
        note.id === id
          ? { ...note, ...data, updatedAt: new Date().toISOString() }
          : note
      )
    );
    // TODO: PATCH/PUT to API
  };

  const deleteNote = async (id: number) => {
    setNotes((prev) => prev.filter((note) => note.id !== id));
    // TODO: DELETE from API
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  return {
    notes,
    setNotes,
    currentNote,
    setCurrentNote,
    fetchNotes,
    addNote,
    updateNote,
    deleteNote,
    loading,
    error,
  };
}

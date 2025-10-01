import { createContext, useContext, useEffect, useState } from "react";
import type { Note, NoteContextType } from "../Types/types";
import { toast } from "sonner";

const NoteContext = createContext<NoteContextType | null>(null);

export const useNoteContext = () => {
  const context = useContext(NoteContext);
  if (!context) {
    throw new Error("useNoteContext must be used within a NoteProvider");
  }
  return context;
};

export const NoteContextProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [currentNote, setCurrentNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sample mock notes
  const mockNotes: Note[] = [
    {
      id: 1,
      companyId: 1,
      projectId: 5,
      authorId: 1,
      title: "Project Meeting Notes",
      content:
        "Discussed timeline and deliverrrrrrrrrrrables for LexCorp project. Key points:\n- Logo concepts due by Friday\n- Client feedback session next Tuesday\n- Final delivery by month end",
      tags: ["meeting", "important"],
      createdAt: "2024-01-15",
      updatedAt: "2024-01-15",
    },
    {
      id: 2,

      companyId: 1,
      projectId: 3,
      authorId: 1,
      title: "Design Ideas",
      content:
        "Color palette inspiration:\n- Deep blue (#1e40af)\n- Warm gray (#6b7280)\n- Accent green (#10b981)\n\nTypography: Consider Inter or Poppins for clean, modern look.",

      tags: ["design", "inspiration"],
      createdAt: "2024-01-14",
      updatedAt: "2024-01-16",
    },
    {
      id: 3,
      companyId: 1,
      projectId: 2,
      authorId: 1,
      title: "Client Feedback",
      content:
        "Client loves the direction we're taking with the brand. Requested minor adjustments to logo spacing and wants to see alternative color options.",

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

      setNotes(mockNotes);
      setError(null);
    } catch (err) {
      setError("Failed to fetch notes.");
    } finally {
      setLoading(false);
    }
  };

  const addNote = async (note: Note) => {
    setNotes((prev) => [...prev, note]);
    toast.success("Note added successfully");
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
    toast.success("Note updated successfully");
    // TODO: PATCH/PUT to API
  };

  const deleteNote = async (id: number) => {
    setNotes((prev) => prev.filter((note) => note.id !== id));
    toast.success("Note deleted successfully");
    // TODO: DELETE from API
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  const value = {
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
    tags: [],
  };

  return <NoteContext.Provider value={value}>{children}</NoteContext.Provider>;
};

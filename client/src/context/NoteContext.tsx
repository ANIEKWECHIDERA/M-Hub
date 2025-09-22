import { createContext, useContext } from "react";
import { useNotes } from "@/hooks/useNotes";
import type { NoteContextType } from "../Types/types";

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
  const {
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
  } = useNotes();

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
  };

  return <NoteContext.Provider value={value}>{children}</NoteContext.Provider>;
};

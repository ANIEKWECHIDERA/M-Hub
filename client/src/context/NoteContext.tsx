import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type {
  CreateNoteInput,
  Note,
  NoteContextType,
  NoteSummary,
  UpdateNoteInput,
} from "../Types/types";
import { notesAPI } from "@/api/notes.api";
import { useAuthContext } from "./AuthContext";

const NoteContext = createContext<NoteContextType | null>(null);

export const useNoteContext = () => {
  const context = useContext(NoteContext);
  if (!context) {
    throw new Error("useNoteContext must be used within a NoteContextProvider");
  }
  return context;
};

const toSummary = (note: Note): NoteSummary => ({
  id: note.id,
  companyId: note.companyId,
  projectId: note.projectId,
  authorId: note.authorId,
  title: note.title,
  plainTextPreview: note.plainTextPreview,
  pinned: note.pinned,
  archivedAt: note.archivedAt,
  createdAt: note.createdAt,
  updatedAt: note.updatedAt,
  lastEditedAt: note.lastEditedAt,
  tags: note.tags,
});

export const NoteContextProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { idToken, authStatus } = useAuthContext();
  const [notes, setNotes] = useState<NoteSummary[]>([]);
  const [currentNote, setCurrentNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentNoteLoading, setCurrentNoteLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const detailCacheRef = useRef<Record<string, Note>>({});

  const replaceSummary = useCallback((updatedNote: Note) => {
    const summary = toSummary(updatedNote);

    setNotes((previous) => {
      const next = previous.some((note) => note.id === summary.id)
        ? previous.map((note) => (note.id === summary.id ? summary : note))
        : [summary, ...previous];

      return [...next].sort((left, right) => {
        if (left.pinned !== right.pinned) {
          return left.pinned ? -1 : 1;
        }

        return (
          new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
        );
      });
    });

    detailCacheRef.current[updatedNote.id] = updatedNote;
    setCurrentNote((previous) =>
      previous?.id === updatedNote.id ? updatedNote : previous,
    );
  }, []);

  const fetchNotes = useCallback(
    async (options?: { archived?: boolean; q?: string }) => {
      if (!idToken || authStatus?.onboardingState !== "ACTIVE") {
        setNotes([]);
        setCurrentNote(null);
        setError(null);
        return;
      }

      setLoading(true);
      try {
        const data = await notesAPI.list(idToken, options);
        setNotes(data);
        setError(null);

        setCurrentNote((previous) =>
          previous && !data.some((note) => note.id === previous.id)
            ? null
            : previous,
        );
      } catch (noteError: any) {
        setError(noteError.message || "Failed to fetch notes");
      } finally {
        setLoading(false);
      }
    },
    [authStatus?.onboardingState, idToken],
  );

  const openNote = useCallback(
    async (id: string) => {
      if (!idToken || authStatus?.onboardingState !== "ACTIVE") {
        return null;
      }

      if (currentNote?.id === id) {
        setCurrentNoteLoading(false);
        return currentNote;
      }

      if (detailCacheRef.current[id]) {
        setCurrentNoteLoading(false);
        setError(null);
        setCurrentNote(detailCacheRef.current[id]);
        return detailCacheRef.current[id];
      }

      setCurrentNoteLoading(true);
      try {
        const note = await notesAPI.getById(id, idToken);
        detailCacheRef.current[id] = note;
        setError(null);
        setCurrentNote(note);
        return note;
      } catch (noteError: any) {
        setError(noteError.message || "Failed to open note");
        return null;
      } finally {
        setCurrentNoteLoading(false);
      }
    },
    [authStatus?.onboardingState, currentNote, idToken],
  );

  const clearCurrentNote = useCallback(() => {
    setCurrentNote(null);
  }, []);

  const createNote = useCallback(
    async (payload?: CreateNoteInput) => {
      if (!idToken) {
        throw new Error("You must be signed in to create notes");
      }

      const note = await notesAPI.create(
        {
          title: payload?.title,
          content_html: payload?.contentHtml,
          project_id: payload?.projectId ?? null,
          pinned: payload?.pinned,
          tags: payload?.tags,
        },
        idToken,
      );

      replaceSummary(note);
      setCurrentNote(note);
      toast.success("Note created");
      return note;
    },
    [idToken, replaceSummary],
  );

  const updateNote = useCallback(
    async (id: string, data: UpdateNoteInput) => {
      if (!idToken) {
        throw new Error("You must be signed in to update notes");
      }

      const note = await notesAPI.update(
        id,
        {
          title: data.title,
          content_html: data.contentHtml,
          project_id: data.projectId ?? null,
          pinned: data.pinned,
          tags: data.tags,
        },
        idToken,
      );

      replaceSummary(note);
      return note;
    },
    [idToken, replaceSummary],
  );

  const archiveNote = useCallback(
    async (id: string) => {
      if (!idToken) {
        throw new Error("You must be signed in to archive notes");
      }

      await notesAPI.archive(id, idToken);
      delete detailCacheRef.current[id];
      setNotes((previous) => previous.filter((note) => note.id !== id));
      setCurrentNote((previous) => (previous?.id === id ? null : previous));
      toast.success("Note archived");
    },
    [idToken],
  );

  const restoreNote = useCallback(
    async (id: string) => {
      if (!idToken) {
        throw new Error("You must be signed in to restore notes");
      }

      const note = await notesAPI.restore(id, idToken);
      replaceSummary(note);
      toast.success("Note restored");
      return note;
    },
    [idToken, replaceSummary],
  );

  const setPinned = useCallback(
    async (id: string, pinned: boolean) => {
      if (!idToken) {
        throw new Error("You must be signed in to pin notes");
      }

      const note = await notesAPI.setPinned(id, pinned, idToken);
      replaceSummary(note);
      return note;
    },
    [idToken, replaceSummary],
  );

  useEffect(() => {
    detailCacheRef.current = {};
    setNotes([]);
    setCurrentNote(null);
    setError(null);
  }, [authStatus?.companyId, authStatus?.onboardingState, idToken]);

  const value = useMemo<NoteContextType>(
    () => ({
      notes,
      currentNote,
      loading,
      currentNoteLoading,
      error,
      fetchNotes,
      openNote,
      clearCurrentNote,
      createNote,
      updateNote,
      archiveNote,
      restoreNote,
      setPinned,
    }),
    [
      archiveNote,
      clearCurrentNote,
      createNote,
      currentNote,
      currentNoteLoading,
      error,
      fetchNotes,
      loading,
      notes,
      openNote,
      restoreNote,
      setPinned,
      updateNote,
    ],
  );

  return <NoteContext.Provider value={value}>{children}</NoteContext.Provider>;
};

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
const TEMP_NOTE_PREFIX = "temp-note:";
type NotesCacheBucket = {
  loaded: boolean;
  notes: NoteSummary[];
};

const sortNotes = (input: NoteSummary[]) =>
  [...input].sort((left, right) => {
    if (left.pinned !== right.pinned) {
      return left.pinned ? -1 : 1;
    }

    return (
      new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
    );
  });

const extractPreview = (contentHtml?: string) =>
  (contentHtml ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);

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
  const pendingDetailRequestsRef = useRef<Record<string, Promise<Note | null>>>({});
  const currentBucketRef = useRef<"active" | "archived">("active");
  const notesCacheRef = useRef<Record<"active" | "archived", NotesCacheBucket>>({
    active: { loaded: false, notes: [] },
    archived: { loaded: false, notes: [] },
  });

  const setCacheBucket = useCallback((bucket: "active" | "archived", nextNotes: NoteSummary[]) => {
    notesCacheRef.current[bucket] = {
      loaded: true,
      notes: sortNotes(nextNotes),
    };
  }, []);

  const removeFromCache = useCallback((id: string) => {
    setCacheBucket(
      "active",
      notesCacheRef.current.active.notes.filter((note) => note.id !== id),
    );
    setCacheBucket(
      "archived",
      notesCacheRef.current.archived.notes.filter((note) => note.id !== id),
    );
  }, [setCacheBucket]);

  const upsertSummary = useCallback((summary: NoteSummary) => {
    const targetBucket: "active" | "archived" = summary.archivedAt ? "archived" : "active";
    const otherBucket: "active" | "archived" = targetBucket === "active" ? "archived" : "active";

    setCacheBucket(
      otherBucket,
      notesCacheRef.current[otherBucket].notes.filter((note) => note.id !== summary.id),
    );
    setCacheBucket(
      targetBucket,
      [
        summary,
        ...notesCacheRef.current[targetBucket].notes.filter(
          (note) => note.id !== summary.id,
        ),
      ],
    );
  }, []);

  const replaceSummary = useCallback((updatedNote: Note) => {
    const summary = toSummary(updatedNote);
    upsertSummary(summary);

    setNotes((previous) => {
      const belongsInCurrent =
        currentBucketRef.current === "archived"
          ? Boolean(summary.archivedAt)
          : !summary.archivedAt;

      if (!belongsInCurrent) {
        return previous.filter((note) => note.id !== summary.id);
      }

      return sortNotes([
        summary,
        ...previous.filter((note) => note.id !== summary.id),
      ]);
    });

    detailCacheRef.current[updatedNote.id] = updatedNote;
    setCurrentNote((previous) =>
      previous?.id === updatedNote.id ? updatedNote : previous,
    );
  }, [upsertSummary]);

  const fetchNotes = useCallback(
    async (options?: { archived?: boolean; q?: string }) => {
      if (!idToken || authStatus?.onboardingState !== "ACTIVE") {
        setNotes([]);
        setCurrentNote(null);
        setError(null);
        return;
      }

      const bucketKey = options?.archived ? "archived" : "active";
      currentBucketRef.current = bucketKey;
      const cachedBucket = notesCacheRef.current[bucketKey];
      if (!options?.q?.trim() && cachedBucket.loaded) {
        setNotes(cachedBucket.notes);
        setError(null);
        setCurrentNote((previous) =>
          previous && !cachedBucket.notes.some((note) => note.id === previous.id)
            ? null
            : previous,
        );
        return;
      }

      setLoading(true);
      try {
        const data = await notesAPI.list(idToken, options);
        setNotes(data);
        if (!options?.q?.trim()) {
          setCacheBucket(bucketKey, data);
        }
        setError(null);

        setCurrentNote((previous) =>
          previous && !data.some((note) => note.id === previous.id)
            ? null
            : previous,
        );

        const warmIds = data
          .filter((note) => !detailCacheRef.current[note.id])
          .slice(0, 4)
          .map((note) => note.id);

        for (const noteId of warmIds) {
          if (!pendingDetailRequestsRef.current[noteId]) {
            pendingDetailRequestsRef.current[noteId] = notesAPI
              .getById(noteId, idToken)
              .then((note) => {
                detailCacheRef.current[noteId] = note;
                return note;
              })
              .catch(() => null)
              .finally(() => {
                delete pendingDetailRequestsRef.current[noteId];
              });
          }
        }
      } catch (noteError: any) {
        setError(noteError.message || "Failed to fetch notes");
      } finally {
        setLoading(false);
      }
    },
    [authStatus?.onboardingState, idToken, setCacheBucket],
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
        const existingRequest = pendingDetailRequestsRef.current[id];
        const request =
          existingRequest ??
          notesAPI.getById(id, idToken).finally(() => {
            delete pendingDetailRequestsRef.current[id];
          });

        pendingDetailRequestsRef.current[id] = request;

        const note = await request;
        if (!note) {
          setError("Failed to open note");
          return null;
        }
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

      const now = new Date().toISOString();
      const tempId = `${TEMP_NOTE_PREFIX}${crypto.randomUUID()}`;
      const tempNote: Note = {
        id: tempId,
        companyId: authStatus?.companyId ?? "",
        projectId: payload?.projectId ?? null,
        authorId: "local",
        title: payload?.title?.trim() || "Untitled note",
        plainTextPreview: extractPreview(payload?.contentHtml),
        pinned: payload?.pinned ?? false,
        archivedAt: null,
        createdAt: now,
        updatedAt: now,
        lastEditedAt: now,
        tags: payload?.tags ?? [],
        contentHtml: payload?.contentHtml ?? "",
      };

      detailCacheRef.current[tempId] = tempNote;
      replaceSummary(tempNote);
      setCurrentNote(tempNote);
      setError(null);

      void (async () => {
        try {
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

          delete detailCacheRef.current[tempId];
          replaceSummary(note);
          setCurrentNote((previous) => (previous?.id === tempId ? note : previous));
          toast.success("Note created");
        } catch (createError: any) {
          delete detailCacheRef.current[tempId];
          setNotes((previous) => {
            const next = previous.filter((note) => note.id !== tempId);
            removeFromCache(tempId);
            return next;
          });
          setCurrentNote((previous) => (previous?.id === tempId ? null : previous));
          setError(createError.message || "Failed to create note");
          toast.error(createError.message || "Failed to create note");
        }
      })();

      return tempNote;
    },
    [authStatus?.companyId, idToken, removeFromCache, replaceSummary],
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

      const currentSnapshot = detailCacheRef.current[id] ?? currentNote;
      const archivedSnapshot =
        currentSnapshot
          ? {
              ...currentSnapshot,
              archivedAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }
          : null;
      const previousNotes = notes;
      delete detailCacheRef.current[id];
      if (archivedSnapshot) {
        upsertSummary(toSummary(archivedSnapshot));
      } else {
        removeFromCache(id);
      }
      setNotes((previous) => {
        return previous.filter((note) => note.id !== id);
      });
      setCurrentNote((previous) => (previous?.id === id ? null : previous));

      try {
        await notesAPI.archive(id, idToken);
        toast.success("Note archived");
      } catch (archiveError) {
        if (currentSnapshot) {
          detailCacheRef.current[id] = currentSnapshot;
          upsertSummary(toSummary(currentSnapshot));
        }
        setNotes(previousNotes);
        setCurrentNote((previous) =>
          previous ?? (currentSnapshot?.id === id ? currentSnapshot : null),
        );
        throw archiveError;
      }
    },
    [currentNote, idToken, notes, removeFromCache, upsertSummary],
  );

  const deleteNote = useCallback(
    async (id: string) => {
      if (!idToken) {
        throw new Error("You must be signed in to delete notes");
      }

      const currentSnapshot = detailCacheRef.current[id] ?? currentNote;
      const previousNotes = notes;
      delete detailCacheRef.current[id];
      removeFromCache(id);
      setNotes((previous) => previous.filter((note) => note.id !== id));
      setCurrentNote((previous) => (previous?.id === id ? null : previous));

      try {
        await notesAPI.delete(id, idToken);
        toast.success("Note deleted");
      } catch (deleteError) {
        if (currentSnapshot) {
          detailCacheRef.current[id] = currentSnapshot;
          upsertSummary(toSummary(currentSnapshot));
        }
        setNotes(previousNotes);
        setCurrentNote((previous) =>
          previous ?? (currentSnapshot?.id === id ? currentSnapshot : null),
        );
        throw deleteError;
      }
    },
    [currentNote, idToken, notes, removeFromCache, upsertSummary],
  );

  const restoreNote = useCallback(
    async (id: string) => {
      if (!idToken) {
        throw new Error("You must be signed in to restore notes");
      }

      const cachedNote = detailCacheRef.current[id] ?? null;
      if (cachedNote) {
        const optimistic = {
          ...cachedNote,
          archivedAt: null,
          updatedAt: new Date().toISOString(),
          lastEditedAt: cachedNote.lastEditedAt,
        };
        replaceSummary(optimistic);
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

      const previousDetail = detailCacheRef.current[id] ?? currentNote;
      if (previousDetail) {
        replaceSummary({
          ...previousDetail,
          pinned,
          updatedAt: new Date().toISOString(),
        });
      }

      try {
        const note = await notesAPI.setPinned(id, pinned, idToken);
        replaceSummary(note);
        return note;
      } catch (pinError) {
        if (previousDetail) {
          replaceSummary(previousDetail);
        }
        throw pinError;
      }
    },
    [idToken, replaceSummary],
  );

  useEffect(() => {
    detailCacheRef.current = {};
    notesCacheRef.current = {
      active: { loaded: false, notes: [] },
      archived: { loaded: false, notes: [] },
    };
    pendingDetailRequestsRef.current = {};
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
      deleteNote,
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
      deleteNote,
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

import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  Archive,
  Check,
  Clock3,
  FilePlus2,
  FileText,
  Loader2,
  MoreHorizontal,
  Pin,
  PinOff,
  Search,
  Tag,
} from "lucide-react";
import type { Note, NoteSummary } from "@/Types/types";
import { useNoteContext } from "@/context/NoteContext";
import { useProjectContext } from "@/context/ProjectContext";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NoteEditor } from "@/components/notes/NoteEditor";
import {
  buildNoteSearchText,
  EMPTY_NOTE_HTML,
  getNoteSaveStateLabel,
  normalizeNoteTagsClient,
  normalizeNoteTitleClient,
  sanitizeNoteHtmlClient,
} from "@/lib/notes";
import { formatRelativeTimestamp } from "@/lib/datetime";

type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";
const TEMP_NOTE_PREFIX = "temp-note:";
const isTempNoteId = (id?: string | null) => Boolean(id?.startsWith(TEMP_NOTE_PREFIX));

function useIsMobileScreen() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const handleChange = () => setIsMobile(mediaQuery.matches);

    handleChange();
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return isMobile;
}

export default function Notepad() {
  const {
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
    deleteNote,
    restoreNote,
    setPinned,
  } = useNoteContext();
  const { projects } = useProjectContext();
  const isMobile = useIsMobileScreen();

  const [showArchived, setShowArchived] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [archiveTarget, setArchiveTarget] = useState<Note | null>(null);
  const [bulkMode, setBulkMode] = useState<"delete" | "archive" | null>(null);
  const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>([]);
  const [editorTitle, setEditorTitle] = useState("");
  const [editorContentHtml, setEditorContentHtml] = useState(EMPTY_NOTE_HTML);
  const [editorTagsInput, setEditorTagsInput] = useState("");
  const [editorProjectId, setEditorProjectId] = useState<string>("none");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [isCreating, setIsCreating] = useState(false);
  const [isActionBusy, setIsActionBusy] = useState(false);
  const [mobileNoteOpen, setMobileNoteOpen] = useState(false);

  const deferredSearchTerm = useDeferredValue(searchTerm);
  const loadedNoteIdRef = useRef<string | null>(null);
  const saveTimeoutRef = useRef<number | null>(null);
  const lastPersistedSignatureRef = useRef("");
  const currentNoteRef = useRef<Note | null>(null);
  const draftPayloadRef = useRef<{
    title: string;
    contentHtml: string;
    projectId: string | null;
    pinned: boolean;
    tags: string[];
  } | null>(null);
  const draftSignatureRef = useRef("");
  const savePromiseRef = useRef<Promise<void> | null>(null);
  const shouldSaveAgainRef = useRef(false);

  const filteredNotes = useMemo(() => {
    const query = deferredSearchTerm.trim().toLowerCase();

    if (!query) {
      return notes;
    }

    return notes.filter((note) =>
      buildNoteSearchText(note).includes(query),
    );
  }, [deferredSearchTerm, notes]);

  const editorTags = useMemo(
    () =>
      normalizeNoteTagsClient(
        editorTagsInput
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
      ),
    [editorTagsInput],
  );

  const currentProjectTitle = useMemo(() => {
    if (!currentNote?.projectId) {
      return null;
    }

    return (
      projects.find((project) => project.id === currentNote.projectId)?.title ?? null
    );
  }, [currentNote?.projectId, projects]);

  const draftPayload = useMemo(
    () => ({
      title: normalizeNoteTitleClient(editorTitle),
      contentHtml: sanitizeNoteHtmlClient(editorContentHtml),
      projectId: editorProjectId === "none" ? null : editorProjectId,
      pinned: currentNote?.pinned ?? false,
      tags: editorTags,
    }),
    [currentNote?.pinned, editorContentHtml, editorProjectId, editorTags, editorTitle],
  );

  const draftSignature = useMemo(
    () => JSON.stringify(draftPayload),
    [draftPayload],
  );

  useEffect(() => {
    if (showArchived) {
      clearCurrentNote();
      setMobileNoteOpen(false);
      setBulkMode(null);
      setSelectedNoteIds([]);
    }
  }, [clearCurrentNote, showArchived]);

  useEffect(() => {
    if (!isMobile) {
      setMobileNoteOpen(false);
    }
  }, [isMobile]);

  useEffect(() => {
    setSelectedNoteIds((previous) =>
      previous.filter((id) => filteredNotes.some((note) => note.id === id)),
    );
  }, [filteredNotes]);

  useEffect(() => {
    fetchNotes({ archived: showArchived });
  }, [fetchNotes, showArchived]);

  useEffect(() => {
    if (!currentNote || loadedNoteIdRef.current === currentNote.id) {
      return;
    }

    const previousNoteId = loadedNoteIdRef.current;
    const movedFromTempToPersisted =
      isTempNoteId(previousNoteId) && !isTempNoteId(currentNote.id);

    if (movedFromTempToPersisted) {
      loadedNoteIdRef.current = currentNote.id;
      const persistedSignature = JSON.stringify({
        title: currentNote.title,
        contentHtml: sanitizeNoteHtmlClient(currentNote.contentHtml),
        projectId: currentNote.projectId,
        pinned: currentNote.pinned,
        tags: currentNote.tags,
      });
      lastPersistedSignatureRef.current = persistedSignature;
      setSaveState(
        draftSignatureRef.current === persistedSignature ? "saved" : "dirty",
      );
      return;
    }

    loadedNoteIdRef.current = currentNote.id;
    setEditorTitle(currentNote.title);
    setEditorContentHtml(currentNote.contentHtml);
    setEditorTagsInput(currentNote.tags.join(", "));
    setEditorProjectId(currentNote.projectId ?? "none");
    setSaveState("saved");
    lastPersistedSignatureRef.current = JSON.stringify({
      title: currentNote.title,
      contentHtml: sanitizeNoteHtmlClient(currentNote.contentHtml),
      projectId: currentNote.projectId,
      pinned: currentNote.pinned,
      tags: currentNote.tags,
    });
  }, [currentNote]);

  useEffect(() => {
    currentNoteRef.current = currentNote;
  }, [currentNote]);

  useEffect(() => {
    draftPayloadRef.current = draftPayload;
    draftSignatureRef.current = draftSignature;
  }, [draftPayload, draftSignature]);

  useEffect(() => {
    if (!currentNote || loadedNoteIdRef.current !== currentNote.id) {
      return;
    }

    if (draftSignature === lastPersistedSignatureRef.current) {
      if (saveState !== "saving" && saveState !== "saved") {
        setSaveState("saved");
      }
      return;
    }

    setSaveState("dirty");
  }, [currentNote, draftSignature, saveState]);

  const persistDraft = useCallback(async () => {
    const activeNote = currentNoteRef.current;
    if (!activeNote) {
      return;
    }

    if (isTempNoteId(activeNote.id)) {
      setSaveState("dirty");
      return;
    }

    if (draftSignatureRef.current === lastPersistedSignatureRef.current) {
      setSaveState("saved");
      return;
    }

    if (savePromiseRef.current) {
      shouldSaveAgainRef.current = true;
      await savePromiseRef.current;
      return;
    }

    const noteId = activeNote.id;
    const payload = draftPayloadRef.current;
    const signature = draftSignatureRef.current;

    savePromiseRef.current = (async () => {
      setSaveState("saving");

      try {
        const updatedNote = await updateNote(noteId, payload);

        lastPersistedSignatureRef.current = JSON.stringify({
          title: updatedNote.title,
          contentHtml: sanitizeNoteHtmlClient(updatedNote.contentHtml),
          projectId: updatedNote.projectId,
          pinned: updatedNote.pinned,
          tags: updatedNote.tags,
        });

        if (currentNoteRef.current?.id === updatedNote.id) {
          setSaveState("saved");
        }
      } catch (saveError: any) {
        setSaveState("error");
        toast.error(saveError.message || "Failed to save note");
      } finally {
        savePromiseRef.current = null;

        if (
          shouldSaveAgainRef.current &&
          currentNoteRef.current?.id === noteId &&
          draftSignatureRef.current !== lastPersistedSignatureRef.current
        ) {
          shouldSaveAgainRef.current = false;
          void persistDraft();
        } else {
          shouldSaveAgainRef.current = false;
        }
      }
    })();

    await savePromiseRef.current;
  }, [updateNote]);

  useEffect(() => {
    if (!currentNote || saveState !== "dirty") {
      return;
    }

    if (saveTimeoutRef.current) {
      window.clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = window.setTimeout(() => {
      void persistDraft();
    }, 800);

    return () => {
      if (saveTimeoutRef.current) {
        window.clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [currentNote, persistDraft, saveState]);

  const flushPendingSave = useCallback(async () => {
    if (saveTimeoutRef.current) {
      window.clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    if (saveState === "dirty") {
      await persistDraft();
    } else if (savePromiseRef.current) {
      await savePromiseRef.current;
    }
  }, [persistDraft, saveState]);

  const handleCreateNote = async () => {
    setIsCreating(true);
    try {
      await flushPendingSave();
      await createNote({
        title: "Untitled note",
        contentHtml: EMPTY_NOTE_HTML,
      });
      loadedNoteIdRef.current = null;
      setMobileNoteOpen(true);
    } catch (createError: any) {
      toast.error(createError.message || "Failed to create note");
    } finally {
      setIsCreating(false);
    }
  };

  const handleSelectNote = async (note: NoteSummary) => {
    await flushPendingSave();
    await openNote(note.id);
    setMobileNoteOpen(true);
  };

  const handleTogglePin = async () => {
    if (!currentNote) {
      return;
    }

    try {
      setIsActionBusy(true);
      const updated = await setPinned(currentNote.id, !currentNote.pinned);
      if (updated) {
        loadedNoteIdRef.current = null;
        await openNote(updated.id);
      }
      toast.success(currentNote.pinned ? "Note unpinned" : "Note pinned");
    } catch (pinError: any) {
      toast.error(pinError.message || "Failed to update note");
    } finally {
      setIsActionBusy(false);
    }
  };

  const handleArchive = async () => {
    if (!archiveTarget) {
      return;
    }

    try {
      setIsActionBusy(true);
      await flushPendingSave();
      await archiveNote(archiveTarget.id);
      setArchiveTarget(null);
      loadedNoteIdRef.current = null;
      setMobileNoteOpen(false);
    } catch (archiveError: any) {
      toast.error(archiveError.message || "Failed to archive note");
    } finally {
      setIsActionBusy(false);
    }
  };

  const handleRestore = async (noteId: string) => {
    try {
      setIsActionBusy(true);
      const restored = await restoreNote(noteId);
      if (restored) {
        setShowArchived(false);
        loadedNoteIdRef.current = null;
        await openNote(restored.id);
        setMobileNoteOpen(true);
      }
    } catch (restoreError: any) {
      toast.error(restoreError.message || "Failed to restore note");
    } finally {
      setIsActionBusy(false);
    }
  };

  const isSelected = useCallback(
    (noteId: string) => selectedNoteIds.includes(noteId),
    [selectedNoteIds],
  );

  const toggleSelectedNote = useCallback((noteId: string) => {
    setSelectedNoteIds((previous) =>
      previous.includes(noteId)
        ? previous.filter((id) => id !== noteId)
        : [...previous, noteId],
    );
  }, []);

  const startBulkMode = useCallback((mode: "delete" | "archive") => {
    setBulkMode(mode);
    setSelectedNoteIds([]);
  }, []);

  const cancelBulkMode = useCallback(() => {
    setBulkMode(null);
    setSelectedNoteIds([]);
  }, []);

  const handleBulkApply = useCallback(async () => {
    if (selectedNoteIds.length === 0) {
      return;
    }

    try {
      setIsActionBusy(true);
      await flushPendingSave();
      if (bulkMode === "archive") {
        await Promise.all(selectedNoteIds.map((id) => archiveNote(id)));
      } else {
        await Promise.all(selectedNoteIds.map((id) => deleteNote(id)));
      }
      toast.success(
        bulkMode === "archive"
          ? "Selected notes archived"
          : "Selected notes deleted",
      );
      cancelBulkMode();
    } catch (bulkError: any) {
      toast.error(bulkError.message || "Failed to update selected notes");
    } finally {
      setIsActionBusy(false);
    }
  }, [archiveNote, bulkMode, cancelBulkMode, deleteNote, flushPendingSave, selectedNoteIds]);

  const listEmptyState = showArchived ? (
    <Empty className="border-none px-4 py-14">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Archive className="size-5" />
        </EmptyMedia>
        <EmptyTitle>No archived notes</EmptyTitle>
        <EmptyDescription>
          Archived notes will appear here so you can restore them later.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  ) : (
    <Empty className="border-none px-4 py-14">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <FileText className="size-5" />
        </EmptyMedia>
        <EmptyTitle>No notes yet</EmptyTitle>
        <EmptyDescription>
          Create your first personal note for planning, briefs, or quick capture.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );

  const showListPane = !isMobile || !mobileNoteOpen;
  const showEditorPane = !isMobile || mobileNoteOpen;

  return (
    <div className="flex h-[calc(100vh-8rem)] min-h-0 gap-4">
      {showListPane && (
      <Card className="flex min-h-0 w-full shrink-0 flex-col overflow-hidden md:w-[22rem]">
        <div className="flex items-center justify-between border-b px-4 py-4">
          <div>
            <h1 className="text-lg font-semibold">Notes</h1>
            <p className="text-sm text-muted-foreground">
              Personal notes scoped to your active workspace.
            </p>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button onClick={handleCreateNote} size="icon" disabled={isCreating}>
                {isCreating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FilePlus2 className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Create a new note</TooltipContent>
          </Tooltip>
        </div>

        <div className="space-y-3 border-b px-4 py-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search notes"
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            {!showArchived ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="min-w-[5.5rem] rounded-lg"
                  >
                    <MoreHorizontal className="mr-2 h-4 w-4" />
                    Actions
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onClick={() => startBulkMode("archive")}>
                    Mark to archive
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => startBulkMode("delete")}
                  >
                    Mark to delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="min-w-[5.5rem]" />
            )}
            <Button
              type="button"
              variant={!showArchived ? "default" : "outline"}
              size="sm"
              className="min-w-[5.5rem] rounded-lg"
              onClick={() => setShowArchived(false)}
            >
              Active
            </Button>
            <Button
              type="button"
              variant={showArchived ? "default" : "outline"}
              size="sm"
              className="min-w-[5.5rem] rounded-lg"
              onClick={() => setShowArchived(true)}
            >
              Archived
            </Button>
          </div>
          {bulkMode ? (
            <div className="flex items-center justify-between gap-2 rounded-lg border bg-muted/40 px-3 py-2">
              <div className="text-xs text-muted-foreground">
                {bulkMode === "archive"
                  ? "Select notes to archive"
                  : "Select notes to mark for deletion"}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 rounded-md px-2 text-xs"
                  onClick={cancelBulkMode}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="h-8 rounded-md px-2 text-xs"
                  disabled={selectedNoteIds.length === 0 || isActionBusy}
                  onClick={() => void handleBulkApply()}
                >
                  {bulkMode === "archive" ? "Archive" : "Delete"} ({selectedNoteIds.length})
                </Button>
              </div>
            </div>
          ) : null}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
          {loading ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading notes...
            </div>
          ) : filteredNotes.length === 0 ? (
            listEmptyState
          ) : (
            <div className="space-y-2">
              {filteredNotes.map((note) => {
                const isActive = currentNote?.id === note.id;
                return (
                  <div
                    key={note.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => void handleSelectNote(note)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        void handleSelectNote(note);
                      }
                    }}
                    className={`rounded-xl border px-3 py-3 transition ${
                      isActive
                        ? "border-primary bg-primary/5"
                        : "border-border bg-card hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1 text-left">
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2">
                            {note.pinned && <Pin className="h-3.5 w-3.5 text-amber-500" />}
                            <span className="truncate text-sm font-medium">
                              {note.title}
                            </span>
                          </div>
                          <p className="line-clamp-2 text-xs text-muted-foreground">
                            {note.plainTextPreview || "Empty note"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="shrink-0 text-xs text-muted-foreground">
                          {formatRelativeTimestamp(note.updatedAt)}
                        </div>
                        {bulkMode && !showArchived ? (
                          <button
                            type="button"
                            className={`flex h-5 w-5 items-center justify-center rounded border transition ${
                              isSelected(note.id)
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-muted-foreground/30 bg-background"
                            }`}
                            onClick={(event) => {
                              event.stopPropagation();
                              toggleSelectedNote(note.id);
                            }}
                            aria-label={
                              isSelected(note.id) ? "Unselect note" : "Select note"
                            }
                          >
                            {isSelected(note.id) ? (
                              <Check className="h-3.5 w-3.5" />
                            ) : null}
                          </button>
                        ) : null}
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {note.tags.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-[11px]">
                          {tag}
                        </Badge>
                      ))}
                      {note.tags.length > 3 ? (
                        <span className="text-[11px] text-muted-foreground">
                          +{note.tags.length - 3} more tags
                        </span>
                      ) : null}
                      {showArchived ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="ml-auto h-7 rounded-md px-2 text-xs"
                          onClick={(event) => {
                            event.stopPropagation();
                            void handleRestore(note.id);
                          }}
                        >
                          Restore
                        </Button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Card>
      )}

      {showEditorPane && (
      <Card className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {error ? (
          <div className="flex flex-1 items-center justify-center p-6">
            <Empty className="max-w-lg">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <FileText className="size-5" />
                </EmptyMedia>
                <EmptyTitle>Notes are unavailable</EmptyTitle>
                <EmptyDescription>{error}</EmptyDescription>
              </EmptyHeader>
            </Empty>
          </div>
        ) : currentNoteLoading ? (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Opening note...
          </div>
        ) : currentNote ? (
          <>
            <div className="sticky top-0 z-10 border-b bg-background/95 px-5 py-4 backdrop-blur">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0 flex-1 space-y-3">
                  <div className="flex min-w-0 items-start gap-3">
                    {isMobile && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 shrink-0"
                        onClick={() => setMobileNoteOpen(false)}
                      >
                        <ArrowLeft className="h-4 w-4" />
                        <span className="sr-only">Back to notes</span>
                      </Button>
                    )}
                    <div className="min-w-0 flex-1 space-y-3">
                      <Input
                        value={editorTitle}
                        onChange={(event) => setEditorTitle(event.target.value)}
                        onBlur={() => void flushPendingSave()}
                        placeholder="Untitled note"
                        className="h-11 border-0 px-0 text-2xl font-semibold shadow-none focus-visible:ring-0"
                      />
                      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5">
                          <Clock3 className="h-4 w-4" />
                          {getNoteSaveStateLabel(saveState)}
                        </span>
                        <span>
                          Edited {formatRelativeTimestamp(currentNote.lastEditedAt)}
                        </span>
                        {currentProjectTitle ? (
                          <Badge variant="outline">{currentProjectTitle}</Badge>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => void handleTogglePin()}
                        disabled={isActionBusy}
                      >
                        {currentNote.pinned ? (
                          <PinOff className="h-4 w-4" />
                        ) : (
                          <Pin className="h-4 w-4" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {currentNote.pinned ? "Unpin note" : "Pin note"}
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setArchiveTarget(currentNote)}
                        disabled={isActionBusy}
                      >
                        <Archive className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Archive note</TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </div>

            <div className="grid min-h-0 flex-1 gap-4 overflow-hidden p-5 xl:grid-cols-[minmax(0,1fr)_18rem]">
              <div className="flex min-h-0 flex-col gap-4 overflow-hidden">
                <NoteEditor
                  value={editorContentHtml}
                  onChange={setEditorContentHtml}
                  onBlur={() => void flushPendingSave()}
                  placeholder="Capture plans, briefs, and ideas..."
                />
              </div>

              <div className="space-y-4 overflow-y-auto">
                <Card className="rounded-xl border bg-muted/20 p-4 shadow-none">
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="note-project">Linked Project</Label>
                      <Select
                        value={editorProjectId}
                        onValueChange={(value) => setEditorProjectId(value)}
                      >
                        <SelectTrigger id="note-project">
                          <SelectValue placeholder="No linked project" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No linked project</SelectItem>
                          {projects.map((project) => (
                            <SelectItem key={project.id} value={project.id}>
                              {project.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="note-tags">Tags</Label>
                      <Input
                        id="note-tags"
                        value={editorTagsInput}
                        onChange={(event) => setEditorTagsInput(event.target.value)}
                        onBlur={() => void flushPendingSave()}
                        placeholder="brief, planning, follow-up"
                      />
                      <p className="text-xs text-muted-foreground">
                        Separate tags with commas for lightweight personal organization.
                      </p>
                    </div>

                    {editorTags.length > 0 ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          <Tag className="h-3.5 w-3.5" />
                          Applied tags
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {editorTags.map((tag) => (
                            <Badge key={tag} variant="secondary">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </Card>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center p-6">
            <Empty className="max-w-lg">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <FileText className="size-5" />
                </EmptyMedia>
                <EmptyTitle>No note selected</EmptyTitle>
                <EmptyDescription>
                  Choose a note from the list or create a fresh one to start planning.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </div>
        )}
      </Card>
      )}

      <AlertDialog
        open={Boolean(archiveTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setArchiveTarget(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive note</AlertDialogTitle>
            <AlertDialogDescription>
              This moves the note out of your active list so you can restore it later from Archived notes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleArchive()}>
              Archive note
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}

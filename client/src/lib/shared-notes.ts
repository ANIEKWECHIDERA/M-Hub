import type { Note } from "@/Types/types";
import { sanitizeNoteHtmlClient } from "@/lib/notes";

export type SharedNoteMessageMetadata = {
  kind: "note_share";
  noteId: string;
  title: string;
  plainTextPreview: string;
  contentHtml: string;
  projectId: string | null;
  tags: string[];
  sharedAt: string;
};

export function buildSharedNoteMetadata(note: Note): SharedNoteMessageMetadata {
  return {
    kind: "note_share",
    noteId: note.id,
    title: note.title,
    plainTextPreview: note.plainTextPreview || "Shared note",
    contentHtml: sanitizeNoteHtmlClient(note.contentHtml),
    projectId: note.projectId,
    tags: note.tags,
    sharedAt: new Date().toISOString(),
  };
}

export function isSharedNoteMetadata(
  metadata: Record<string, unknown> | null | undefined,
): metadata is SharedNoteMessageMetadata {
  return (
    Boolean(metadata) &&
    metadata?.kind === "note_share" &&
    typeof metadata.noteId === "string" &&
    typeof metadata.title === "string" &&
    typeof metadata.contentHtml === "string"
  );
}

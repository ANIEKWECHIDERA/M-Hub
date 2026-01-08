export interface UpsertNoteTagsDTO {
  note_id: string;
  tags: string; // comma-separated string
}

export interface NoteTagResponseDTO {
  id: string;
  note_id: string;
  tag: string;
}

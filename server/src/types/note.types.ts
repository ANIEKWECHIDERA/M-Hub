export type NoteTag = string;

export interface NoteListQuery {
  q?: string;
  archived?: boolean;
}

export interface CreateNoteDTO {
  company_id: string;
  project_id?: string | null;
  author_id: string;
  title?: string;
  content_html?: string;
  pinned?: boolean;
  tags?: NoteTag[];
}

export interface UpdateNoteDTO {
  title?: string;
  content_html?: string;
  project_id?: string | null;
  pinned?: boolean;
  tags?: NoteTag[];
}

export interface NoteSummaryDTO {
  id: string;
  company_id: string;
  project_id: string | null;
  author_id: string;
  title: string;
  plain_text_preview: string;
  pinned: boolean;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  last_edited_at: string;
  tags: NoteTag[];
}

export interface NoteResponseDTO extends NoteSummaryDTO {
  content_html: string;
}

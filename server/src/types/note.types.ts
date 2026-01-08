export interface CreateNoteDTO {
  company_id: string;
  project_id: string;
  author_id: string;
  title: string;
  content: string;
  visibility?: "private" | "public";
}

export interface UpdateNoteDTO {
  title?: string;
  content?: string;
  visibility?: "private" | "public";
}

export interface NoteResponseDTO {
  id: string;
  company_id: string;
  project_id: string;
  author_id: string;
  title: string;
  content: string;
  visibility: string;
  created_at: string;
  updated_at: string;
}

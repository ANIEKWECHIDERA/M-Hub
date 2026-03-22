export interface CreateCommentDTO {
  company_id: string;
  project_id: string;
  task_id?: string | null;
  author_id: string;
  content: string;
}

export interface UpdateCommentDTO {
  content: string;
}

export interface CommentResponseDTO {
  id: string;
  company_id: string;
  project_id: string;
  task_id?: string | null;
  author_id: string;
  content: string;
  timestamp: string;
  updated_at: string;
  author: {
    id: string;
    name: string;
    avatar: string | null;
  };
}

export type CommentStreamEvent =
  | {
      type: "comment.created";
      company_id: string;
      project_id: string;
      comment: CommentResponseDTO;
    }
  | {
      type: "comment.updated";
      company_id: string;
      project_id: string;
      comment: CommentResponseDTO;
    }
  | {
      type: "comment.deleted";
      company_id: string;
      project_id: string;
      commentId: string;
    };

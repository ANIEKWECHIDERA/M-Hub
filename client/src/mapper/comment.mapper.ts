import type { BackendComment, UIComment } from "../Types/types";

export const mapBackendCommentToUI = (comment: BackendComment): UIComment => ({
  id: comment.id,
  content: comment.content,
  author_id: comment.author_id,
  author: comment.author,
  createdAt: comment.timestamp,
  updatedAt: comment.updated_at,
});

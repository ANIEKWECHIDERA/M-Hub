import type {
  BackendComment,
  Comment,
  CreateCommentPayload,
  UpdateCommentPayload,
} from "@/Types/types";
import { apiFetch } from "./http";

export const commentsAPI = {
  getByProject(projectId: string, idToken: string): Promise<BackendComment[]> {
    return apiFetch<BackendComment[]>(
      `/api/project/${projectId}/comments`,
      {
        method: "GET",
      },
      idToken
    );
  },

  create(
    payload: CreateCommentPayload,
    idToken: string
  ): Promise<BackendComment> {
    return apiFetch<BackendComment>(
      "/api/comments",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      idToken
    );
  },

  update(
    id: string,
    payload: UpdateCommentPayload,
    idToken: string
  ): Promise<BackendComment> {
    return apiFetch<BackendComment>(
      `/api/comments/${id}`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      },
      idToken
    );
  },

  delete(id: string, idToken: string): Promise<{ success: boolean }> {
    return apiFetch(
      `/api/comments/${id}`,
      {
        method: "DELETE",
      },
      idToken
    );
  },
};

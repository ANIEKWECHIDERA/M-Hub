// client/src/api/projects.ts
import type {
  CreateProjectDTO,
  Project,
  UpdateProjectDTO,
} from "@/Types/types";
import { apiFetch } from "./http";

export const ProjectAPI = {
  getAll(idToken: string) {
    return apiFetch<Project[]>("/api/project", undefined, idToken);
  },

  getById(id: string, idToken: string) {
    return apiFetch<Project>(`/api/project/${id}`, undefined, idToken);
  },

  create(payload: CreateProjectDTO, idToken: string) {
    return apiFetch<Project>(
      "/api/project",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      idToken
    );
  },

  update(id: string, payload: UpdateProjectDTO, idToken: string) {
    return apiFetch<Project>(
      `/api/project/${id}`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      },
      idToken
    );
  },

  delete(id: string, idToken: string) {
    return apiFetch<{ success: true }>(
      `/api/project/${id}`,
      {
        method: "DELETE",
      },
      idToken
    );
  },
};

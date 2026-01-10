import type { Assets } from "@/Types/types";
import { apiFetch } from "./http";

export const AssetsAPI = {
  getByProject(projectId: string, idToken: string) {
    return apiFetch<Assets[]>(`/api/assets/${projectId}`, undefined, idToken);
  },

  upload(projectId: string, files: File[], idToken: string, taskId?: string) {
    const formData = new FormData();

    files.forEach((file) => formData.append("files", file));
    formData.append("project_id", projectId);
    if (taskId) formData.append("task_id", taskId);

    return apiFetch<Assets[]>(
      "/api/assets/upload",
      {
        method: "POST",
        body: formData,
        credentials: "include",
      },
      idToken
    );
  },

  delete(id: string, idToken: string) {
    return apiFetch<void>(`/api/assets/${id}`, { method: "DELETE" }, idToken);
  },
};

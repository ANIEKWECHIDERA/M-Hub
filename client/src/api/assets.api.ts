import type { Assets } from "@/Types/types";
import { apiFetch } from "./http";
import { API_CONFIG } from "@/lib/api";

export const AssetsAPI = {
  getByProject(projectId: string, idToken: string) {
    return apiFetch<Assets[]>(`/api/assets/${projectId}`, undefined, idToken);
  },

  upload(
    projectId: string,
    files: File[],
    idToken: string,
    taskId?: string,
    onProgress?: (progress: number) => void,
  ) {
    const formData = new FormData();

    files.forEach((file) => formData.append("files", file));
    formData.append("project_id", projectId);
    if (taskId) formData.append("task_id", taskId);

    return new Promise<Assets[]>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `${API_CONFIG.backend}/api/assets/upload`);
      xhr.responseType = "json";
      xhr.setRequestHeader("Authorization", `Bearer ${idToken}`);

      xhr.upload.onprogress = (event) => {
        if (!event.lengthComputable) return;
        onProgress?.(Math.round((event.loaded / event.total) * 100));
      };

      xhr.onload = () => {
        const response = xhr.response;

        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(response as Assets[]);
          return;
        }

        reject(
          new Error(response?.error || response?.details || "Upload failed"),
        );
      };

      xhr.onerror = () => reject(new Error("Upload failed"));
      xhr.ontimeout = () =>
        reject(new Error("Upload timed out. Please try again."));
      xhr.timeout = 90_000;
      xhr.send(formData);
    });
  },

  delete(id: string, idToken: string) {
    return apiFetch<void>(`/api/assets/${id}`, { method: "DELETE" }, idToken);
  },
};

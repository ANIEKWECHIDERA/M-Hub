import type { TaskAssignee } from "@/Types/types";
import { apiFetch } from "./http";

export const taskAssigneesAPI = {
  getAll(idToken: string) {
    return apiFetch<TaskAssignee[]>("/api/task-assignees", undefined, idToken);
  },

  bulkAssign(
    payload: {
      project_id: string;
      task_id: string;
      team_member_ids: string[];
    },
    idToken: string
  ) {
    return apiFetch<TaskAssignee[]>(
      "/api/task-assignees/bulk",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      idToken
    );
  },

  delete(id: string, idToken: string) {
    return apiFetch(`/api/task-assignees/${id}`, { method: "DELETE" }, idToken);
  },
};

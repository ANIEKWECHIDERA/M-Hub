import type { TaskWithAssigneesDTO } from "@/Types/types";
import { apiFetch } from "./http";

export const tasksAPI = {
  /**
   * Fetch all tasks for a project
   * @param projectId - The project ID to filter tasks by
   * @param idToken - The authentication token for the user
   */
  getAllByProject(projectId: string, idToken: string) {
    return apiFetch<TaskWithAssigneesDTO[]>(
      `/api/projects/${projectId}/tasks`,
      undefined,
      idToken
    );
  },

  /**
   * Fetch a single task by ID
   * @param id - The task ID
   * @param idToken - The authentication token for the user
   */
  getById(id: string, idToken: string) {
    return apiFetch<TaskWithAssigneesDTO>(
      `/api/task/${id}`,
      undefined,
      idToken
    );
  },

  /**
   * Create a new task
   * @param projectId - The project ID to associate with the task
   * @param payload - The task data
   * @param idToken - The authentication token for the user
   */
  create(
    projectId: string,
    payload: Partial<TaskWithAssigneesDTO>,
    idToken: string
  ) {
    return apiFetch<TaskWithAssigneesDTO>(
      `/api/projects/${projectId}/tasks`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      idToken
    );
  },

  /**
   * Update an existing task
   * @param id - The task ID
   * @param payload - The updated task data
   * @param idToken - The authentication token for the user
   */
  update(id: string, payload: Partial<TaskWithAssigneesDTO>, idToken: string) {
    return apiFetch<TaskWithAssigneesDTO>(
      `/api/task/${id}`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      },
      idToken
    );
  },

  /**
   * Delete a task
   * @param id - The task ID
   * @param idToken - The authentication token for the user
   */
  delete(id: string, idToken: string) {
    return apiFetch<{ success: boolean }>(
      `/api/task/${id}`,
      { method: "DELETE" },
      idToken
    );
  },
};

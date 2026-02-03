import type { SubtaskDTO } from "@/Types/types";
import { apiFetch } from "./http";

export const subtasksAPI = {
  /**
   * Fetch all subtasks
   * @param idToken - Authentication token
   */
  getAll(idToken: string) {
    return apiFetch<SubtaskDTO[]>(
      `/api/subtask`,
      undefined,
      idToken,
    );
  },

  /**
   * Fetch a single subtask by ID
   * @param id - Subtask ID
   * @param idToken - Authentication token
   */
  getById(id: string, idToken: string) {
    return apiFetch<SubtaskDTO>(
      `/api/subtask/${id}`,
      undefined,
      idToken,
    );
  },

  /**
   * Create a new subtask
   * @param payload - Subtask data
   * @param idToken - Authentication token
   */
  create(payload: Partial<SubtaskDTO>, idToken: string) {
    return apiFetch<SubtaskDTO>(
      `/api/subtask`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      idToken,
    );
  },

  /**
   * Update an existing subtask
   * @param id - Subtask ID
   * @param payload - Updated subtask data
   * @param idToken - Authentication token
   */
  update(id: string, payload: Partial<SubtaskDTO>, idToken: string) {
    return apiFetch<SubtaskDTO>(
      `/api/subtask/${id}`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      },
      idToken,
    );
  },

  /**
   * Delete a subtask
   * @param id - Subtask ID
   * @param idToken - Authentication token
   */
  delete(id: string, idToken: string) {
    return apiFetch<{ success: boolean }>(
      `/api/subtask/${id}`,
      { method: "DELETE" },
      idToken,
    );
  },

  ///////// MY SUBTASKS /////////
  /**
   * Fetch subtasks assigned to the current team member
   * @param idToken - Authentication token
   */
  getMySubtasks(idToken: string) {
    return apiFetch<SubtaskDTO[]>(
      `/api/subtask?mine=true`,
      undefined,
      idToken,
    );
  },
};

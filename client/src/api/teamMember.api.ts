import type { TeamMember, CreateTeamMemberDTO } from "../Types/types";
import { apiFetch } from "./http";

export const teamMembersAPI = {
  getAll(idToken: string) {
    return apiFetch<TeamMember[]>("/api/team-members", undefined, idToken);
  },

  getById(id: string, idToken: string) {
    return apiFetch<TeamMember>(`/api/team-members/${id}`, undefined, idToken);
  },

  invite(data: CreateTeamMemberDTO, idToken: string) {
    return apiFetch<TeamMember>(
      "/api/team-members",
      {
        method: "POST",
        body: JSON.stringify(data),
      },
      idToken
    );
  },

  update(id: string, data: Partial<TeamMember>, idToken: string) {
    return apiFetch<TeamMember>(
      `/api/team-members/${id}`,
      {
        method: "PATCH",
        body: JSON.stringify(data),
      },
      idToken
    );
  },

  delete(id: string, idToken: string) {
    return apiFetch<{ success: boolean }>(
      `/api/team-members/${id}`,
      { method: "DELETE" },
      idToken
    );
  },
};

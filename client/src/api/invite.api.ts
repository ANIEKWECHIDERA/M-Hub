import { apiFetch } from "./http";

export type InviteRecord = {
  id: string;
  company_id: string;
  email: string;
  status: string;
  accepted_at?: string | null;
  created_by: string;
  role: string;
  access: string;
  expires_at: string;
  created_at: string;
};

export const inviteAPI = {
  create(
    payload: { email: string; role: string; access: "admin" | "team_member" },
    idToken: string,
  ) {
    return apiFetch<{ message: string; inviteId: string }>(
      "/api/invite",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      idToken,
    );
  },

  list(idToken: string) {
    return apiFetch<{ invites: InviteRecord[] }>("/api/invites", undefined, idToken);
  },

  accept(token: string, idToken: string) {
    return apiFetch<{ message: string; companyId: string }>(
      "/api/invite/accept",
      {
        method: "POST",
        body: JSON.stringify({ token }),
      },
      idToken,
    );
  },

  decline(token: string) {
    return apiFetch<{ message: string }>(
      "/api/invite/decline",
      {
        method: "POST",
        body: JSON.stringify({ token }),
      },
      "",
    );
  },

  cancel(inviteId: string, idToken: string) {
    return apiFetch<{ message: string }>(
      `/api/invite/${inviteId}`,
      { method: "DELETE" },
      idToken,
    );
  },
};

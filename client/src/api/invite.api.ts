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
  company_name?: string | null;
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

  listReceived(idToken: string) {
    return apiFetch<{ invites: InviteRecord[] }>(
      "/api/invites/received",
      undefined,
      idToken,
    );
  },

  accept(token: string, idToken: string) {
    return apiFetch<{
      message: string;
      companyId: string;
      alreadyAccepted?: boolean;
    }>(
      "/api/invite/accept",
      {
        method: "POST",
        body: JSON.stringify({ token }),
      },
      idToken,
    );
  },

  acceptReceived(inviteId: string, idToken: string) {
    return apiFetch<{
      message: string;
      companyId: string;
      alreadyAccepted?: boolean;
    }>(
      `/api/invite/${inviteId}/accept`,
      { method: "POST" },
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

  declineReceived(inviteId: string, idToken: string) {
    return apiFetch<{ message: string; alreadyDeclined?: boolean }>(
      `/api/invite/${inviteId}/decline`,
      { method: "POST" },
      idToken,
    );
  },

  cancel(inviteId: string, idToken: string) {
    return apiFetch<{ message: string }>(
      `/api/invite/${inviteId}`,
      { method: "DELETE" },
      idToken,
    );
  },

  copyLink(inviteId: string, idToken: string) {
    return apiFetch<{ message: string; link: string }>(
      `/api/invite/${inviteId}/link`,
      { method: "POST" },
      idToken,
    );
  },

  resend(inviteId: string, idToken: string) {
    return apiFetch<{ message: string }>(
      `/api/invite/${inviteId}/resend`,
      { method: "POST" },
      idToken,
    );
  },

  remove(inviteId: string, idToken: string) {
    return apiFetch<{ message: string }>(
      `/api/invite/${inviteId}`,
      { method: "DELETE" },
      idToken,
    );
  },
};

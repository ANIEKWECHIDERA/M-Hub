import type { AuthStatus } from "@/Types/types";
import { apiFetch } from "./http";

interface CreateUserPayload {
  firstName: string;
  lastName: string;
  email: string;
  termsAccepted: boolean;
}

export const authAPI = {
  sync(idToken: string) {
    return apiFetch<AuthStatus>("/api/sync", { method: "POST" }, idToken);
  },

  getStatus(idToken: string) {
    return apiFetch<AuthStatus>("/api/status", undefined, idToken);
  },

  createProfile(payload: CreateUserPayload, idToken: string) {
    return apiFetch<{ success: boolean }>(
      "/api/user",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      idToken,
    );
  },

  getProfile(idToken: string) {
    return apiFetch<{ profile: any }>("/api/user", undefined, idToken);
  },

  logout(idToken: string) {
    return apiFetch<{ success: boolean }>(
      "/api/logout",
      { method: "POST" },
      idToken,
    );
  },
};

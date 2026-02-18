import type { UpdateUserDTO } from "@/Types/types";
import { apiFetch } from "./http";

export interface UserProfile {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  display_name?: string;
  profile_complete?: boolean;
  has_company?: boolean;
}

export const UserAPI = {
  get(idToken: string) {
    return apiFetch<{ profile: UserProfile }>("/api/user", undefined, idToken);
  },

  update(payload: UpdateUserDTO, idToken: string | null) {
    if (!idToken) {
      throw new Error("Missing ID token");
    }

    return apiFetch<{ profile: UserProfile }>(
      "/api/user",
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      },
      idToken,
    );
  },

  delete(idToken: string | null) {
    if (!idToken) {
      throw new Error("Missing ID token");
    }

    return apiFetch<{ success: true }>(
      "/api/user",
      {
        method: "DELETE",
      },
      idToken,
    );
  },
};

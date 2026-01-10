import type { Client } from "@/Types/types";
import { apiFetch } from "./http";

export const clientsAPI = {
  getAll(idToken: string) {
    return apiFetch<Client[]>("/api/clients", undefined, idToken);
  },
};

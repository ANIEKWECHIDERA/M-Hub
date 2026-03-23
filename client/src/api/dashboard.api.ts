import { apiFetch } from "./http";
import type { DashboardRetentionSnapshot } from "@/Types/types";

export const dashboardAPI = {
  retention(idToken: string) {
    return apiFetch<DashboardRetentionSnapshot>(
      "/api/dashboard/retention",
      undefined,
      idToken,
    );
  },
};

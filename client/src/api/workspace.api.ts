import { apiFetch } from "./http";

export type Workspace = {
  companyId: string;
  name: string;
  logoUrl: string | null;
  role: string;
  access: string;
  status: string;
  isActive: boolean;
};

export const workspaceAPI = {
  list(idToken: string) {
    return apiFetch<{ workspaces: Workspace[] }>(
      "/api/workspaces",
      undefined,
      idToken,
    );
  },

  switch(companyId: string, idToken: string) {
    return apiFetch<{ success: true; companyId: string }>(
      "/api/workspaces/switch",
      {
        method: "POST",
        body: JSON.stringify({ companyId }),
      },
      idToken,
    );
  },
};

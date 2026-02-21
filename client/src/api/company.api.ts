import type {
  CreateCompanyDTO,
  Company,
  UpdateCompanyDTO,
} from "@/Types/types";
import { apiFetch } from "./http";

export const CompanyAPI = {
  // Fetch all companies
  getAll(idToken: string) {
    return apiFetch<Company[]>("/api/company", undefined, idToken);
  },

  // Fetch company by ID
  getById(id: string, idToken: string) {
    return apiFetch<Company>(`/api/company/${id}`, undefined, idToken);
  },

  // Create a new company
  create(payload: FormData, idToken: string | null) {
    if (!idToken) {
      throw new Error("Missing ID token");
    }

    return apiFetch<Company>(
      "/api/company",
      {
        method: "POST",
        body: payload, // Sending formData for file upload
      },
      idToken,
    );
  },

  // Update company details
  update(id: string, payload: UpdateCompanyDTO, idToken: string | null) {
    if (!idToken) {
      throw new Error("Missing ID token");
    }
    const formData = new FormData();
    if (payload.name) formData.append("name", payload.name);
    if (payload.description)
      formData.append("description", payload.description);
    if (payload.logo) formData.append("logo", payload.logo);

    return apiFetch<Company>(
      `/api/company/${id}`,
      {
        method: "PATCH",
        body: formData, // Sending formData for file upload
      },
      idToken,
    );
  },

  // Delete a company
  delete(id: string, idToken: string | null) {
    if (!idToken) {
      throw new Error("Missing ID token");
    }
    return apiFetch<{ success: true }>(
      `/api/company/${id}`,
      {
        method: "DELETE",
      },
      idToken,
    );
  },
};

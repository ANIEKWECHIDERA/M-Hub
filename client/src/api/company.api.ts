import type {
  Company,
  UpdateCompanyDTO,
} from "@/Types/types";
import { apiFetch } from "./http";

type CompanyResponse = {
  id: string;
  name: string;
  description?: string | null;
  logo_url?: string | null;
};

function normalizeCompany(company: CompanyResponse): Company {
  return {
    id: company.id,
    name: company.name,
    description: company.description ?? undefined,
    logoUrl: company.logo_url ?? undefined,
  };
}

export const CompanyAPI = {
  // Fetch all companies
  getCurrent(idToken: string) {
    return apiFetch<CompanyResponse>("/api/company", undefined, idToken).then(
      normalizeCompany,
    );
  },

  // Create a new company
  create(payload: FormData, idToken: string | null) {
    if (!idToken) {
      throw new Error("Missing ID token");
    }

    return apiFetch<CompanyResponse>(
      "/api/company",
      {
        method: "POST",
        body: payload, // Sending formData for file upload
      },
      idToken,
    ).then(normalizeCompany);
  },

  // Update company details
  updateCurrent(payload: UpdateCompanyDTO, idToken: string | null) {
    if (!idToken) {
      throw new Error("Missing ID token");
    }
    const formData = new FormData();
    if (payload.name) formData.append("name", payload.name);
    if (payload.description)
      formData.append("description", payload.description);
    if (payload.logo) formData.append("logo", payload.logo);

    return apiFetch<CompanyResponse>(
      "/api/company",
      {
        method: "PATCH",
        body: formData, // Sending formData for file upload
      },
      idToken,
    ).then(normalizeCompany);
  },

  // Delete a company
  deleteCurrent(idToken: string | null) {
    if (!idToken) {
      throw new Error("Missing ID token");
    }
    return apiFetch<{ success: true }>(
      "/api/company",
      {
        method: "DELETE",
      },
      idToken,
    );
  },
};

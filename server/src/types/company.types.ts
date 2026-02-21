// What the API is allowed to RETURN
export interface CompanyResponseDTO {
  id: string;
  name: string;
  description?: string | null;
  created_at: string;
}

// What the API is allowed to ACCEPT
export interface CreateCompanyDTO {
  name: string;
  description?: string | null;
  logoUrl?: string | null;
}

export interface UpdateCompanyDTO {
  name?: string;
  description?: string | null;
}

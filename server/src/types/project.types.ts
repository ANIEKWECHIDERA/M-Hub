export interface ProjectResponseDTO {
  id: string;
  company_id: string;
  client_id?: string | null;
  title: string;
  description?: string | null;
  status: string;
  deadline?: string | null;
  created_at: string;
}

export interface CreateProjectDTO {
  company_id: string;
  title: string;
  description?: string;
  status?: string;
  deadline?: string;

  // Linking options
  client_id?: string;
  client?: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
  };
}

export interface UpdateProjectDTO {
  title?: string;
  description?: string;
  status?: string;
  deadline?: string;
  client_id?: string | null;
}

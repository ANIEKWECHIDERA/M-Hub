export interface ProjectResponseDTO {
  id: string;
  company_id: string;
  title: string;
  description: string | null;
  status: string;
  deadline: string | null;
  created_at: string;

  client: {
    id: string;
    name: string;
  } | null;

  team_members: {
    id: string;
    name: string;
    avatar?: string | null;
    role: string | null;
  }[];
  task_count: number;
  completed_task_count: number;
  progress: number;
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

  team_member_ids?: string[];
}

export interface UpdateProjectDTO {
  title?: string;
  description?: string;
  status?: string;
  deadline?: string;
  client_id?: string | null;
}

export interface UpdateProjectInput extends UpdateProjectDTO {
  team_member_ids?: string[];
}

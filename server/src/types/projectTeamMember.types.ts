export interface CreateProjectTeamMemberDTO {
  company_id: string;
  project_id: string;
  team_member_id: string;
  role?: string;
}

export interface UpdateProjectTeamMemberDTO {
  role?: string;
}

export interface ProjectTeamMemberResponseDTO {
  id: string;
  company_id: string;
  project_id: string;
  team_member_id: string;
  role?: string;
  joined_at: string;
}

export interface BulkAssignProjectTeamMembersDTO {
  project_id: string;
  team_member_ids: string[];
  role?: string;
}

// types/teamMember.types.ts
export interface TeamMemberResponseDTO {
  id: string;
  user_id: string | null;
  company_id: string;
  email: string;
  role: string;
  access: string;
  status: string;
  last_login: string | null;
  created_at: string;

  // computed
  name: string;
  avatar: string | null;
}

export interface CreateTeamMemberDTO {
  company_id: string;
  email: string;
  role: string;
  access?: string;
  status?: string;
  user_id?: string | null; // populated later via invite
}

export interface UpdateTeamMemberDTO {
  role?: string;
  access?: string;
  status?: string;
  user_id?: string | null;
}

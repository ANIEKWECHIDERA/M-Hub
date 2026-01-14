import { TeamMemberResponseDTO } from "../types/teamMember.types";

export function toTeamMemberResponseDTO(row: any): TeamMemberResponseDTO {
  const user = row.users;

  const name =
    user?.display_name ??
    [user?.first_name, user?.last_name].filter(Boolean).join(" ") ??
    row.email;

  return {
    id: row.id,
    user_id: row.user_id,
    company_id: row.company_id,
    email: row.email,
    role: row.role,
    access: row.access,
    status: row.status,
    last_login: row.last_login,
    created_at: row.created_at,

    name,
    avatar: user?.photo_url ?? null,
  };
}

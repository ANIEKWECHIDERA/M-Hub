export const PROJECT_SELECT = `
  id,
  company_id,
  title,
  description,
  status,
  deadline,
  created_at,

  clients (
    id,
    name
  ),

  project_team_members (
    role,

    team_members!project_team_members_team_member_id_fkey (
      id,

      users!team_members_user_id_fkey (
        id,
        display_name,
        first_name,
        last_name,
        photo_url
      )
    )
  ),

  tasks_total:tasks(count),
  tasks_done:tasks(count).filter(status.eq."Done"),
`;

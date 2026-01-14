export const TEAM_MEMBER_SELECT = `
  id,
  user_id,
  company_id,
  email,
  role,
  access,
  status,
  last_login,
  created_at,
  users (
    id,
    display_name,
    first_name,
    last_name,
    photo_url
  )
`;

export const TASK_SELECT = `
  id,
  email,
  role,
  status,
  user:user_id (
    first_name,
    last_name,
    display_name,
    avatar,
    photo_url
  )
      `;

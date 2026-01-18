import { ProjectResponseDTO } from "../types/project.types";

export function toProjectResponseDTO(row: any): ProjectResponseDTO {
  const totalTasks = row.tasks_total?.[0]?.count ?? 0;
  const completedTasks = row.tasks_done?.[0]?.count ?? 0;

  const progress =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // const clientRow = row.clients?.[0] ?? null;

  const teamMembers = Array.isArray(row.project_team_members)
    ? row.project_team_members
    : [];

  return {
    id: row.id,
    company_id: row.company_id,
    title: row.title,
    description: row.description,
    status: row.status,
    deadline: row.deadline,
    created_at: row.created_at,

    client: row.clients
      ? {
          id: row.clients.id,
          name: row.clients.name,
        }
      : null,

    team_members: teamMembers.map((ptm: any) => {
      const tm = ptm.team_members;
      const user = tm?.users;

      return {
        id: tm?.id,
        name:
          user?.display_name ??
          [user?.first_name, user?.last_name].filter(Boolean).join(" ") ??
          tm?.email ??
          "Unknown",
        avatar: user?.avatar ?? null,
        role: ptm.role,
      };
    }),

    task_count: totalTasks,
    completed_task_count: completedTasks,
    progress,
  };
}

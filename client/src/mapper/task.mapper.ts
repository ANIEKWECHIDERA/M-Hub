import type { TaskWithAssigneesDTO } from "@/Types/types";

export const normalizeTask = (task: any): TaskWithAssigneesDTO => ({
  id: task.id,
  companyId: task.companyId,
  projectId: task.projectId,
  title: task.title,
  description: task.description,
  status: task.status,
  priority: task.priority,
  progress: task.progress ?? 0,
  due_date: task.dueDate ?? task.due_date ?? "",
  createdAt: task.createdAt,
  updatedAt: task.updatedAt,
  team_members:
    task.assignees?.map((a: any) => ({
      id: a.id,
      name: `${a.firstName} ${a.lastName}`,
      avatar: a.avatar ?? null,
      role: a.role ?? "member",
    })) ?? [],
});

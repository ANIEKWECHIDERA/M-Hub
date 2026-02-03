export function mapTaskBase(task: any) {
  return {
    id: task.id,
    companyId: task.company_id,
    projectId: task.project_id,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    progress: task.progress,
    due_date: task.due_date,
    createdAt: task.created_at,
    updatedAt: task.updated_at,
  };
}

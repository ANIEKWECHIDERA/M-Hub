export interface TaskAssignments {
  taskId: string;
  title: string;
  description?: string | null;
  status: string;
  priority: string;
  dueDate: Date | null;
  project: {
    id: string;
    title: string;
    status: string;
  };
}

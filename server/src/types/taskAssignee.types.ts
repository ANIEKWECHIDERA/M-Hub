export interface CreateTaskAssigneeDTO {
  company_id: string;
  project_id: string;
  task_id: string;
  team_member_id: string;
}

export interface BulkAssignTaskAssigneesDTO {
  project_id: string;
  task_id: string;
  team_member_ids: string[];
}

export interface TaskAssigneeResponseDTO {
  id: string;
  company_id: string;
  project_id: string;
  task_id: string;
  team_member_id: string;
  assigned_at: string;
}

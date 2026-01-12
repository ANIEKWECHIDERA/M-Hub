import { TeamMemberDTO } from "./teamMember.dto";

export interface TaskWithAssigneesDTO {
  id: string;
  companyId: string;
  projectId: string;

  title: string;
  description?: string;

  status: string;
  priority: string;
  progress: number;

  dueDate?: string;
  createdAt: string;
  updatedAt?: string;

  assignees: TeamMemberDTO[];
}

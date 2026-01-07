export interface CreateAssetDTO {
  company_id: string;
  project_id: string;
  task_id?: string;
  uploaded_by_id: string;
  name: string;
  size: string;
  type: string;
  url: string;
}

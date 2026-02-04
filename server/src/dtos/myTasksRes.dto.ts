export interface MyTaskResponseDTO {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: Date | null;

  project: {
    id: string;
    title: string;
    status: string;
  };
}

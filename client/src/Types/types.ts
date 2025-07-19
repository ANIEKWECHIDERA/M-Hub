export interface Project {
  id: number;
  title: string;
  client: string;
  status: string;
  progress: number;
  deadline: string;
  tasks: {
    total: number;
    completed: number;
  };
  team: string[];
}

import { ListTodo } from "lucide-react";

export function MyTasksHeader() {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <ListTodo className="h-7 w-7" />
          My Tasks
        </h1>
        <p className="text-muted-foreground">
          Your personalized workspace across all projects
        </p>
      </div>
    </div>
  );
}

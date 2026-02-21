import { ClipboardList } from "lucide-react";

import type { TaskWithAssigneesDTO } from "@/Types/types";
import { TaskCard } from "./TaskCard";

interface TasksListProps {
  tasks: TaskWithAssigneesDTO[];
  onOpenTask: (task: TaskWithAssigneesDTO) => void;
  onToggleStatus: (taskId: string, done: boolean) => void;
}

export function TasksList({
  tasks,
  onOpenTask,
  onToggleStatus,
}: TasksListProps) {
  // if (tasks.length === 0) {
  //   return (
  //     <div className="flex flex-col items-center justify-center py-20 text-center">
  //       <ClipboardList className="h-10 w-10 text-muted-foreground mb-4" />
  //       <h3 className="text-lg font-medium mb-1">No tasks found</h3>
  //       <p className="text-sm text-muted-foreground max-w-sm">
  //         You don’t have any assigned tasks matching the current filters.
  //       </p>
  //     </div>
  //   );
  // }

  return (
    <div className="space-y-3">
      {tasks.map((task) => (
        <TaskCard
          key={task.id}
          task={task}
          onOpen={onOpenTask}
          onToggleStatus={onToggleStatus}
        />
      ))}
    </div>
  );
}

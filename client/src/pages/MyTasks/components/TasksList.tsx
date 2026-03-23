import { useState } from "react";
import type { TaskWithAssigneesDTO } from "@/Types/types";
import { TaskCard } from "./TaskCard";

interface TasksListProps {
  tasks: TaskWithAssigneesDTO[];
  onOpenTask: (task: TaskWithAssigneesDTO) => void;
  onToggleStatus: (taskId: string, done: boolean) => void;
  onReorder?: (draggedTaskId: string, targetTaskId: string) => void;
}

export function TasksList({
  tasks,
  onOpenTask,
  onToggleStatus,
  onReorder,
}: TasksListProps) {
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverTaskId, setDragOverTaskId] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      {tasks.map((task) => (
        <div
          key={task.id}
          draggable
          onDragStart={() => setDraggedTaskId(task.id)}
          onDragEnd={() => {
            setDraggedTaskId(null);
            setDragOverTaskId(null);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            if (draggedTaskId && draggedTaskId !== task.id) {
              setDragOverTaskId(task.id);
            }
          }}
          onDragLeave={() => {
            if (dragOverTaskId === task.id) {
              setDragOverTaskId(null);
            }
          }}
          onDrop={(event) => {
            event.preventDefault();
            if (draggedTaskId && draggedTaskId !== task.id) {
              onReorder?.(draggedTaskId, task.id);
            }
            setDraggedTaskId(null);
            setDragOverTaskId(null);
          }}
          className={
            dragOverTaskId === task.id
              ? "rounded-xl ring-2 ring-primary/30 ring-offset-2"
              : undefined
          }
        >
          <TaskCard
            task={task}
            onOpen={onOpenTask}
            onToggleStatus={onToggleStatus}
          />
        </div>
      ))}
    </div>
  );
}

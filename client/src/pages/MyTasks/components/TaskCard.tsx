import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, Calendar, ChevronRight, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";

import type { TaskWithAssigneesDTO, TaskStatus } from "@/Types/types";
import { statusConfig } from "@/config/status.config";
import { priorityConfig } from "@/config/priority.config";

interface TaskCardProps {
  task: TaskWithAssigneesDTO;
  onOpen: (task: TaskWithAssigneesDTO) => void;
  onToggleStatus: (taskId: string, done: boolean) => void;
}

export function TaskCard({ task, onOpen, onToggleStatus }: TaskCardProps) {
  const statusKey = task.status as TaskStatus;
  const StatusIcon = statusConfig[statusKey].icon;

  const dueDate = task.due_date ? new Date(task.due_date) : null;

  const today = new Date();
  const startOfToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const startOfTomorrow = new Date(startOfToday.getTime() + 86400000);

  const isOverdue = dueDate && dueDate < startOfToday && task.status !== "Done";

  const isDueToday =
    dueDate &&
    dueDate >= startOfToday &&
    dueDate < startOfTomorrow &&
    task.status !== "Done";

  console.log("Rendering TaskCard for task:", task);

  return (
    <Card
      className="hover:shadow-md transition-all cursor-pointer group"
      onClick={() => onOpen(task)}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Checkbox
            checked={task.status === "Done"}
            onCheckedChange={(checked) =>
              onToggleStatus(task.id, Boolean(checked))
            }
            onClick={(e) => e.stopPropagation()}
            className="mt-1"
          />

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex-1 min-w-0">
                <h3
                  className={cn(
                    "font-medium text-base mb-1 truncate",
                    task.status === "Done" &&
                      "line-through text-muted-foreground",
                  )}
                >
                  {task.title}
                </h3>

                {task.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {task.description}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 mr-8">
                <Badge
                  variant="outline"
                  className={cn("text-xs", priorityConfig[task.priority].color)}
                >
                  {priorityConfig[task.priority].label}
                </Badge>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <FolderOpen className="h-3.5 w-3.5" />
                <span className="truncate max-w-[150px]">
                  {task.project?.title ?? "No Project"}
                </span>
              </div>

              <Separator orientation="vertical" className="h-4" />

              <div className="flex items-center gap-1">
                <StatusIcon
                  className={cn("h-3.5 w-3.5", statusConfig[statusKey].color)}
                />
                <span>{statusConfig[statusKey].label}</span>
              </div>

              <Separator orientation="vertical" className="h-4" />

              <div
                className={cn(
                  "flex items-center gap-1",
                  isOverdue && "text-red-500",
                  isDueToday && "text-blue-500 font-medium",
                )}
              >
                {isOverdue ? (
                  <AlertCircle className="h-3.5 w-3.5" />
                ) : (
                  <Calendar className="h-3.5 w-3.5" />
                )}
                <span>
                  {isOverdue
                    ? "Overdue"
                    : isDueToday
                      ? "Due Today"
                      : dueDate
                        ? dueDate.toLocaleDateString()
                        : "No due date"}
                </span>
              </div>
            </div>
          </div>

          <ChevronRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1" />
        </div>
      </CardContent>
    </Card>
  );
}

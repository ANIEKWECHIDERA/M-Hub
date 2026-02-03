import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";

import type { TaskWithAssigneesDTO, TaskStatus } from "@/Types/types";
import { statusConfig } from "@/config/status.config";
import { priorityConfig } from "@/config/priority.config";

import { SubtasksSection } from "./SubtasksSection";

interface TaskDetailsSheetProps {
  task: TaskWithAssigneesDTO | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusChange: (taskId: string, status: TaskStatus) => Promise<void>;
}

export function TaskDetailsSheet({
  task,
  open,
  onOpenChange,
  onStatusChange,
}: TaskDetailsSheetProps) {
  if (!task) return null;

  const StatusIcon = statusConfig[task.status].icon;

  const isOverdue =
    task.due_date &&
    new Date(task.due_date) < new Date() &&
    task.status !== "Done";

  console.log("Rendering TaskDetailsSheet for task:", task);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <div className="flex items-start gap-3">
            <Checkbox
              checked={task.status === "Done"}
              onCheckedChange={(checked) =>
                onStatusChange(task.id, checked ? "Done" : "To-Do")
              }
              className="mt-1"
            />

            <div className="flex-1 min-w-0">
              <SheetTitle
                className={cn(
                  "text-xl",
                  task.status === "Done" &&
                    "line-through text-muted-foreground",
                )}
              >
                {task.title}
              </SheetTitle>

              {task.description && (
                <SheetDescription className="mt-2">
                  {task.description}
                </SheetDescription>
              )}
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="flex gap-2">
              <Button
                size="sm"
                variant={task.status === "To-Do" ? "default" : "outline"}
                onClick={() => onStatusChange(task.id, "To-Do")}
                className="flex-1"
              >
                To Do
              </Button>
              <Button
                size="sm"
                variant={task.status === "In Progress" ? "default" : "outline"}
                onClick={() => onStatusChange(task.id, "In Progress")}
                className="flex-1"
              >
                In Progress
              </Button>
              <Button
                size="sm"
                variant={task.status === "Done" ? "default" : "outline"}
                onClick={() => onStatusChange(task.id, "Done")}
                className="flex-1"
              >
                Completed
              </Button>
            </CardContent>
          </Card>

          {/* Task Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Project</p>
                <div className="flex items-center gap-2">
                  <FolderOpen className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    {task.project?.title ?? "No project"}
                  </span>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-1">Priority</p>
                <Badge
                  variant="outline"
                  className={priorityConfig[task.priority].color}
                >
                  {priorityConfig[task.priority].label}
                </Badge>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-1">Status</p>
                <Badge
                  variant="outline"
                  className={statusConfig[task.status].color}
                >
                  <div className="flex items-center gap-1">
                    <StatusIcon className="h-3.5 w-3.5" />
                    {statusConfig[task.status].label}
                  </div>
                </Badge>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-1">Due Date</p>
                <div
                  className={cn(
                    "flex items-center gap-2 text-sm font-medium",
                    isOverdue && "text-red-500",
                  )}
                >
                  <Calendar className="h-4 w-4" />
                  {task.due_date
                    ? new Date(task.due_date).toLocaleDateString()
                    : "No due date"}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Subtasks */}
          <SubtasksSection taskId={task.id} />
        </div>
      </SheetContent>
    </Sheet>
  );
}

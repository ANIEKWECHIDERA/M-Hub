import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  AlertCircle,
  Archive,
  Calendar,
  ChevronRight,
  FolderOpen,
  GripVertical,
  MoreHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { DraggableAttributes } from "@dnd-kit/core";

import type { TaskWithAssigneesDTO, TaskStatus } from "@/Types/types";
import { statusConfig } from "@/config/status.config";
import { priorityConfig } from "@/config/priority.config";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type DragHandleListeners = Record<string, Function | undefined>;

interface TaskCardProps {
  task: TaskWithAssigneesDTO;
  onOpen: (task: TaskWithAssigneesDTO) => void;
  onToggleStatus: (taskId: string, done: boolean) => void;
  dragHandleProps?: DraggableAttributes;
  dragHandleListeners?: DragHandleListeners;
  setDragHandleRef?: (element: HTMLElement | null) => void;
  isDragging?: boolean;
  subtaskProgress?: {
    completed: number;
    total: number;
  };
  onArchive?: (task: TaskWithAssigneesDTO) => void;
}

export function TaskCard({
  task,
  onOpen,
  onToggleStatus,
  dragHandleProps,
  dragHandleListeners,
  setDragHandleRef,
  isDragging = false,
  subtaskProgress,
  onArchive,
}: TaskCardProps) {
  const normalizedStatus = (task.status === "Done" ||
  task.status === "In Progress" ||
  task.status === "To-Do"
    ? task.status
    : "To-Do") as TaskStatus;
  const statusMeta = statusConfig[normalizedStatus];
  const StatusIcon = statusMeta.icon;
  const normalizedPriority = String(task.priority ?? "medium").toLowerCase();
  const priorityMeta =
    priorityConfig[normalizedPriority as keyof typeof priorityConfig] ??
    priorityConfig.medium;

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

  const isDone = task.status === "Done";

  return (
    <Card
      className={cn(
        "group cursor-pointer select-none rounded-xl border border-border/70 bg-card/95 transition-all hover:shadow-md active:cursor-grabbing lg:rounded-lg",
        isDragging && "opacity-85 shadow-lg ring-1 ring-primary/20",
      )}
      onClick={() => onOpen(task)}
    >
      <CardContent className="p-3.5 sm:p-4 lg:p-4.5">
        <div className="flex items-start gap-2.5 sm:gap-3 lg:gap-3.5">
          <Checkbox
            checked={isDone}
            onCheckedChange={(checked) => {
              onToggleStatus(task.id, Boolean(checked));
            }}
            onClick={(e) => e.stopPropagation()}
            className="mt-0.5"
          />

          <div className="min-w-0 flex-1">
            <div className="mb-2 flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h3
                  className={`mb-1 text-sm font-medium leading-5 sm:text-base ${
                    isDone ? "line-through text-muted-foreground" : ""
                  }`}
                >
                  {task.title}
                </h3>

                {task.description && (
                  <p className="line-clamp-2 text-xs text-muted-foreground sm:text-sm">
                    {task.description}
                  </p>
                )}
              </div>

              <div className="mr-1 flex items-center gap-2 sm:mr-3 sm:gap-2.5 lg:mr-2 lg:gap-3">
                <Badge
                  variant="outline"
                  className={cn(
                    "h-6 max-w-[84px] justify-center overflow-hidden px-2 text-[10px] sm:h-7 sm:max-w-none sm:text-xs",
                    priorityMeta.color,
                  )}
                  title={priorityMeta.label}
                >
                  <span className="truncate">
                    {priorityMeta.label}
                  </span>
                </Badge>
                <div
                  ref={setDragHandleRef}
                  role="button"
                  tabIndex={0}
                  aria-label={`Drag task ${task.title}`}
                  className="flex h-8 w-8 shrink-0 touch-none items-center justify-center rounded-md border border-transparent bg-muted/50 text-muted-foreground/70 transition-colors hover:bg-muted hover:text-foreground active:cursor-grabbing lg:h-9 lg:w-9"
                  onClick={(event) => event.stopPropagation()}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                    }
                  }}
                  {...dragHandleProps}
                  {...dragHandleListeners}
                >
                  <GripVertical className="h-4 w-4" />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 text-xs text-muted-foreground sm:flex-row sm:flex-wrap sm:items-center sm:gap-3 sm:text-sm">
              <div className="flex min-w-0 items-center gap-1">
                <FolderOpen className="h-3.5 w-3.5" />
                <span className="max-w-[190px] truncate sm:max-w-[150px]">
                  {task.project?.title ?? "No Project"}
                </span>
              </div>

              <Separator
                orientation="vertical"
                className="hidden h-4 sm:block"
              />

              <div className="flex items-center gap-1">
                <StatusIcon
                  className={cn("h-3.5 w-3.5", statusMeta.color)}
                />
                <span>{statusMeta.label}</span>
              </div>

              {subtaskProgress && subtaskProgress.total > 0 && (
                <>
                  <Separator
                    orientation="vertical"
                    className="hidden h-4 sm:block"
                  />
                  <div className="flex items-center gap-1">
                    <span>Subtasks</span>
                    <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                      {subtaskProgress.completed}/{subtaskProgress.total}
                    </Badge>
                  </div>
                </>
              )}

              <Separator
                orientation="vertical"
                className="hidden h-4 sm:block"
              />

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

          <ChevronRight
            className="mt-1 h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 sm:h-5 sm:w-5"
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                onClick={(event) => event.stopPropagation()}
                aria-label={`Open actions for ${task.title}`}
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              onClick={(event) => event.stopPropagation()}
            >
              <DropdownMenuItem
                disabled={!isDone}
                onClick={() => {
                  if (isDone) {
                    onArchive?.(task);
                  }
                }}
              >
                <Archive className="mr-2 h-4 w-4" />
                Archive
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}

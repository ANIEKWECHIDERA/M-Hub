import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import type { DailyFocusItem, TaskStatus, TaskWithAssigneesDTO } from "@/Types/types";
import { useMyTasksContext } from "@/context/MyTaskContext";
import { useMyTasksFilters } from "./hooks/useMyTasksFilters";
import { useMyTasksStats } from "./hooks/useMyTaskStats";
import { MyTasksStats } from "./components/TasksStats";
import { TasksList } from "./components/TasksList";
import { TaskDetailsSheet } from "./components/TaskDetailsSheet";
import { MyTasksToolbar } from "./components/MyTasksToolbar";
import {
  Archive,
  ChevronDown,
  ClipboardList,
  FolderOpen,
  ListTodo,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { MyTasksSkeleton } from "@/components/MyTasksSkeleton";
import { MyTasksHeader } from "./components/MyTaskHeader";
import { useAuthContext } from "@/context/AuthContext";
import { useRetentionSnapshot } from "@/hooks/useRetentionSnapshot";
import { DailyFocusCard } from "@/components/retention/RetentionPanels";
import { Button } from "@/components/ui/button";
import { useSubTasksContext } from "@/context/SubTasksContext";
import { tasksAPI } from "@/api/tasks.api";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type ViewMode = "all" | "today" | "overdue" | "upcoming";
type FocusSection = "tasks" | "daily-focus";

export function MyTasksPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  /* ---------------- Context ---------------- */
  const { authStatus, idToken } = useAuthContext();
  const { tasks, loading, error, refetch, updateTaskOptimistic, archiveTask } =
    useMyTasksContext();
  const { subtasks } = useSubTasksContext();
  const { snapshot, loading: retentionLoading, error: retentionError } =
    useRetentionSnapshot();

  /* ---------------- UI State ---------------- */
  const [selectedTask, setSelectedTask] = useState<TaskWithAssigneesDTO | null>(
    null,
  );

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("all");
  const activeSection = (searchParams.get("section") as FocusSection | null) ?? "tasks";
  const workspaceKey = authStatus?.companyId ?? "default";
  const orderStorageKey = `crevo:my-task-order:${workspaceKey}`;
  const [taskOrder, setTaskOrder] = useState<string[]>([]);
  const [hydratedOrderKey, setHydratedOrderKey] = useState<string | null>(null);
  const [expandedProjectIds, setExpandedProjectIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [showArchivedTasks, setShowArchivedTasks] = useState(false);
  const [archivedTasks, setArchivedTasks] = useState<TaskWithAssigneesDTO[]>([]);
  const [archivedTasksLoading, setArchivedTasksLoading] = useState(false);

  useEffect(() => {
    setSelectedTask(null);
    setDetailsOpen(false);
    setViewMode("all");
    setHydratedOrderKey(null);
  }, [workspaceKey]);

  useEffect(() => {
    const section = searchParams.get("section");
    if (section === "tasks" || section === "daily-focus") {
      return;
    }
    setSearchParams({ section: "tasks" }, { replace: true });
  }, [searchParams, setSearchParams]);

  useLayoutEffect(() => {
    const raw = window.localStorage.getItem(orderStorageKey);
    if (!raw) {
      setTaskOrder([]);
      setHydratedOrderKey(orderStorageKey);
      return;
    }

    try {
      const parsed = JSON.parse(raw);
      setTaskOrder(Array.isArray(parsed) ? parsed : []);
    } catch {
      setTaskOrder([]);
    }
    setHydratedOrderKey(orderStorageKey);
  }, [orderStorageKey]);

  useEffect(() => {
    if (hydratedOrderKey !== orderStorageKey) {
      return;
    }

    setTaskOrder((previous) => {
      const taskIds = tasks.map((task) => task.id);
      const next = [
        ...previous.filter((taskId) => taskIds.includes(taskId)),
        ...taskIds.filter((taskId) => !previous.includes(taskId)),
      ];

      if (next.length === previous.length && next.every((id, index) => id === previous[index])) {
        return previous;
      }

      window.localStorage.setItem(orderStorageKey, JSON.stringify(next));
      return next;
    });
  }, [hydratedOrderKey, orderStorageKey, tasks]);

  /* ---------------- Filters ---------------- */
  const filters = useMyTasksFilters(tasks);

  /* ---------------- Stats ---------------- */
  const stats = useMyTasksStats(tasks);

  /* ---------------- View Mode Filter ---------------- */
  const tasksForView = useMemo(() => {
    return filters.filteredTasks.filter((task) => {
      if (viewMode === "all") return true;
      if (!task.due_date) return viewMode === "upcoming";

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const tomorrow = new Date(today.getTime() + 86400000);
      const due = new Date(task.due_date);

      if (viewMode === "today") {
        return due >= today && due < tomorrow && task.status !== "Done";
      }

      if (viewMode === "overdue") {
        return due < today && task.status !== "Done";
      }

      if (viewMode === "upcoming") {
        return due >= tomorrow && task.status !== "Done";
      }

      return true;
    });
  }, [filters.filteredTasks, viewMode]);

  const orderedTasksForView = useMemo(() => {
    const orderIndex = new Map(taskOrder.map((taskId, index) => [taskId, index]));

    return [...tasksForView].sort((left, right) => {
      const leftIndex = orderIndex.get(left.id) ?? Number.MAX_SAFE_INTEGER;
      const rightIndex = orderIndex.get(right.id) ?? Number.MAX_SAFE_INTEGER;
      return leftIndex - rightIndex;
    });
  }, [taskOrder, tasksForView]);

  const subtaskProgressByTaskId = useMemo(() => {
    return subtasks.reduce<Record<string, { completed: number; total: number }>>(
      (acc, subtask) => {
        acc[subtask.task_id] ??= { completed: 0, total: 0 };
        acc[subtask.task_id].total += 1;
        if (subtask.completed) {
          acc[subtask.task_id].completed += 1;
        }
        return acc;
      },
      {},
    );
  }, [subtasks]);

  const groupedTasksByProject = useMemo(() => {
    const groups = new Map<
      string,
      {
        projectId: string;
        projectTitle: string;
        tasks: TaskWithAssigneesDTO[];
      }
    >();

    orderedTasksForView.forEach((task) => {
      const projectId = task.project?.id ?? task.projectId ?? "no-project";
      const projectTitle = task.project?.title ?? "No project";
      const existing = groups.get(projectId);

      if (existing) {
        existing.tasks.push(task);
      } else {
        groups.set(projectId, {
          projectId,
          projectTitle,
          tasks: [task],
        });
      }
    });

    return Array.from(groups.values());
  }, [orderedTasksForView]);

  useEffect(() => {
    if (groupedTasksByProject.length === 0) return;

    setExpandedProjectIds((previous) => {
      const next = new Set(previous);
      groupedTasksByProject.forEach((group) => next.add(group.projectId));
      return next;
    });
  }, [groupedTasksByProject]);

  useEffect(() => {
    if (!showArchivedTasks || !idToken) return;

    setArchivedTasksLoading(true);
    tasksAPI
      .getMyTasks(idToken, { archived: true })
      .then(setArchivedTasks)
      .catch((error) => {
        console.error("Failed to load archived personal tasks:", error);
        toast.error("Couldn't load archived tasks");
      })
      .finally(() => setArchivedTasksLoading(false));
  }, [idToken, showArchivedTasks]);

  /* ---------------- Handlers ---------------- */

  const handleOpenTask = (task: TaskWithAssigneesDTO) => {
    setSelectedTask(task);
    setDetailsOpen(true);
  };

  const handleOpenFocusItem = (item: DailyFocusItem) => {
    if (item.taskId) {
      const matchedTask = tasks.find((task) => task.id === item.taskId);
      if (matchedTask) {
        handleOpenTask(matchedTask);
        return;
      }

      if (item.project?.id) {
        navigate(`/projectdetails/${item.project.id}`);
        return;
      }
    }

    if (item.conversation?.id) {
      const params = new URLSearchParams({
        conversationId: item.conversation.id,
      });
      if (item.messageId) {
        params.set("messageId", item.messageId);
      }
      navigate(`/chat?${params.toString()}`);
    }
  };

  const handleToggleTaskStatus = async (taskId: string, checked: boolean) => {
    updateTaskOptimistic(taskId, {
      status: checked ? "Done" : "To-Do",
    });
  };

  const handleOnStatusChange = async (taskId: string, status: string) => {
    updateTaskOptimistic(taskId, {
      status: status as TaskStatus,
    });
  };

  const handleReorderTasks = (nextVisibleOrder: string[]) => {
    setTaskOrder((previous) => {
      const allTaskIds = tasks.map((task) => task.id);
      const baseOrder = [
        ...previous.filter((taskId) => allTaskIds.includes(taskId)),
        ...allTaskIds.filter((taskId) => !previous.includes(taskId)),
      ];

      if (nextVisibleOrder.length === 0) {
        return previous;
      }

      const visibleTaskIds = nextVisibleOrder;
      const visibleTaskIdSet = new Set(visibleTaskIds);

      if (
        nextVisibleOrder.some((taskId) => !visibleTaskIdSet.has(taskId))
      ) {
        return previous;
      }

      let visibleIndex = 0;
      const next = baseOrder.map((taskId) => {
        if (!visibleTaskIdSet.has(taskId)) {
          return taskId;
        }

        const nextTaskId = nextVisibleOrder[visibleIndex];
        visibleIndex += 1;
        return nextTaskId;
      });

      if (
        next.length === previous.length &&
        next.every((taskId, index) => taskId === previous[index])
      ) {
        return previous;
      }

      window.localStorage.setItem(orderStorageKey, JSON.stringify(next));
      return next;
    });
  };

  const handleArchiveTask = async (task: TaskWithAssigneesDTO) => {
    try {
      await archiveTask(task.id);
      setArchivedTasks((previous) => [task, ...previous]);
      toast.success("Task archived");
    } catch (error) {
      console.error("Failed to archive personal task:", error);
      toast.error("Only completed tasks can be archived");
    }
  };

  const handleRestoreTask = async (task: TaskWithAssigneesDTO) => {
    if (!idToken) return;

    try {
      const restoredTask = await tasksAPI.restore(task.id, idToken);
      setArchivedTasks((previous) =>
        previous.filter((item) => item.id !== task.id),
      );
      await refetch();
      toast.success(`Restored "${restoredTask.title}"`);
    } catch (error) {
      console.error("Failed to restore personal task:", error);
      toast.error("Couldn't restore that task");
    }
  };

  const toggleProjectFolder = (projectId: string) => {
    setExpandedProjectIds((previous) => {
      const next = new Set(previous);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  };

  // useEffect(() => {
  //   refetch();
  // }, []);

  /* ---------------- Render ---------------- */

  if (loading) {
    return <MyTasksSkeleton tasks={6} />;
  }

  if (error) {
    return (
      <div className="p-6 space-y-4">
        <p className="text-red-500">{error}</p>
        <button
          type="button"
          onClick={refetch}
          className="px-4 py-2 rounded bg-primary text-white"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div key={workspaceKey} className="space-y-4 sm:space-y-5 lg:space-y-6">
      <MyTasksHeader
        title={activeSection === "daily-focus" ? "Daily Focus" : "My Tasks"}
        description={
          activeSection === "daily-focus"
            ? "See the tasks, blockers, and decision signals most likely to shape today."
            : "Your task list for the active workspace, with filters and saved ordering."
        }
        icon={activeSection === "daily-focus" ? Sparkles : ListTodo}
      />
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant={activeSection === "tasks" ? "default" : "outline"}
          size="sm"
          onClick={() => setSearchParams({ section: "tasks" }, { replace: true })}
        >
          My Tasks
        </Button>
        <Button
          type="button"
          variant={activeSection === "daily-focus" ? "default" : "outline"}
          size="sm"
          onClick={() =>
            setSearchParams({ section: "daily-focus" }, { replace: true })
          }
        >
          Daily Focus
        </Button>
        {activeSection === "tasks" && (
          <Button
            type="button"
            variant={showArchivedTasks ? "default" : "outline"}
            size="sm"
            onClick={() => setShowArchivedTasks((value) => !value)}
          >
            <Archive className="mr-2 h-4 w-4" />
            {showArchivedTasks ? "Hide Archive" : "Archive"}
          </Button>
        )}
      </div>
      {activeSection === "daily-focus" && (
        <div className="grid grid-cols-1 gap-4">
          <DailyFocusCard
            items={snapshot?.dailyFocus.items ?? []}
            loading={retentionLoading}
            error={retentionError}
            onOpenTask={handleOpenFocusItem}
            onOpenDecision={handleOpenFocusItem}
          />
        </div>
      )}
      {/* Toolbar */}
      {activeSection === "tasks" && tasks.length > 0 && (
        <div className="sticky top-0 z-10 -mx-1 rounded-xl bg-background/95 px-1 pb-3 backdrop-blur">
          <MyTasksToolbar
            search={filters.search}
            status={filters.status}
            priority={filters.priority}
            onSearchChange={filters.setSearch}
            onStatusChange={filters.setStatus}
            onPriorityChange={filters.setPriority}
            onClearFilters={filters.clearFilters}
            hasActiveFilters={filters.hasActiveFilters}
          />
        </div>
      )}

      {/* Stats */}
      {activeSection === "tasks" && tasks.length > 0 && (
        <MyTasksStats
          stats={{
            total: stats.total,
            completed: stats.completed,
            inProgress: stats.inProgress,
            overdue: stats.overdue,
            dueToday: stats.dueToday,
          }}
          viewMode={viewMode}
          onViewChange={setViewMode}
        />
      )}

      {/* Tasks */}
      {activeSection === "tasks" && tasks.length === 0 && !showArchivedTasks ? (
        // First-time user (no assigned tasks at all)
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <ClipboardList className="h-10 w-10 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No tasks assigned yet</h3>
          <p className="text-muted-foreground">
            When someone assigns you a task, it will appear here.
          </p>
        </div>
      ) : activeSection === "tasks" && tasksForView.length === 0 && !showArchivedTasks ? (
        // Filters or view mode returned no results
        <div className="border rounded-lg p-12 text-center bg-muted/20">
          {filters.hasActiveFilters ? (
            <>
              <h3 className="text-lg font-semibold mb-2">
                No tasks match your filters
              </h3>
              <p className="text-muted-foreground">
                Try adjusting or clearing your filters.
              </p>
            </>
          ) : (
            <>
              <h3 className="text-lg font-semibold mb-2">
                No tasks in this view
              </h3>
              <p className="text-muted-foreground">
                Switch view mode to see other tasks.
              </p>
            </>
          )}
        </div>
      ) : activeSection === "tasks" ? (
        <div className="space-y-3">
          {groupedTasksByProject.map((group) => {
            const isExpanded = expandedProjectIds.has(group.projectId);
            const completedTasks = group.tasks.filter(
              (task) => task.status === "Done",
            ).length;

            return (
              <Card
                key={group.projectId}
                className="overflow-hidden rounded-xl border-border/70"
              >
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                  onClick={() => toggleProjectFolder(group.projectId)}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted/50">
                      <FolderOpen className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold sm:text-base">
                        {group.projectTitle}
                      </p>
                      <p className="text-xs text-muted-foreground sm:text-sm">
                        {group.tasks.length}{" "}
                        {group.tasks.length === 1 ? "task" : "tasks"} ·{" "}
                        {completedTasks}/{group.tasks.length} complete
                      </p>
                    </div>
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
                      isExpanded ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {isExpanded && (
                  <CardContent className="border-t px-3 pb-3 pt-2 sm:px-4">
                    <TasksList
                      tasks={group.tasks}
                      onOpenTask={handleOpenTask}
                      onToggleStatus={handleToggleTaskStatus}
                      onReorder={handleReorderTasks}
                      subtaskProgressByTaskId={subtaskProgressByTaskId}
                      onArchiveTask={handleArchiveTask}
                    />
                  </CardContent>
                )}
              </Card>
            );
          })}

          {showArchivedTasks && (
            <Card className="border-dashed bg-muted/20">
              <CardContent className="space-y-3 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">
                      Archived personal tasks
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Hidden from your active list, but still retrievable.
                    </p>
                  </div>
                  <Badge variant="outline">{archivedTasks.length}</Badge>
                </div>
                {archivedTasksLoading ? (
                  <MyTasksSkeleton tasks={2} />
                ) : archivedTasks.length === 0 ? (
                  <p className="py-6 text-sm text-muted-foreground">
                    Nothing archived yet.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {archivedTasks.map((task) => (
                      <div
                        key={task.id}
                        className="flex items-center justify-between gap-3 rounded-lg border bg-background/60 p-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {task.title}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {task.project?.title ?? "No project"}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleRestoreTask(task)}
                        >
                          <RotateCcw className="mr-2 h-4 w-4" />
                          Restore
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      ) : null}

      {/* Details */}
      <TaskDetailsSheet
        taskId={selectedTask?.id ?? null}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        onStatusChange={handleOnStatusChange}
      />
    </div>
  );
}

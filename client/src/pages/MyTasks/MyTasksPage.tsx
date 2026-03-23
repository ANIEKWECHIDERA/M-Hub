import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import type { DailyFocusItem, TaskStatus, TaskWithAssigneesDTO } from "@/Types/types";
import { useMyTasksContext } from "@/context/MyTaskContext";
import { useMyTasksFilters } from "./hooks/useMyTasksFilters";
import { useMyTasksStats } from "./hooks/useMyTaskStats";
import { MyTasksStats } from "./components/TasksStats";
import { TasksList } from "./components/TasksList";
import { TaskDetailsSheet } from "./components/TaskDetailsSheet";
import { MyTasksToolbar } from "./components/MyTasksToolbar";
import { ClipboardList } from "lucide-react";
import { MyTasksSkeleton } from "@/components/MyTasksSkeleton";
import { MyTasksHeader } from "./components/MyTaskHeader";
import { useAuthContext } from "@/context/AuthContext";
import { useRetentionSnapshot } from "@/hooks/useRetentionSnapshot";
import {
  DailyFocusCard,
  DecisionFeedCard,
} from "@/components/retention/RetentionPanels";

type ViewMode = "all" | "today" | "overdue" | "upcoming";

export function MyTasksPage() {
  const navigate = useNavigate();
  /* ---------------- Context ---------------- */
  const { authStatus } = useAuthContext();
  const { tasks, loading, error, refetch, updateTaskOptimistic } =
    useMyTasksContext();
  const { snapshot, loading: retentionLoading, error: retentionError } =
    useRetentionSnapshot();

  /* ---------------- UI State ---------------- */
  const [selectedTask, setSelectedTask] = useState<TaskWithAssigneesDTO | null>(
    null,
  );

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("all");
  const [decisionFilter, setDecisionFilter] = useState<
    "all" | "decision" | "action-item" | "blocker"
  >("all");
  const workspaceKey = authStatus?.companyId ?? "default";

  useEffect(() => {
    setSelectedTask(null);
    setDetailsOpen(false);
    setViewMode("all");
  }, [workspaceKey]);

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

  const decisionFeedItems = useMemo(() => {
    const items = snapshot?.decisionFeed.items ?? [];
    if (decisionFilter === "all") {
      return items;
    }

    return items.filter((item) => item.tags.includes(decisionFilter));
  }, [decisionFilter, snapshot?.decisionFeed.items]);

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
      <MyTasksHeader />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_1fr]">
        <DailyFocusCard
          items={snapshot?.dailyFocus.items ?? []}
          loading={retentionLoading}
          error={retentionError}
          onOpenTask={handleOpenFocusItem}
          onOpenDecision={handleOpenFocusItem}
        />
        <DecisionFeedCard
          items={decisionFeedItems.slice(0, 5)}
          counts={snapshot?.decisionFeed.counts ?? {}}
          loading={retentionLoading}
          error={retentionError}
          activeFilter={decisionFilter}
          onFilterChange={setDecisionFilter}
          onOpenItem={(item) => {
            const params = new URLSearchParams({
              conversationId: item.conversationId,
              messageId: item.messageId,
            });
            navigate(`/chat?${params.toString()}`);
          }}
        />
      </div>
      {/* Toolbar */}
      {tasks.length > 0 && (
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
      {tasks.length > 0 && (
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
      {tasks.length === 0 ? (
        // First-time user (no assigned tasks at all)
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <ClipboardList className="h-10 w-10 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No tasks assigned yet</h3>
          <p className="text-muted-foreground">
            When someone assigns you a task, it will appear here.
          </p>
        </div>
      ) : tasksForView.length === 0 ? (
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
      ) : (
        <TasksList
          tasks={tasksForView}
          onOpenTask={handleOpenTask}
          onToggleStatus={handleToggleTaskStatus}
        />
      )}

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

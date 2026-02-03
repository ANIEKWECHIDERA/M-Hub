import { useMemo, useState } from "react";

import type { TaskWithAssigneesDTO } from "@/Types/types";
import { useMyTasksContext } from "@/context/MyTaskContext";
import { useMyTasksFilters } from "./hooks/useMyTasksFilters";
import { useMyTasksStats } from "./hooks/useMyTaskStats";
import { MyTasksStats } from "./components/TasksStats";
import { TasksList } from "./components/TasksList";
import { TaskDetailsSheet } from "./components/TaskDetailsSheet";
import { MyTasksToolbar } from "./components/MyTasksToolbar";

type ViewMode = "all" | "today" | "overdue" | "upcoming";

export function MyTasksPage() {
  /* ---------------- Context ---------------- */
  const { tasks, loading, error, refetch } = useMyTasksContext();

  /* ---------------- UI State ---------------- */
  const [selectedTask, setSelectedTask] = useState<TaskWithAssigneesDTO | null>(
    null,
  );

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("all");

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

  /* ---------------- Handlers ---------------- */

  const handleOpenTask = (task: TaskWithAssigneesDTO) => {
    setSelectedTask(task);
    setDetailsOpen(true);
  };

  /* ---------------- Render ---------------- */

  if (loading) {
    return <div className="p-6">Loading tasks...</div>;
  }

  if (error) {
    return (
      <div className="p-6 space-y-4">
        <p className="text-red-500">{error}</p>
        <button
          onClick={refetch}
          className="px-4 py-2 rounded bg-primary text-white"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toolbar */}
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

      {/* Stats */}
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

      {/* Tasks */}
      <TasksList
        tasks={tasksForView}
        onOpenTask={handleOpenTask}
        onToggleStatus={() => {}}
      />

      {/* Details */}
      <TaskDetailsSheet
        task={selectedTask}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        onStatusChange={async () => {}}
      />
    </div>
  );
}

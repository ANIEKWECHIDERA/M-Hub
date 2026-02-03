import { useMemo, useState } from "react";

import type {
  TaskWithAssigneesDTO,
  TaskStatus,
  TaskPriority,
} from "@/Types/types";

type FilterStatus = TaskStatus | "all";
type FilterPriority = TaskPriority | "all";

export function useMyTasksFilters(tasks: TaskWithAssigneesDTO[]) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<FilterStatus>("all");
  const [priority, setPriority] = useState<FilterPriority>("all");

  /**
   * Filtered tasks
   */
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // Search (title + description)
      if (search.trim()) {
        const q = search.toLowerCase();
        const inTitle = task.title.toLowerCase().includes(q);
        const inDescription = task.description?.toLowerCase().includes(q);

        if (!inTitle && !inDescription) return false;
      }

      // Status
      if (status !== "all" && task.status !== status) {
        return false;
      }

      // Priority
      if (priority !== "all" && task.priority !== priority) {
        return false;
      }

      return true;
    });
  }, [tasks, search, status, priority]);

  /**
   * Stats
   */
  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === "Done").length;
    const inProgress = tasks.filter((t) => t.status === "In Progress").length;
    const todo = tasks.filter((t) => t.status === "To-Do").length;

    const overdue = tasks.filter((t) => {
      if (!t.due_date || t.status === "Done") return false;
      return new Date(t.due_date) < new Date();
    }).length;

    return {
      total,
      completed,
      inProgress,
      todo,
      overdue,
    };
  }, [tasks]);

  const hasActiveFilters =
    search.trim() !== "" || status !== "all" || priority !== "all";

  const clearFilters = () => {
    setSearch("");
    setStatus("all");
    setPriority("all");
  };

  return {
    /** state */
    search,
    status,
    priority,

    /** setters */
    setSearch,
    setStatus,
    setPriority,

    /** derived */
    filteredTasks,
    stats,
    hasActiveFilters,

    /** helpers */
    clearFilters,
  };
}

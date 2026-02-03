import { useMemo } from "react";
import type { TaskWithAssigneesDTO } from "@/Types/types";

export function useMyTasksStats(tasks: TaskWithAssigneesDTO[]) {
  return useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today.getTime() + 86400000);

    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === "Done").length;
    const inProgress = tasks.filter((t) => t.status === "In Progress").length;
    const todo = tasks.filter((t) => t.status === "To-Do").length;

    const overdue = tasks.filter(
      (t) => t.due_date && new Date(t.due_date) < today && t.status !== "Done",
    ).length;

    const dueToday = tasks.filter((t) => {
      if (!t.due_date) return false;
      const due = new Date(t.due_date);
      return due >= today && due < tomorrow && t.status !== "Done";
    }).length;

    return {
      total,
      completed,
      inProgress,
      todo,
      overdue,
      dueToday,
      completionPercentage:
        total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }, [tasks]);
}

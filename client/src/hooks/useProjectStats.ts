import { useMemo } from "react";
import type { Project, Task } from "@/Types/types";

export function useProjectStats(projects: Project[], tasks: Task[]) {
  return useMemo(() => {
    const now = new Date();

    const completedTasks = tasks.filter(
      (task) => task.status === "Done"
    ).length;

    const totalTasks = tasks.length;

    const activeTasks = tasks.filter((task) => task.status !== "Done").length;

    const overdueTasks = tasks.filter(
      (task) => new Date(task.dueDate) < now && task.status !== "Done"
    ).length;

    const completedProjects = projects.filter(
      (proj) => proj.status === "Completed"
    ).length;

    const overdueProjects = projects.filter(
      (proj) => new Date(proj.deadline) < now && proj.status !== "Completed"
    ).length;

    return {
      totalProjects: projects.length,
      completedTasks,
      totalTasks,
      activeTasks,
      overdueTasks,
      completedProjects,
      overdueProjects,
    };
  }, [projects, tasks]);
}

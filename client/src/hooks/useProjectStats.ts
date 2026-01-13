import { useMemo } from "react";
import type { Project, TaskWithAssigneesDTO } from "@/Types/types";

export function useProjectStats(
  projects: Project[],
  tasks: TaskWithAssigneesDTO[]
) {
  return useMemo(() => {
    const now = new Date();

    const completedTasks = tasks.filter(
      (task) => task.status === "Done"
    ).length;

    const totalTasks = tasks.length;

    const activeTasks = tasks.filter((task) => task.status !== "Done").length;

    const activeProjects = projects.filter(
      (proj) => proj.status !== "Completed"
    ).length;

    // const overdueTasks = tasks.filter(
    //   (task) => new Date(task.due_date) < now && task.status !== "Done"
    // ).length;

    const completedProjects = projects.filter(
      (proj) => proj.status === "Completed"
    ).length;

    const overdueProjects = projects.filter(
      (proj) =>
        proj.deadline &&
        new Date(proj.deadline) < now &&
        proj.status !== "Completed"
    ).length;

    const getTaskStats = (projectId: string) => {
      const projTasks = tasks.filter((task) => {
        console.log("COMPARE", {
          taskProjectId: task.projectId,
          projectId,
          equal: task.projectId === projectId,
        });
        return task.projectId === projectId;
      });
      const total = projTasks.length;
      const completed = projTasks.filter((t) => t.status === "Done").length;
      const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

      return { total, completed, progress };
    };

    return {
      totalProjects: projects.length,
      completedTasks,
      totalTasks,
      activeTasks,
      activeProjects,
      // overdueTasks,
      completedProjects,
      overdueProjects,
      getTaskStats,
    };
  }, [projects, tasks]);
}

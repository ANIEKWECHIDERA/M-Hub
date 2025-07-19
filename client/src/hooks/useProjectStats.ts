import { useMemo } from "react";
import type { Project } from "../Types/types";

export function useProjectStats(projects: Project[]) {
  return useMemo(() => {
    return {
      totalProjects: projects.length,
      activeTasks: projects.reduce(
        (acc, p) => acc + (p.tasks.total - p.tasks.completed),
        0
      ),
      overdueTasks: projects.filter(
        (p) => new Date(p.deadline) < new Date() && p.status !== "Completed"
      ).length,
      completedProjects: projects.filter((p) => p.status === "Completed")
        .length,
    };
  }, [projects]);
}

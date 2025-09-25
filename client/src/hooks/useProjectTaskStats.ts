import { useTaskContext } from "@/context/TaskContext";
import { useMemo } from "react";

export function useProjectTaskStats(projectId: number) {
  const { tasks } = useTaskContext();

  return useMemo(() => {
    const projectTasks = tasks.filter((task) => task.projectId === projectId);
    const total = projectTasks.length;
    const completed = projectTasks.filter(
      (task) => task.status === "Done"
    ).length;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, completed, progress };
  }, [tasks, projectId]);
}

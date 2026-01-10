import { useMemo } from "react";
import type { Project } from "../Types/types";

export function useFilteredProjects(
  projects: Project[],
  statusFilter: string,
  clientFilter: string
) {
  return useMemo(() => {
    return projects.filter((project) => {
      const statusMatch =
        statusFilter === "all" || project.status.toLowerCase() === statusFilter;
      const clientMatch =
        clientFilter === "all" || project.client?.name === clientFilter;
      return statusMatch && clientMatch;
    });
  }, [projects, statusFilter, clientFilter]);
}

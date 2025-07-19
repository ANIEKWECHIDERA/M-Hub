import { useMemo } from "react";
import type { Project } from "../Types/types";

export function useClients(projects: Project[]) {
  return useMemo(() => {
    const clients = new Set(projects.map((p) => p.client));
    return Array.from(clients);
  }, [projects]);
}

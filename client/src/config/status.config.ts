import type { TaskStatus } from "@/Types/types";
import { CheckCircle2, Circle, Clock, type LucideProps } from "lucide-react";

export const statusConfig: Record<
  TaskStatus,
  {
    label: string;
    icon: React.ForwardRefExoticComponent<
      Omit<LucideProps, "ref"> & React.RefAttributes<SVGSVGElement>
    >;
    color: string;
    bg: string;
  }
> = {
  "To-Do": {
    label: "To-Do",
    icon: Circle,
    color: "text-gray-500",
    bg: "bg-gray-100 dark:bg-gray-800",
  },
  "In Progress": {
    label: "In Progress",
    icon: Clock,
    color: "text-blue-500",
    bg: "bg-blue-100 dark:bg-blue-900/20",
  },
  Done: {
    label: "Completed",
    icon: CheckCircle2,
    color: "text-green-500",
    bg: "bg-green-100 dark:bg-green-900/20",
  },
};

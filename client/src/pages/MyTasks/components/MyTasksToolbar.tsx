import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

import type { TaskStatus, TaskPriority } from "@/Types/types";

type FilterStatus = TaskStatus | "all";
type FilterPriority = TaskPriority | "all";

interface MyTasksToolbarProps {
  search: string;
  status: FilterStatus;
  priority: FilterPriority;

  onSearchChange: (value: string) => void;
  onStatusChange: (value: FilterStatus) => void;
  onPriorityChange: (value: FilterPriority) => void;

  onClearFilters: () => void;
  hasActiveFilters: boolean;
}

export function MyTasksToolbar({
  search,
  status,
  priority,
  onSearchChange,
  onStatusChange,
  onPriorityChange,
  onClearFilters,
  hasActiveFilters,
}: MyTasksToolbarProps) {
  return (
    <div className="flex flex-col gap-3 sm:gap-4 lg:flex-row lg:items-center lg:justify-between lg:gap-5">
      {/* Search */}
      <div className="relative lg:max-w-md">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground lg:left-4.5" />
        <Input
          placeholder="Search tasks..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-14 pr-4 lg:h-11 lg:max-w-md lg:pl-[3.65rem]"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center lg:gap-3.5">
        {/* Status */}
        <Select
          value={status}
          onValueChange={(v) => onStatusChange(v as FilterStatus)}
        >
          <SelectTrigger className="w-full sm:w-[160px] lg:h-11 lg:w-[172px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="To-Do">To Do</SelectItem>
            <SelectItem value="In Progress">In Progress</SelectItem>
            <SelectItem value="Done">Completed</SelectItem>
          </SelectContent>
        </Select>

        {/* Priority */}
        <Select
          value={priority}
          onValueChange={(v) => onPriorityChange(v as FilterPriority)}
        >
          <SelectTrigger className="w-full sm:w-[160px] lg:h-11 lg:w-[172px]">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            <SelectItem value="Low">Low</SelectItem>
            <SelectItem value="Medium">Medium</SelectItem>
            <SelectItem value="High">High</SelectItem>
            <SelectItem value="Urgent">Urgent</SelectItem>
          </SelectContent>
        </Select>

        {/* Clear */}
        {hasActiveFilters && (
          <Button variant="outline" onClick={onClearFilters} className="lg:h-11">
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}

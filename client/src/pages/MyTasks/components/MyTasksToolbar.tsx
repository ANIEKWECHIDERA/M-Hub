import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
    <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
      {/* Search */}
      <Input
        placeholder="Search tasks..."
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className="lg:max-w-sm"
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Status */}
        <Select
          value={status}
          onValueChange={(v) => onStatusChange(v as FilterStatus)}
        >
          <SelectTrigger className="w-[160px]">
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
          <SelectTrigger className="w-[160px]">
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
          <Button variant="outline" onClick={onClearFilters}>
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}

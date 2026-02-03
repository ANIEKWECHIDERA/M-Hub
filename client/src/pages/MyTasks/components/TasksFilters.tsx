import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

import type { TaskStatus, TaskPriority } from "@/Types/types";
import { statusConfig } from "@/config/status.config";
import { priorityConfig } from "@/config/priority.config";

interface TasksFiltersProps {
  search: string;
  status: TaskStatus | "all";
  priority: TaskPriority | "all";

  onSearchChange: (value: string) => void;
  onStatusChange: (value: TaskStatus | "all") => void;
  onPriorityChange: (value: TaskPriority | "all") => void;
  onClearFilters: () => void;
}

export function TasksFilters({
  search,
  status,
  priority,
  onSearchChange,
  onStatusChange,
  onPriorityChange,
  onClearFilters,
}: TasksFiltersProps) {
  const hasActiveFilters =
    search.trim() !== "" || status !== "all" || priority !== "all";

  return (
    <div className="space-y-3">
      {/* Top row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          placeholder="Search tasks…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="sm:max-w-xs"
        />

        <div className="flex gap-2">
          <Select value={status} onValueChange={onStatusChange}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {Object.entries(statusConfig).map(([key, cfg]) => (
                <SelectItem key={key} value={key}>
                  {cfg.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={priority} onValueChange={onPriorityChange}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All priorities</SelectItem>
              {Object.entries(priorityConfig).map(([key, cfg]) => (
                <SelectItem key={key} value={key}>
                  {cfg.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Active filters */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2">
          {search && (
            <Badge variant="secondary" className="gap-1">
              Search: “{search}”
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => onSearchChange("")}
              />
            </Badge>
          )}

          {status !== "all" && (
            <Badge variant="secondary" className="gap-1">
              Status: {statusConfig[status].label}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => onStatusChange("all")}
              />
            </Badge>
          )}

          {priority !== "all" && (
            <Badge variant="secondary" className="gap-1">
              Priority: {priorityConfig[priority].label}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => onPriorityChange("all")}
              />
            </Badge>
          )}

          <Separator orientation="vertical" className="h-4" />

          <Button
            size="sm"
            variant="ghost"
            onClick={onClearFilters}
            className="text-muted-foreground"
          >
            Clear all
          </Button>
        </div>
      )}
    </div>
  );
}

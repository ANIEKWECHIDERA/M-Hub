import { AlertCircle, Calendar, ListTodo, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export interface MyTasksStatsProps {
  stats: {
    total: number;
    completed: number;
    inProgress: number;
    overdue: number;
    dueToday: number;
  };
  viewMode: "all" | "today" | "overdue" | "upcoming";
  onViewChange: (mode: MyTasksStatsProps["viewMode"]) => void;
}

export function MyTasksStats({
  stats,
  viewMode,
  onViewChange,
}: MyTasksStatsProps) {
  const completionPercentage =
    stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        title="Total Tasks"
        value={stats.total}
        icon={ListTodo}
        active={viewMode === "all"}
        onClick={() => onViewChange("all")}
      >
        <div className="flex items-center gap-2 mt-2">
          <Progress value={completionPercentage} className="h-2" />
          <span className="text-xs text-muted-foreground">
            {completionPercentage}%
          </span>
        </div>
      </StatCard>

      <StatCard
        title="Due Today"
        value={stats.dueToday}
        icon={Calendar}
        color="text-blue-500"
        active={viewMode === "today"}
        onClick={() => onViewChange("today")}
      />

      <StatCard
        title="Overdue"
        value={stats.overdue}
        icon={AlertCircle}
        color="text-red-500"
        active={viewMode === "overdue"}
        onClick={() => onViewChange("overdue")}
      />

      <StatCard
        title="In Progress"
        value={stats.inProgress}
        icon={TrendingUp}
        color="text-green-500"
      />
    </div>
  );
}

/* ---------------- Sub component ---------------- */

function StatCard({
  title,
  value,
  icon: Icon,
  color,
  active,
  onClick,
  children,
}: {
  title: string;
  value: number;
  icon: any;
  color?: string;
  active?: boolean;
  onClick?: () => void;
  children?: React.ReactNode;
}) {
  return (
    <Card
      className={cn(
        "hover:shadow-md transition-shadow cursor-pointer",
        active && "ring-2 ring-primary",
      )}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={cn("h-4 w-4", color)} />
      </CardHeader>
      <CardContent>
        <div className={cn("text-2xl font-bold", color)}>{value}</div>
        {children}
      </CardContent>
    </Card>
  );
}

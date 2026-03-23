import type { LucideIcon } from "lucide-react";

export function MyTasksHeader({
  title,
  description,
  icon: Icon,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Icon className="h-7 w-7" />
          {title}
        </h1>
        <p className="text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

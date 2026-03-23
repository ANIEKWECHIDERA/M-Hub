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
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 lg:gap-5">
      <div className="space-y-1.5 lg:space-y-2">
        <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight sm:text-2xl lg:text-3xl">
          <Icon className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8" />
          {title}
        </h1>
        <p className="text-sm text-muted-foreground sm:text-base lg:max-w-2xl">
          {description}
        </p>
      </div>
    </div>
  );
}

import { Skeleton } from "@/components/ui/skeleton";

export function MyTasksSkeleton({ tasks = 6 }: { tasks?: number }) {
  return (
    <div className="space-y-4 px-4 py-4 sm:space-y-5 sm:px-6 sm:py-5 lg:space-y-6 lg:px-8 lg:py-6">
      <div className="flex flex-col gap-4 sm:flex-row">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded-xl sm:w-56" />
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5 sm:gap-5 lg:gap-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card/70 p-3 sm:p-4 lg:p-5">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="mt-3 h-7 w-12" />
          </div>
        ))}
      </div>

      <div className="space-y-4">
        {Array.from({ length: tasks }).map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-between rounded-xl border bg-card/70 p-3 sm:p-4"
          >
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="ml-4 h-6 w-6 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

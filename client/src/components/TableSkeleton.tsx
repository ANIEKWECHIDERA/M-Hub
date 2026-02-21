
interface TableSkeletonProps {
  rows?: number;
}

export function TableSkeleton({ rows = 5 }: TableSkeletonProps) {
  return (
    <div className="w-full animate-pulse">
      <div className="rounded-md border">
        <div className="divide-y">
          {/* Header */}
          <div className="grid grid-cols-5 gap-4 p-4">
            <div className="h-4 bg-muted rounded w-24" />
            <div className="h-4 bg-muted rounded w-20" />
            <div className="h-4 bg-muted rounded w-16" />
            <div className="h-4 bg-muted rounded w-24" />
            <div className="h-4 bg-muted rounded w-12 ml-auto" />
          </div>

          {/* Rows */}
          {Array.from({ length: rows }).map((_, i) => (
            <div
              key={i}
              className="grid grid-cols-5 gap-4 p-4 items-center"
            >
              <div className="h-4 bg-muted rounded w-32" />
              <div className="h-4 bg-muted rounded w-24" />
              <div className="h-4 bg-muted rounded w-20" />
              <div className="h-4 bg-muted rounded w-28" />
              <div className="flex justify-end gap-2">
                <div className="h-8 w-8 bg-muted rounded" />
                <div className="h-8 w-8 bg-muted rounded" />
                <div className="h-8 w-8 bg-muted rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
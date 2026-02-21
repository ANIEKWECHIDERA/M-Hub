export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <div className="h-8 w-48 bg-muted rounded"></div>
          <div className="h-4 w-64 bg-muted rounded"></div>
        </div>
        <div className="flex gap-2">
          <div className="h-10 w-32 bg-muted rounded"></div>
          <div className="h-10 w-32 bg-muted rounded"></div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-24 bg-muted rounded-lg p-4 flex flex-col justify-between"
          >
            <div className="h-4 w-24 bg-muted rounded mb-2"></div>
            <div className="h-6 w-16 bg-muted rounded"></div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="h-10 w-full sm:w-[180px] bg-muted rounded"
          ></div>
        ))}
        <div className="h-10 w-full sm:w-[120px] bg-muted rounded"></div>
      </div>

      {/* Project Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-48 bg-muted rounded-lg p-4 flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="h-6 w-3/4 bg-muted rounded"></div>
              <div className="h-4 w-1/2 bg-muted rounded"></div>
            </div>
            <div className="flex justify-between items-center mt-4">
              <div className="h-4 w-16 bg-muted rounded"></div>
              <div className="h-6 w-20 bg-muted rounded"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

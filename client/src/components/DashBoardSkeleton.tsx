export function DashboardSkeleton() {
  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="h-10 w-64 bg-gray-200 relative overflow-hidden rounded mb-4">
        <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 transform -translate-x-full animate-shimmer"></div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-20 bg-gray-200 relative overflow-hidden rounded-lg p-4"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 transform -translate-x-full animate-shimmer"></div>
            <div className="space-y-2 relative z-10">
              <div className="h-4 w-16 bg-gray-300 rounded mb-2"></div>
              <div className="h-6 w-12 bg-gray-300 rounded"></div>
            </div>
          </div>
        ))}
      </div>

      {/* Project Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-40 bg-gray-200 rounded-lg relative overflow-hidden p-4"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 transform -translate-x-full animate-shimmer"></div>
            <div className="space-y-2 relative z-10">
              <div className="h-4 w-3/4 bg-gray-300 rounded"></div>
              <div className="h-3 w-1/2 bg-gray-300 rounded"></div>
              <div className="h-4 w-1/4 bg-gray-300 rounded mt-2"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function MyTasksSkeleton({ tasks = 6 }: { tasks?: number }) {
  return (
    <div className="space-y-6 p-4">
      {/* Toolbar Shimmer */}
      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-10 w-full sm:w-64 rounded bg-gray-200 relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 transform -translate-x-full animate-shimmer"></div>
          </div>
        ))}
      </div>

      {/* Stats Cards Shimmer */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-20 rounded-lg p-4 relative overflow-hidden bg-gray-200"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 transform -translate-x-full animate-shimmer"></div>
            <div className="space-y-2 relative z-10">
              <div className="h-4 w-16 bg-gray-300 rounded mb-2"></div>
              <div className="h-6 w-12 bg-gray-300 rounded"></div>
            </div>
          </div>
        ))}
      </div>

      {/* Tasks List Shimmer */}
      <div className="space-y-4 mt-4">
        {Array.from({ length: tasks }).map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-between rounded-lg p-4 relative overflow-hidden bg-gray-200"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 transform -translate-x-full animate-shimmer"></div>
            <div className="flex-1 space-y-2 relative z-10">
              <div className="h-4 w-3/4 bg-gray-300 rounded"></div>
              <div className="h-3 w-1/2 bg-gray-300 rounded"></div>
            </div>
            <div className="h-6 w-6 bg-gray-300 rounded-full ml-4 relative z-10"></div>
          </div>
        ))}
      </div>
    </div>
  );
}

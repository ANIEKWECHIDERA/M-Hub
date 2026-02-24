export function TaskListSkeleton() {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="bg-gray-200 rounded-lg relative overflow-hidden p-4 animate-pulse"
        >
          {/* Shimmer */}
          <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 transform -translate-x-full animate-shimmer"></div>

          <div className="flex items-start gap-3 relative z-10">
            {/* Checkbox placeholder */}
            <div className="h-5 w-5 bg-gray-300 rounded mt-1 flex-shrink-0"></div>

            <div className="flex-1 space-y-2 min-w-0">
              {/* Title placeholder */}
              <div className="h-4 bg-gray-300 rounded w-3/4"></div>
              {/* Description placeholder */}
              <div className="h-3 bg-gray-300 rounded w-full"></div>
              <div className="h-3 bg-gray-300 rounded w-5/6"></div>

              {/* Badge & meta info placeholder */}
              <div className="flex items-center gap-2 mt-2">
                <div className="h-5 w-12 bg-gray-300 rounded"></div>
                <div className="h-5 w-16 bg-gray-300 rounded"></div>
              </div>
            </div>

            {/* Action buttons placeholder */}
            <div className="flex flex-col gap-2">
              <div className="h-8 w-8 bg-gray-300 rounded-full"></div>
              <div className="h-8 w-8 bg-gray-300 rounded-full"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

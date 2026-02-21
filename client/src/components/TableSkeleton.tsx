interface TableSkeletonProps {
  rows?: number;
}

export function TableSkeleton({ rows = 5 }: TableSkeletonProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            {["Project", "Client", "Status", "Deadline", "Actions"].map(
              (col) => (
                <th key={col} className="text-left p-2">
                  <div className="h-4 w-24 rounded bg-gray-200 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 transform -translate-x-full animate-shimmer"></div>
                  </div>
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <tr key={i} className="border-t">
              {Array.from({ length: 5 }).map((_, j) => (
                <td key={j} className="p-2">
                  <div className="h-4 w-full rounded bg-gray-200 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 transform -translate-x-full animate-shimmer"></div>
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

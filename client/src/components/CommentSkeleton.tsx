import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const CommentSkeleton = () => {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex gap-3">
          <Skeleton className="h-9 w-9 rounded-full" />

          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

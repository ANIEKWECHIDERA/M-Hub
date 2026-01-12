import type { TaskDetailDialogProps } from "../Types/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

const TaskDetailDialog = ({
  task,
  onClose,
  assignee,
}: TaskDetailDialogProps) => {
  if (!task) return null;

  return (
    <Dialog open={!!task} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] rounded-lg shadow-lg">
        <DialogHeader>
          <DialogTitle
            className={`text-2xl font-semibold ${
              task.status === "Done"
                ? "line-through text-muted-foreground"
                : "text-gray-900"
            }`}
          >
            {task.title}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          {/* Description */}
          <div className="border-b pb-4">
            <Label className="text-sm text-gray-500 uppercase tracking-wide">
              Description
            </Label>
            <p className="mt-1 text-base text-gray-800">
              {task.description || "No description provided"}
            </p>
          </div>

          {/* Assignee */}
          <div className="border-b pb-4">
            <Label className="text-sm text-gray-500 uppercase tracking-wide">
              Assignee
            </Label>
            <p className="mt-1 text-base text-gray-800">
              {assignee.length > 0
                ? assignee.map((a) => `${a.name}`)
                : "Unassigned"}
            </p>
          </div>

          {/* Status */}
          <div className="border-b pb-4">
            <Label className="text-sm text-gray-500 uppercase tracking-wide">
              Status
            </Label>
            <div className="mt-1">
              <Badge
                variant={
                  task.status === "Done"
                    ? "default"
                    : task.status === "In Progress"
                    ? "secondary"
                    : "outline"
                }
                className="text-sm px-3 py-1 rounded-full"
              >
                {task.status}
              </Badge>
            </div>
          </div>

          {/* Due Date */}
          <div className="border-b pb-4">
            <Label className="text-sm text-gray-500 uppercase tracking-wide">
              Due Date
            </Label>
            <p className="mt-1 text-base text-gray-800">
              {task.due_date
                ? new Date(task.due_date).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })
                : "No due date"}
            </p>
          </div>

          {/* Close Button */}
          <div className="flex justify-end pt-2">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TaskDetailDialog;

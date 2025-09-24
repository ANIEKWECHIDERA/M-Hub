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

const TaskDetailDialog = ({ task, onClose }: TaskDetailDialogProps) => {
  if (!task) return null;

  return (
    <Dialog open={!!task} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{task.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium">Description</Label>
            <p className="text-sm text-muted-foreground">
              {task.description || "No description provided"}
            </p>
          </div>
          <div>
            <Label className="text-sm font-medium">Assignee</Label>
            <p className="text-sm text-muted-foreground">{task.assignee}</p>
          </div>
          <div>
            <Label className="text-sm font-medium">Status</Label>
            <Badge
              variant={
                task.status === "Done"
                  ? "default"
                  : task.status === "In Progress"
                  ? "secondary"
                  : "outline"
              }
            >
              {task.status}
            </Badge>
          </div>
          <div>
            <Label className="text-sm font-medium">Due Date</Label>
            <p className="text-sm text-muted-foreground">
              {new Date(task.dueDate).toLocaleDateString()}
            </p>
          </div>
          <div className="flex justify-end">
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

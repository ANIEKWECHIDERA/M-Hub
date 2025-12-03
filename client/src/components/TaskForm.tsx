import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useProjectContext } from "@/context/ProjectContext";
import type { TaskFormProps } from "@/Types/types";

const TaskForm = ({ onSave, onCancel, defaultValues }: TaskFormProps) => {
  const { currentProject, getTeamMembersDetails } = useProjectContext();
  const team = currentProject ? getTeamMembersDetails(currentProject.team) : [];

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    assignee: [] as number[], // Initialize as array of IDs
    status: "To-Do",
    dueDate: "",
    priority: "medium" as "low" | "medium" | "high",
  });

  useEffect(() => {
    if (defaultValues) {
      setFormData({
        title: defaultValues.title || "",
        description: defaultValues.description || "",
        assignee: Array.isArray(defaultValues.assignee)
          ? defaultValues.assignee.map(Number)
          : defaultValues.assignee
          ? [Number(defaultValues.assignee)]
          : [],
        status: defaultValues.status || "To-Do",
        dueDate: defaultValues.dueDate || "",
        priority: (defaultValues as any).priority || "medium",
      });
    }
  }, [defaultValues]);

  // const handleAssigneeChange = (memberId: number, checked: boolean) => {
  //   setFormData((prev) => ({
  //     ...prev,
  //     assignee: checked
  //       ? [...prev.assignee, memberId]
  //       : prev.assignee.filter((id) => id !== memberId),
  //   }));
  // };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="task-title">Task Title</Label>
        <Input
          id="task-title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="Enter task title"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="task-description">Description</Label>
        <Textarea
          id="task-description"
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
          placeholder="Task description..."
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="assignee">Assignee</Label>
        <Select
          value={formData.assignee[0]?.toString() || ""}
          onValueChange={(value) =>
            setFormData({
              ...formData,
              assignee: value ? [Number(value)] : [],
            })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select assignee" />
          </SelectTrigger>
          <SelectContent>
            {team.map((member) => (
              <SelectItem key={member.id} value={member.id.toString()}>
                {`${member.firstname} ${member.lastname} - ${member.role}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {defaultValues && (
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select
            value={formData.status}
            onValueChange={(value) =>
              setFormData({ ...formData, status: value })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="To-Do">To-Do</SelectItem>
              <SelectItem value="In Progress">In Progress</SelectItem>
              <SelectItem value="Done">Done</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="priority">Priority</Label>
        <Select
          value={formData.priority}
          onValueChange={(value) =>
            setFormData({ ...formData, priority: value as any })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="due-date">Due Date</Label>
        <Input
          id="due-date"
          type="date"
          value={formData.dueDate}
          onChange={(e) =>
            setFormData({ ...formData, dueDate: e.target.value })
          }
          required
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {defaultValues ? "Update Task" : "Add Task"}
        </Button>
      </div>
    </form>
  );
};

export default TaskForm;

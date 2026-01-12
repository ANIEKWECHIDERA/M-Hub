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
import type { TaskFormProps, TeamMemberSummary } from "@/Types/types";
import { useProjectContext } from "@/context/ProjectContext";
import { Checkbox } from "@radix-ui/react-checkbox";

const TaskForm = ({ onSave, onCancel, defaultValues }: TaskFormProps) => {
  const { currentProject } = useProjectContext();

  // Only members assigned to this project
  const projectTeamMembers: TeamMemberSummary[] = (
    currentProject?.team_members ?? []
  ).filter((member) => member.role !== null) as TeamMemberSummary[];

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    assignees: [] as string[], // IDs of team members
    status: "To-Do",
    due_date: "",
    priority: "medium" as "low" | "medium" | "high",
  });

  useEffect(() => {
    if (defaultValues) {
      setFormData({
        title: defaultValues.title || "",
        description: defaultValues.description || "",
        assignees: Array.isArray(defaultValues.team_members)
          ? defaultValues.team_members.map((m) => m.id)
          : [],
        status: defaultValues.status || "To-Do",
        due_date: defaultValues.due_date || "",
        priority: defaultValues.priority || "medium",
      });
    }
  }, [defaultValues]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    onSave({
      title: formData.title,
      description: formData.description,
      status: formData.status as "To-Do" | "In Progress" | "Done",
      priority: formData.priority,
      due_date: formData.due_date,
      team_member_ids: formData.assignees,
    });
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
        <Label htmlFor="assignee">Assignee(s)</Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 border rounded-md">
          {projectTeamMembers.map((member) => {
            const checked = formData.assignees.includes(member.id);
            return (
              <label
                key={member.id}
                className="flex items-center gap-2 text-sm cursor-pointer"
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={(isChecked) => {
                    setFormData((prev) => {
                      const newAssignees = isChecked
                        ? [...prev.assignees, member.id]
                        : prev.assignees.filter((id) => id !== member.id);
                      return { ...prev, assignees: newAssignees };
                    });
                  }}
                />
                <span>{member.name}</span>
              </label>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">
          Select one or more members to assign to this task.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="status">Status</Label>
        <Select
          value={formData.status}
          onValueChange={(value) => setFormData({ ...formData, status: value })}
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

      <div className="space-y-2">
        <Label htmlFor="priority">Priority</Label>
        <Select
          value={formData.priority}
          onValueChange={(value) =>
            setFormData({
              ...formData,
              priority: value as "medium" | "low" | "high",
            })
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
          value={formData.due_date}
          onChange={(e) =>
            setFormData({ ...formData, due_date: e.target.value })
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

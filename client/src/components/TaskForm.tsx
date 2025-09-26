import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TaskFormProps } from "@/Types/types";
import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { useProjectContext } from "@/context/ProjectContext";

const TaskForm = ({ onSave, onCancel, defaultValues }: TaskFormProps) => {
  const { currentProject, getTeamMembersDetails } = useProjectContext();
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    assignee: "",
    status: "To-Do",
    dueDate: "",
  });

  const team = currentProject ? getTeamMembersDetails(currentProject.team) : [];

  useEffect(() => {
    if (defaultValues) {
      setFormData({
        title: defaultValues.title || "",
        description: defaultValues.description || "",
        assignee: defaultValues.assignee || "",
        status: defaultValues.status || "To-Do",
        dueDate: defaultValues.dueDate || "",
      });
      console.log("Default values set in form:", defaultValues.status);
    }
  }, [defaultValues]);

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
        key
        <Label htmlFor="assignee">Assignee</Label>
        <Select
          value={formData.assignee}
          onValueChange={(value) =>
            setFormData({ ...formData, assignee: value })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select assignee" />
          </SelectTrigger>
          <SelectContent>
            {team.map((member) => (
              <SelectItem
                key={member.id}
                value={`${member.firstname} ${member.lastname}`}
              >
                {member.firstname} {member.lastname} - {member.role}
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
          {defaultValues ? "Update Task" : "Create Task"}
        </Button>
      </div>
    </form>
  );
};

export default TaskForm;

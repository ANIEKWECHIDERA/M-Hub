import { useEffect, useRef, useState } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { normalizeDate, isEqual } from "@/utils/helpers";

const TaskForm = ({ onSave, onCancel, defaultValues }: TaskFormProps) => {
  const { currentProject } = useProjectContext();
  const [loading, setLoading] = useState(false);

  const initialFormRef = useRef({
    title: defaultValues?.title || "",
    description: defaultValues?.description || "",
    assignees: defaultValues?.team_members?.map((m) => m.id) || [],
    status: defaultValues?.status || "To-Do",
    due_date: normalizeDate(defaultValues?.due_date),
    priority: defaultValues?.priority || "medium",
  });

  const [formData, setFormData] = useState(initialFormRef.current);

  const isDirty = !isEqual(formData, initialFormRef.current);

  // Only members assigned to this project
  const projectTeamMembers: TeamMemberSummary[] = (
    currentProject?.team_members ?? []
  ).filter((member) => member.id !== null) as TeamMemberSummary[];

  useEffect(() => {
    if (!defaultValues) return;

    const updatedInitialForm = {
      title: defaultValues.title || "",
      description: defaultValues.description || "",
      assignees: Array.isArray(defaultValues.team_members)
        ? defaultValues.team_members.map((m) => m.id)
        : [],
      status: defaultValues.status || "To-Do",
      due_date: normalizeDate(defaultValues.due_date || ""),
      priority: defaultValues.priority || "medium",
    };

    initialFormRef.current = updatedInitialForm;
    setFormData(updatedInitialForm);
  }, [defaultValues]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isDirty) return;

    setLoading(true);

    await onSave({
      title: formData.title,
      description: formData.description,
      status: formData.status as "To-Do" | "In Progress" | "Done",
      priority: formData.priority,
      due_date: formData.due_date,
      team_member_ids: formData.assignees,
    });

    setLoading(false);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`space-y-4 ${loading ? "pointer-events-none opacity-60" : ""}`}
    >
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

      {projectTeamMembers.length > 0 && (
        <div className="space-y-2">
          <Label>Assignee(s)</Label>
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
                      setFormData((prev) => ({
                        ...prev,
                        assignees:
                          isChecked === true
                            ? Array.from(
                                new Set([...prev.assignees, member.id]),
                              )
                            : prev.assignees.filter((id) => id !== member.id),
                      }));
                    }}
                  />
                  <span>{member.name}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label>Status</Label>
        <Select
          value={formData.status}
          onValueChange={(value) =>
            setFormData({
              ...formData,
              status: value as "To-Do" | "In Progress" | "Done",
            })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="To-Do">To-Do</SelectItem>
            <SelectItem value="In Progress">In Progress</SelectItem>
            <SelectItem value="Done">Done</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Priority</Label>
        <Select
          value={formData.priority}
          onValueChange={(value) =>
            setFormData({
              ...formData,
              priority: value as "low" | "medium" | "high",
            })
          }
        >
          <SelectTrigger>
            <SelectValue />
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
        <Button
          type="button"
          variant="outline"
          disabled={loading}
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={!isDirty || loading}>
          {loading ? "Saving..." : defaultValues ? "Update Task" : "Add Task"}
        </Button>
      </div>
    </form>
  );
};

export default TaskForm;

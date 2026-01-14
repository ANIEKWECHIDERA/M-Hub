import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { ProjectFormProps } from "../Types/types";
import { useTeamContext } from "@/context/TeamMemberContext";
import { useClientContext } from "@/context/ClientContext";
import { isEqual, normalizeDate } from "@/utils/helpers";

const ProjectForm = ({ project = {}, onSave, onCancel }: ProjectFormProps) => {
  const { clients } = useClientContext();
  const { teamMembers } = useTeamContext();
  const [newClient, setNewClient] = useState("");
  const [showNewClientInput, setShowNewClientInput] = useState(false);
  const [loading, setLoading] = useState(false);

  const initialForm = {
    title: project.title || "",
    client_id: project.client?.id || "",
    status: project.status || "Planning",
    deadline: normalizeDate(project.deadline),
    description: project.description || "",
    team_member_ids: project.team_members?.map((m: any) => m.id) || [],
  };

  const [formData, setFormData] = useState(initialForm);

  const isDirty = !isEqual(formData, initialForm);
  const [selectedTeam] = useState<string[]>(
    Array.isArray((project as any).team_members)
      ? ((project as any).team_members as string[])
      : []
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isDirty) return;

    setLoading(true);

    const finalData = {
      ...formData,
      client_id:
        showNewClientInput && newClient ? newClient : formData.client_id,
      team_member_ids: selectedTeam,
    };
    // TODO: Validate form data before saving (e.g., title and deadline required)
    onSave(finalData);
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Project Title</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="Enter project title"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="client">Client</Label>
        {showNewClientInput ? (
          <Input
            id="new-client"
            value={newClient}
            onChange={(e) => setNewClient(e.target.value)}
            placeholder="Enter new client name"
            required
          />
        ) : (
          <Select
            value={formData.client_id ?? ""}
            onValueChange={(value) => {
              if (value === "NewClient") {
                setShowNewClientInput(true);
              } else {
                setFormData({ ...formData, client_id: value });
                setShowNewClientInput(false);
              }
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select client" />
            </SelectTrigger>
            <SelectContent>
              {clients.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.name}
                </SelectItem>
              ))}
              <SelectItem value="NewClient">+ Add New Client</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="status">Status</Label>
        <Select
          value={formData.status}
          onValueChange={(value) =>
            setFormData({
              ...formData,
              status: value as
                | "Active"
                | "In Progress"
                | "On Hold"
                | "Completed",
            })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Active">Active</SelectItem>
            <SelectItem value="In Progress">In Progress</SelectItem>
            <SelectItem value="On Hold">On Hold</SelectItem>
            <SelectItem value="Completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="deadline">Deadline</Label>
        <Input
          id="deadline"
          type="date"
          value={formData.deadline}
          onChange={(e) =>
            setFormData({ ...formData, deadline: e.target.value })
          }
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
          placeholder="Project description..."
          rows={3}
        />
      </div>

      {teamMembers.length > 0 && (
        <div className="space-y-2">
          <Label>Team Members</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 border rounded-md">
            {teamMembers.map((member: any) => {
              const checked = formData.team_member_ids.includes(member.id);
              return (
                <label
                  key={member.id}
                  className="flex items-center gap-2 text-sm cursor-pointer"
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({
                        ...prev,
                        team_member_ids: checked
                          ? [...prev.team_member_ids, member.id]
                          : prev.team_member_ids.filter(
                              (id) => id !== member.id
                            ),
                      }))
                    }
                  />
                  <span>{member.name}</span>
                </label>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            Select one or more members to assign to this project. These members
            will be available to assign tasks to.
          </p>
        </div>
      )}

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
          {loading
            ? "Saving..."
            : project.id
            ? "Update Project"
            : "Create Project"}
        </Button>
      </div>
    </form>
  );
};

export default ProjectForm;

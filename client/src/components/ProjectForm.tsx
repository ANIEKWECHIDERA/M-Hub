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

const ProjectForm = ({ project = {}, onSave, onCancel }: ProjectFormProps) => {
  const [formData, setFormData] = useState({
    title: project.title || "",
    client: project.clientId || "",
    status: project.status || "Planning",
    deadline: project.deadline || "",
    description: project.description || "",
  });
  const [selectedTeam, setSelectedTeam] = useState<string[]>(
    Array.isArray((project as any).team)
      ? ((project as any).team as string[])
      : []
  );
  const { teamMembers } = useTeamContext();
  const [newClient, setNewClient] = useState("");
  const [showNewClientInput, setShowNewClientInput] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalData = {
      ...formData,
      client: showNewClientInput && newClient ? newClient : formData.client,
      team: selectedTeam,
    };
    // TODO: Validate form data before saving (e.g., title and deadline required)
    onSave(finalData);
  };

  const clients = ["TechCorp Inc.", "StartupXYZ", "RetailCo"];

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
            value={formData.client}
            onValueChange={(value) => {
              if (value === "NewClient") {
                setShowNewClientInput(true);
              } else {
                setFormData({ ...formData, client: value });
                setShowNewClientInput(false);
              }
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select client" />
            </SelectTrigger>
            <SelectContent>
              {clients.map((client) => (
                <SelectItem key={client} value={client}>
                  {client}
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

      <div className="space-y-2">
        <Label>Team Members</Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 border rounded-md">
          {teamMembers.map((member) => {
            const checked = selectedTeam.includes(member.id);
            return (
              <label
                key={member.id}
                className="flex items-center gap-2 text-sm cursor-pointer"
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={(isChecked) => {
                    setSelectedTeam((prev) =>
                      isChecked
                        ? Array.from(new Set([...prev, member.id]))
                        : prev.filter((id) => id !== member.id)
                    );
                  }}
                />
                <span>
                  {member.firstname} {member.lastname}
                </span>
              </label>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">
          Select one or more members to assign to this project. These members
          will be available to assign tasks to.
        </p>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {project.id ? "Update Project" : "Create Project"}
        </Button>
      </div>
    </form>
  );
};

export default ProjectForm;

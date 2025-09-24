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
import type { ProjectFormProps } from "../Types/types";

const ProjectForm = ({ project = {}, onSave, onCancel }: ProjectFormProps) => {
  const [formData, setFormData] = useState({
    title: project.title || "",
    client: project.client || "",
    status: project.status || "Active",
    deadline: project.deadline || "",
    description: project.description || "",
  });
  const [newClient, setNewClient] = useState("");
  const [showNewClientInput, setShowNewClientInput] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalData = {
      ...formData,
      client: showNewClientInput && newClient ? newClient : formData.client,
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
          onValueChange={(value) => setFormData({ ...formData, status: value })}
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

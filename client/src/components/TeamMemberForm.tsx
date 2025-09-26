import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import type { TeamMember, TeamMemberFormProps } from "@/Types/types";

const TeamMemberForm = ({
  member = {},
  onSave,
  onCancel,
}: TeamMemberFormProps) => {
  const [formData, setFormData] = useState<Partial<TeamMember>>({
    firstname: member.firstname || "",
    lastname: member.lastname || "",
    email: member.email || "",
    role: member.role || "",
    access: member.access || "Team",
    status: member.status || "active",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="firstname">First Name</Label>
        <Input
          id="firstname"
          value={formData.firstname}
          onChange={(e) =>
            setFormData({ ...formData, firstname: e.target.value })
          }
          placeholder="Enter first name"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="lastname">Last Name</Label>
        <Input
          id="lastname"
          value={formData.lastname}
          onChange={(e) =>
            setFormData({ ...formData, lastname: e.target.value })
          }
          placeholder="Enter last name"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          placeholder="Enter email address"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="role">Role</Label>
        <Input
          id="role"
          value={formData.role}
          onChange={(e) => setFormData({ ...formData, role: e.target.value })}
          placeholder="e.g., Designer, Developer"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="access">Access</Label>
        <Select
          value={formData.access}
          onValueChange={(value) =>
            setFormData({ ...formData, access: value as "Admin" | "Team" })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select access level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Admin">Admin</SelectItem>
            <SelectItem value="Team">Team</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="status">Status</Label>
        <Select
          value={formData.status}
          onValueChange={(value) =>
            setFormData({ ...formData, status: value as "active" | "inactive" })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {member.id ? "Update Member" : "Add Member"}
        </Button>
      </div>
    </form>
  );
};

export default TeamMemberForm;

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
import type { TeamMemberFormProps } from "@/Types/types";

const TeamMemberForm = ({
  member = {},
  onSave,
  onCancel,
}: TeamMemberFormProps) => {
  const [formData, setFormData] = useState({
    role: member.role,
    access: member.access,
    status: member.status,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/*READ ONLY FIELDS*/}
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" value={member.name} disabled />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Work Email</Label>
        <Input
          id="email"
          type="email"
          value={member.email}
          // onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          placeholder="Enter email address"
          disabled
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
            setFormData({ ...formData, access: value as string })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select access level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="team_member">Team Member</SelectItem>
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
        <Button type="submit">Save Changes</Button>
      </div>
    </form>
  );
};

export default TeamMemberForm;

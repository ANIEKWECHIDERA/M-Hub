import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Button } from "./ui/button";

type InviteFormProps = {
  onSave: (data: {
    email: string;
    role: string;
    access: "admin" | "team_member";
  }) => Promise<void> | void;
  onCancel: () => void;
};

const InviteForm = ({ onSave, onCancel }: InviteFormProps) => {
  const [formData, setFormData] = useState({
    email: "",
    role: "Member",
    access: "team_member" as "admin" | "team_member",
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await onSave({
        email: formData.email.trim().toLowerCase(),
        role: formData.role.trim(),
        access: formData.access,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Email</Label>
        <Input
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          placeholder="teammate@workspace.com"
          required
          disabled={submitting}
        />
      </div>

      <div className="space-y-2">
        <Label>Role</Label>
        <Input
          value={formData.role}
          onChange={(e) => setFormData({ ...formData, role: e.target.value })}
          placeholder="Designer"
          required
          disabled={submitting}
        />
      </div>

      <div className="space-y-2">
        <Label>Access</Label>
        <Select
          value={formData.access}
          onValueChange={(value: "admin" | "team_member") =>
            setFormData({ ...formData, access: value })
          }
          disabled={submitting}
        >
          <SelectTrigger>
            <SelectValue placeholder="Choose access" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="team_member">Team Member</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Sending..." : "Send Invite"}
        </Button>
      </div>
    </form>
  );
};

export default InviteForm;

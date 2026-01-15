import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { useState } from "react";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Button } from "./ui/button";

const InviteForm = ({ onSave, onCancel }: any) => {
  const [formData, setFormData] = useState({
    email: "",
    role: "",
    access: "team_member",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Email</Label>
        <Input
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          required
        />
      </div>

      <div>
        <Label>Role</Label>
        <Input
          value={formData.role}
          onChange={(e) => setFormData({ ...formData, role: e.target.value })}
          required
        />
      </div>

      <div>
        <Label>Access</Label>
        <Select
          value={formData.access}
          onValueChange={(value) => setFormData({ ...formData, access: value })}
        >
          <SelectTrigger />
          <SelectContent>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="team_member">Team</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Send Invite</Button>
      </div>
    </form>
  );
};
export default InviteForm;

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Note, NoteFormProps } from "@/Types/types";
import type React from "react";
import { useState } from "react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { useProjectContext } from "@/context/ProjectContext";

const NoteForm = ({ note, onSave, onCancel }: NoteFormProps) => {
  const [formData, setFormData] = useState({
    title: note?.title || "",
    content: note?.content || "",
    projectId: note?.projectId?.toString() || "",
    tags: note?.tags.join(", ") || "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const noteData: Partial<Note> = {
      title: formData.title,
      content: formData.content,
      projectId: formData.projectId ? Number(formData.projectId) : undefined,
      tags: formData.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag),
    };
    onSave(noteData);
  };

  const { projects } = useProjectContext();

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="note-title">Title</Label>
        <Input
          id="note-title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="Enter note title"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="note-content">Content</Label>
        <Textarea
          id="note-content"
          value={formData.content}
          onChange={(e) =>
            setFormData({ ...formData, content: e.target.value })
          }
          placeholder="Write your note here..."
          rows={8}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="note-project">Link to Project (Optional)</Label>
        <Select
          value={formData.projectId}
          onValueChange={(value) =>
            setFormData({ ...formData, projectId: value })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select project" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="No Project">No Project</SelectItem>
            {projects.map((project) => (
              <SelectItem key={project.id} value={project.id.toString()}>
                {project.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="note-tags">Tags (comma-separated)</Label>
        <Input
          id="note-tags"
          value={formData.tags}
          onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
          placeholder="meeting, important, design"
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">{note ? "Update Note" : "Create Note"}</Button>
      </div>
    </form>
  );
};

export default NoteForm;

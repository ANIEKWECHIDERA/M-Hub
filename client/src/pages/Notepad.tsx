import type React from "react";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  FileText,
  Calendar,
  Tag,
} from "lucide-react";

const mockNotes = [
  {
    id: 1,
    title: "Project Meeting Notes",
    content:
      "Discussed timeline and deliverables for TechCorp project. Key points:\n- Logo concepts due by Friday\n- Client feedback session next Tuesday\n- Final delivery by month end",
    project: "TechCorp Project",
    tags: ["meeting", "important"],
    createdAt: "2024-01-15",
    updatedAt: "2024-01-15",
  },
  {
    id: 2,
    title: "Design Ideas",
    content:
      "Color palette inspiration:\n- Deep blue (#1e40af)\n- Warm gray (#6b7280)\n- Accent green (#10b981)\n\nTypography: Consider Inter or Poppins for clean, modern look.",
    project: null,
    tags: ["design", "inspiration"],
    createdAt: "2024-01-14",
    updatedAt: "2024-01-16",
  },
  {
    id: 3,
    title: "Client Feedback",
    content:
      "Client loves the direction we're taking with the brand. Requested minor adjustments to logo spacing and wants to see alternative color options.",
    project: "TechCorp Project",
    tags: ["feedback", "client"],
    createdAt: "2024-01-16",
    updatedAt: "2024-01-16",
  },
];

export default function Notepad() {
  const [notes, setNotes] = useState(mockNotes);
  const [selectedNote, setSelectedNote] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const filteredNotes = notes.filter(
    (note) =>
      note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.tags.some((tag) =>
        tag.toLowerCase().includes(searchTerm.toLowerCase())
      )
  );

  const NoteForm = ({ note, onSave, onCancel }: any) => {
    const [formData, setFormData] = useState({
      title: note?.title || "",
      content: note?.content || "",
      project: note?.project || "No Project",
      tags: note?.tags?.join(", ") || "",
    });

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();

      interface NoteData {
        title: string;
        content: string;
        project: string;
        tags: string[];
        updatedAt: string;
      }

      const noteData: NoteData = {
        ...formData,
        tags: formData.tags
          .split(",")
          .map((tag: string) => tag.trim())
          .filter((tag: string) => tag),
        updatedAt: new Date().toISOString().split("T")[0],
      };
      onSave(noteData);
    };

    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="note-title">Title</Label>
          <Input
            id="note-title"
            value={formData.title}
            onChange={(e) =>
              setFormData({ ...formData, title: e.target.value })
            }
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
            value={formData.project}
            onValueChange={(value) =>
              setFormData({ ...formData, project: value })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="No Project">No Project</SelectItem>
              <SelectItem value="TechCorp Project">TechCorp Project</SelectItem>
              <SelectItem value="StartupXYZ Website">
                StartupXYZ Website
              </SelectItem>
              <SelectItem value="RetailCo Campaign">
                RetailCo Campaign
              </SelectItem>
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

  return (
    <div className="h-[calc(100vh-8rem)] flex gap-4">
      {/* Notes Sidebar */}
      <Card className="w-80 flex flex-col">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Notes</CardTitle>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>Create New Note</DialogTitle>
                </DialogHeader>
                <NoteForm
                  onSave={(data: any) => {
                    const newNote = {
                      id: notes.length + 1,
                      ...data,
                      createdAt: new Date().toISOString().split("T")[0],
                    };
                    setNotes([newNote, ...notes]);
                    setSelectedNote(newNote);
                    setIsCreateOpen(false);
                  }}
                  onCancel={() => setIsCreateOpen(false)}
                />
              </DialogContent>
            </Dialog>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-0">
          <div className="space-y-2 px-4">
            {filteredNotes.map((note) => (
              <div
                key={note.id}
                onClick={() => setSelectedNote(note)}
                className={`p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedNote?.id === note.id
                    ? "bg-primary/10 border border-primary/20"
                    : "hover:bg-muted/50"
                }`}
              >
                <div className="space-y-2">
                  <h3 className="font-medium text-sm line-clamp-1">
                    {note.title}
                  </h3>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {note.content}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>
                        {new Date(note.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                    {note.project && (
                      <Badge variant="outline" className="text-xs">
                        {note.project}
                      </Badge>
                    )}
                  </div>
                  {note.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {note.tags.map((tag, index) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="text-xs"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Note Content */}
      <Card className="flex-1 flex flex-col">
        {selectedNote ? (
          <>
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h2 className="text-xl font-semibold">
                    {selectedNote.title}
                  </h2>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>
                        Updated{" "}
                        {new Date(selectedNote.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                    {selectedNote.project && (
                      <div className="flex items-center gap-1">
                        <FileText className="h-4 w-4" />
                        <span>{selectedNote.project}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[600px]">
                      <DialogHeader>
                        <DialogTitle>Edit Note</DialogTitle>
                      </DialogHeader>
                      <NoteForm
                        note={selectedNote}
                        onSave={(data: any) => {
                          const updatedNotes = notes.map((note) =>
                            note.id === selectedNote.id
                              ? { ...note, ...data }
                              : note
                          );
                          setNotes(updatedNotes);
                          setSelectedNote({ ...selectedNote, ...data });
                          setIsEditOpen(false);
                        }}
                        onCancel={() => setIsEditOpen(false)}
                      />
                    </DialogContent>
                  </Dialog>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-500 hover:text-red-700 bg-transparent"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-6">
              <div className="space-y-4">
                {selectedNote.tags.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-muted-foreground" />
                    <div className="flex flex-wrap gap-1">
                      {selectedNote.tags.map((tag: string, index: number) => (
                        <Badge key={index} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                <div className="prose prose-sm max-w-none">
                  <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                    {selectedNote.content}
                  </pre>
                </div>
              </div>
            </CardContent>
          </>
        ) : (
          <CardContent className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-2">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto" />
              <h3 className="text-lg font-medium">No note selected</h3>
              <p className="text-muted-foreground">
                Select a note from the sidebar to view its content
              </p>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}

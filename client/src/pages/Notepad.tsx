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
import { useNoteContext } from "@/context/NoteContext";
import { useProjectContext } from "@/context/ProjectContext";
import { useParams } from "react-router-dom";
import type { Note, NoteFormProps } from "@/Types/types";

import { AlertDialog } from "@radix-ui/react-alert-dialog";
import {
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function Notepad() {
  const { notes, addNote, updateNote, deleteNote, loading, error } =
    useNoteContext();
  const { projects } = useProjectContext();

  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const filteredNotes: Note[] = notes.filter(
    (note: Note) =>
      note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.content?.toLowerCase().includes(searchTerm.toLowerCase() ?? false) ||
      note.tags.some((tag) =>
        tag.toLowerCase().includes(searchTerm.toLowerCase())
      )
  );

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
  if (loading) return <div>Loading notes...</div>;
  if (error) return <div>Error: {error}</div>;

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
                  onSave={async (data: any) => {
                    const newNote: Note = {
                      id: notes.length + 1, // TODO: Replace with server-generated ID
                      companyId: 1, // TODO: Replace with useAuthContext().user.companyId
                      projectId: data.projectId || 0, // Use 0 for no project
                      authorId: 1, // TODO: Replace with useAuthContext().user.id
                      title: data.title!,
                      content: data.content,
                      tags: data.tags || [],
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString(),
                    };
                    await addNote(newNote);
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
            {filteredNotes.map((note: Note) => (
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
                    {note.projectId && (
                      <Badge variant="outline" className="text-xs">
                        {projects.find((p) => p.id === note.projectId)?.title ||
                          "Unknown Project"}
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
                    {selectedNote.projectId > 0 && (
                      <div className="flex items-center gap-1">
                        <FileText className="h-4 w-4" />
                        <span>
                          {projects.find(
                            (proj) => proj.id === selectedNote.projectId
                          )?.title || "Unknown Project"}
                        </span>
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
                        onSave={async (data) => {
                          await updateNote(selectedNote.id, data);
                          setSelectedNote({
                            ...selectedNote,
                            ...data,
                            updatedAt: new Date().toISOString(),
                          });
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
                    onClick={() => setIsDeleteOpen(true)}
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
      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Note</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this note? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (selectedNote) {
                  await deleteNote(selectedNote.id);
                  setSelectedNote(null);
                  setIsDeleteOpen(false);
                }
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Calendar,
  Users,
  Plus,
  Upload,
  MessageSquare,
  Download,
  Trash2,
  Edit,
} from "lucide-react";
import { useComments } from "../../hooks/useComments";
import { useParams } from "react-router-dom";
import { useProjectContext } from "@/context/ProjectContext";
import { useAssetContext } from "@/context/AssetContext";
import TaskDetailDialog from "@/components/TaskDetailDialog";
import TaskForm from "@/components/TaskForm";
import { TaskContextProvider, useTaskContext } from "@/context/TaskContext";
import { Toaster } from "sonner";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import type { Task } from "@/Types/types";

export default function ProjectDetail() {
  const { id } = useParams();
  const { projects, loading, error } = useProjectContext();
  const project = projects.find((project) => project.id === Number(id));
  const {
    tasks,
    addTask,
    selectedTask,
    setSelectedTask,
    setIsDeleteDialogOpen,
    setTaskToDelete,
    TaskToDelete,
    isDeleteDialogOpen,
    confirmDelete,
    updateTask,
  } = useTaskContext();
  const { files } = useAssetContext();
  const { comments, newComment, setNewComment, addComment } = useComments();
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const filteredTasks = tasks.filter((task) => task.projectId === Number(id));

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!project) return <div>No project data available</div>;

  return (
    <TaskContextProvider projectId={project.id}>
      <div className="space-y-6">
        {/* Project Header */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                {project.title}
              </h1>
              <p className="text-muted-foreground">{project.client}</p>
            </div>
            <Badge
              variant={
                project.status === "Completed"
                  ? "default"
                  : project.status === "In Progress"
                  ? "secondary"
                  : "outline"
              }
            >
              {project.status}
            </Badge>
          </div>

          {/* Project Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Deadline</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(project.deadline).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Team Members</p>
                    <p className="text-sm text-muted-foreground">
                      {project.team.length} members
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span>{project.progress}%</span>
                  </div>
                  <Progress value={project.progress} className="h-2" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="team">Team</TabsTrigger>
            <TabsTrigger value="assets">Assets</TabsTrigger>
            <TabsTrigger value="comments">Comments</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Project Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold">Description</h3>
                  <p className="text-muted-foreground">
                    {project.description || "No description provided."}
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Key Information</h3>
                  <ul className="text-sm text-muted-foreground space-y-2">
                    <li>
                      <strong>Client:</strong> {project.client}
                    </li>
                    <li>
                      <strong>Status:</strong> {project.status}
                    </li>
                    <li>
                      <strong>Deadline:</strong>{" "}
                      {new Date(project.deadline).toLocaleDateString()}
                    </li>
                    <li>
                      <strong>Total Tasks:</strong> {project.tasks.total}
                    </li>
                    <li>
                      <strong>Completed Tasks:</strong>{" "}
                      {project.tasks.completed}
                    </li>
                    <li>
                      <strong>Progress:</strong> {project.progress}%
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tasks Tab */}
          <TabsContent value="tasks" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Project Tasks</h2>
              <Dialog
                open={isTaskDialogOpen}
                onOpenChange={(open) => {
                  setIsTaskDialogOpen(open);
                  if (!open) setEditingTask(null);
                }}
              >
                <DialogTrigger asChild>
                  {filteredTasks.length > 0 && (
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Task
                    </Button>
                  )}
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Create New Task</DialogTitle>
                  </DialogHeader>
                  <TaskForm
                    key={selectedTask?.id ?? "new"}
                    defaultValues={editingTask || undefined}
                    onSave={(data) => {
                      if (editingTask) {
                        updateTask(editingTask.id, data);
                      } else {
                        addTask(project.id, data);
                      }
                      setIsTaskDialogOpen(false);
                      setEditingTask(null);
                    }}
                    onCancel={() => {
                      setIsTaskDialogOpen(false);
                      setEditingTask(null);
                    }}
                    team={project.team}
                  />
                </DialogContent>
              </Dialog>
            </div>

            {filteredTasks.length === 0 ? (
              <div className="text-center space-y-4">
                <p className="text-muted-foreground">
                  No tasks yet for this project.
                </p>
                <Button onClick={() => setIsTaskDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Task
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredTasks.map((task) => {
                  return (
                    <Card
                      key={task.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedTask(task)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <Checkbox
                              checked={task.status === "Done"}
                              className="mt-1"
                            />
                            <div className="space-y-1">
                              <h3 className="font-medium">{task.title}</h3>
                              <p className="text-sm text-muted-foreground">
                                {task.description}
                              </p>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <span>Assigned to: {task.assignee}</span>
                                <span>
                                  Due:{" "}
                                  {new Date(task.dueDate).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={
                                task.status === "Done"
                                  ? "default"
                                  : task.status === "In Progress"
                                  ? "secondary"
                                  : "outline"
                              }
                            >
                              {task.status}
                            </Badge>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingTask(task);
                                setIsTaskDialogOpen(true);
                              }}
                              aria-label={`Edit task ${task.title}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-500 hover:text-red-700"
                              aria-label={`Delete task ${task.title}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setTaskToDelete(task);
                                setIsDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
            <TaskDetailDialog
              task={selectedTask}
              onClose={() => setSelectedTask(null)}
            />
          </TabsContent>

          {/* Team Tab */}
          <TabsContent value="team" className="space-y-4">
            <h2 className="text-xl font-semibold">Team Members</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {project.team.map((member) => (
                <Card key={member.id}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={member.avatar || "/placeholder.svg"} />
                      <AvatarFallback>
                        {member.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{member.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {member.role}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Assets Tab */}
          <TabsContent value="assets" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Project Assets</h2>
              <Button>
                <Upload className="h-4 w-4 mr-2" />
                Upload File
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {files.map((file) => (
                <Card key={file.id}>
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
                            <span className="text-xs font-medium text-blue-600">
                              {file.type.toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-sm">{file.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {file.size}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm">
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-700"
                            aria-label={`Delete file ${file.name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Uploaded on{" "}
                        {new Date(file.uploadDate).toLocaleDateString()}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Comments Tab */}
          <TabsContent value="comments" className="space-y-4">
            <h2 className="text-xl font-semibold">Project Comments</h2>

            <div className="space-y-4">
              {comments.map((comment) => (
                <Card key={comment.id}>
                  <CardContent className="p-4">
                    <div className="flex gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage
                          src={comment.avatar || "/placeholder.svg"}
                        />
                        <AvatarFallback>
                          {comment.author
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">
                            {comment.author}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {comment.timestamp}
                          </span>
                        </div>
                        <p className="text-sm">{comment.content}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardContent className="p-4">
                <div className="space-y-3">
                  <Textarea
                    placeholder="Add a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    rows={3}
                  />
                  <div className="flex justify-end">
                    <Button
                      onClick={() => addComment(newComment)}
                      disabled={!newComment.trim()}
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Add Comment
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Delete Confirmation Dialog */}
        <AlertDialog
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Task</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete{" "}
                <strong>{TaskToDelete?.title}</strong>? This action cannot be
                undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex justify-end gap-2 pt-4">
              <AlertDialogCancel onClick={() => setTaskToDelete(null)}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => confirmDelete()}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>

        {/* Sonner toaster */}
        <Toaster position="top-right" />
      </div>
    </TaskContextProvider>
  );
}

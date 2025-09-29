import { useEffect, useMemo, useRef, useState } from "react";
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
import { useProjectTaskStats } from "@/hooks/useProjectTaskStats";
import { useTeamContext } from "@/context/TeamMemberContext";
import { useCommentContext } from "@/context/CommentContext";

export default function ProjectDetail() {
  const { id } = useParams();
  const {
    projects,
    loading,
    error,
    getTeamMembersDetails,
    currentProject,
    setCurrentProject,
  } = useProjectContext();
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
  const {
    files,
    currentFile,
    addFile,
    confirmFileDelete,
    setFileToDelete,
    fileToDelete,
  } = useAssetContext();
  const { comments, newComment, setNewComment, addComment } =
    useCommentContext();
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const filteredTasks = useMemo(
    () => tasks.filter((task) => task.projectId === Number(id)),
    [tasks, id]
  );
  const { total, completed, progress } = useProjectTaskStats(Number(id));

  const team = currentProject ? getTeamMembersDetails(currentProject.team) : [];
  const { teamMembers } = useTeamContext();
  const filteredfiles = useMemo(
    () => files.filter((file) => file.projectId === Number(id)),
    [files, id]
  );
  const filteredComments = useMemo(
    () => comments.filter((comment) => comment.projectId === Number(id)),
    [comments, id]
  );

  const mergedComments = useMemo(() => {
    return filteredComments.map((comment) => {
      const author = teamMembers.find(
        (member) => member.id === comment.authorId
      );
      return {
        ...comment,
        author: author
          ? `${author.firstname} ${author.lastname}`
          : "Unknown Author",
        avatar: author?.avatar ?? "/placeholder.svg",
      };
    });
  }, [filteredComments, teamMembers]);

  const selectedAssignees = teamMembers.filter((member) =>
    selectedTask?.assignee.includes(member.id)
  );

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (project && !currentProject) {
      setCurrentProject(project);
    }
  }, [project, currentProject, setCurrentProject]);

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
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
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
                      <strong>Total Tasks:</strong> {total}
                    </li>
                    <li>
                      <strong>Completed Tasks:</strong> {completed}
                    </li>
                    <li>
                      <strong>Progress:</strong> {progress}%
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
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Task
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Create New Task</DialogTitle>
                  </DialogHeader>
                  <TaskForm
                    key={selectedTask?.id ?? "new"}
                    defaultValues={
                      editingTask
                        ? {
                            ...editingTask,
                            assignee: editingTask.assignee[0]?.toString() || "",
                          }
                        : { assignee: [] } // Ensure default assignee is an array
                    }
                    onSave={(data) => {
                      // Normalize assignee to always be an array
                      const normalizedData = {
                        ...data,
                        assignee: Array.isArray(data.assignee)
                          ? data.assignee.map(Number)
                          : data.assignee
                          ? [Number(data.assignee)]
                          : [],
                      };
                      if (editingTask) {
                        updateTask(editingTask.id, normalizedData);
                      } else {
                        addTask(project.id, 1, normalizedData); // replace with actual companyId
                      }
                      setIsTaskDialogOpen(false);
                      setEditingTask(null);
                    }}
                    onCancel={() => {
                      setIsTaskDialogOpen(false);
                      setEditingTask(null);
                    }}
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
                  // Ensure assignee is an array
                  const assignees = Array.isArray(task.assignee)
                    ? task.assignee
                    : [];
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
                              onCheckedChange={(checked) =>
                                updateTask(task.id, {
                                  ...task,
                                  status: checked ? "Done" : "To Do",
                                })
                              }
                              onClick={(e) => {
                                e.stopPropagation();
                              }}
                            />
                            <div className="space-y-1">
                              <h3 className="font-medium">{task.title}</h3>
                              <p className="text-sm text-muted-foreground">
                                {task.description}
                              </p>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <span>
                                  Assigned to:{" "}
                                  {assignees.length > 0
                                    ? assignees
                                        .map((id) => {
                                          const member = teamMembers.find(
                                            (member) => member.id === id
                                          );
                                          return member
                                            ? `${member.firstname} ${member.lastname}`
                                            : "Unknown";
                                        })
                                        .join(", ")
                                    : "Unassigned"}
                                </span>
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
              assignee={teamMembers.filter((member) =>
                Array.isArray(selectedTask?.assignee)
                  ? selectedTask.assignee.includes(member.id)
                  : false
              )}
            />
          </TabsContent>

          {/* Team Tab */}
          <TabsContent value="team" className="space-y-4">
            <h2 className="text-xl font-semibold">Team Members</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {team.map((member) => (
                <Card key={member.id}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={member.avatar || "/placeholder.svg"} />
                      <AvatarFallback>
                        {`${member.firstname?.[0] ?? ""}${
                          member.lastname?.[0] ?? ""
                        }`}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">
                        {member.firstname} {member.lastname}
                      </p>
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
              {filteredfiles.length > 0 && (
                <Button onClick={() => fileInputRef.current?.click()}>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload File
                </Button>
              )}
              <label htmlFor="file-upload" className="sr-only">
                Upload File
              </label>
              <input
                id="file-upload"
                className="hidden"
                type="file"
                ref={fileInputRef}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    // Normalize file data
                    const fileData = {
                      id: files.length + 1,
                      companyId: 1,
                      projectId: Number(id),
                      assigneeId: 1,
                      name: file.name,
                      type: file.type.split("/")[1] || "unknown",
                      size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,

                      uploadDate: new Date().toISOString(),
                      // url: URL.createObjectURL(file), // For download
                    };
                    addFile(fileData); // Assuming addFile(fileData) in AssetContext
                  }
                }}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredfiles.length === 0 ? (
                <div className="text-center space-y-4 col-span-3">
                  <p className="text-muted-foreground">
                    No files uploaded yet for this project.
                  </p>
                  <Button onClick={() => fileInputRef.current?.click()}>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload File
                  </Button>
                </div>
              ) : (
                filteredfiles.map((file) => (
                  <Card key={file.id}>
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
                              <span className="text-xs font-medium text-blue-600">
                                {file.type.toUpperCase().slice(0, 1)}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-sm">
                                {`${file.name.slice(0, 20)}...${file.name.slice(
                                  -4
                                )}`}
                              </p>
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
                              onClick={(e) => {
                                e.stopPropagation();
                                setFileToDelete(file);
                                setIsDeleteDialogOpen(true);
                              }}
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
                ))
              )}
            </div>
          </TabsContent>

          {/* Comments Tab */}

          <TabsContent
            value="comments"
            className="flex flex-col h-full space-y-4"
          >
            <h2 className="text-xl font-semibold">Project Comments</h2>

            {/* Comment List */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {mergedComments.length === 0 ? (
                <div className="text-center space-y-4">
                  <p className="text-muted-foreground">
                    No comments yet for this project.
                  </p>
                </div>
              ) : (
                mergedComments.map((comment) => (
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
                ))
              )}
            </div>

            {/* Sticky Comment Input */}
            <div className="sticky bottom-0 bg-background border-t pt-2">
              <Card className="shadow-none border-none">
                <CardContent className="p-4 pt-2">
                  <div className="space-y-3">
                    <Textarea
                      placeholder="Add a comment..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      rows={2}
                    />
                    <div className="flex justify-end">
                      <Button
                        onClick={() => {
                          if (newComment.trim()) {
                            addComment(
                              newComment,
                              1, // Assuming project has companyId
                              1, // Replace with actual user ID
                              project.id
                            );
                          }
                        }}
                        disabled={!newComment.trim()}
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Add Comment
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Delete Confirmation Dialog */}
        <AlertDialog
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {TaskToDelete ? "Delete Task" : "Delete File"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete{" "}
                <strong>
                  {TaskToDelete
                    ? `${TaskToDelete.title}`
                    : fileToDelete
                    ? `${fileToDelete.name}`
                    : "No item selected for deletion"}
                </strong>
                ? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex justify-end gap-2 pt-4">
              <AlertDialogCancel
                onClick={() => {
                  if (TaskToDelete) {
                    setTaskToDelete(null);
                  } else setFileToDelete(null);
                }}
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (TaskToDelete) {
                    confirmDelete();
                  } else {
                    confirmFileDelete();
                  }
                }}
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

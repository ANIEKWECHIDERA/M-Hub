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

import { useParams, Link as RouterLink } from "react-router-dom";
import { CommentsSystem } from "@/components/CommentsSystem";
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
import {
  CommentContextProvider,
  useCommentContext,
} from "@/context/CommentContext";
import { Input } from "@/components/ui/input";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";

export default function ProjectDetail() {
  const { id } = useParams();
  const { projects, loading, error, currentProject, setCurrentProject } =
    useProjectContext();
  const project = projects.find((project) => project.id === id);
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
    getEnrichedTaskById,
  } = useTaskContext();
  const {
    files,
    fetchFilesByProject,
    uploadFiles,
    confirmFileDelete,
    setFileToDelete,
    fileToDelete,
  } = useAssetContext();
  const {
    comments,
    loading: commentLoading,
    addComment,
    updateComment,
    deleteComment,
  } = useCommentContext();
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const filteredTasks = useMemo(
    () => tasks.filter((task) => task.projectId === id),
    [tasks, id]
  );
  const { total, completed, progress } = useProjectTaskStats(id ?? "");

  const team = currentProject ? currentProject.team_members ?? [] : [];
  const { teamMembers } = useTeamContext();
  const filteredfiles = useMemo(
    () => files.filter((file) => file.project_id === (id ?? "")),
    [files, id]
  );

  // const selectedAssignees = teamMembers.filter((member) =>
  //   selectedTask?.assignee.includes(member.id)
  // );

  useEffect(() => {
    if (project && (!currentProject || currentProject.id !== project.id)) {
      setCurrentProject(project);
    }
  }, [project, currentProject, setCurrentProject]);

  useEffect(() => {
    if (project?.id) {
      fetchFilesByProject(project.id);
    }
  }, [project?.id, fetchFilesByProject]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !project?.id) return;

    // snapshot files immediately
    const files = Array.from(e.target.files);

    // reset input immediately
    e.target.value = "";

    await uploadFiles(project.id, files);

    console.log("uploaded files:", files);
  };
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!project) return <div>No project data available</div>;

  return (
    <TaskContextProvider projectId={project.id}>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink>
                <RouterLink to="/">Home</RouterLink>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink>
                <RouterLink to="/projects">Projects</RouterLink>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{project.title}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        {/* Project Header */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                {project.title}
              </h1>
              <p className="text-muted-foreground">{project.client?.name}</p>
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
                      {new Date(project.deadline ?? "").toLocaleDateString()}
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
                      {(project.team_members ?? []).length} members
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
                      <strong>Client:</strong>{" "}
                      {project.client?.name
                        ? project.client?.name
                        : "No client assigned"}
                    </li>
                    <li>
                      <strong>Status:</strong> {project.status}
                    </li>
                    <li>
                      <strong>Deadline:</strong>{" "}
                      {new Date(project.deadline ?? "").toLocaleDateString()}
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
                  <Button onClick={() => setEditingTask(null)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Task
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>
                      {editingTask ? "Update Task" : "Create New Task"}
                    </DialogTitle>
                  </DialogHeader>
                  <TaskForm
                    key={selectedTask?.id ?? "new"}
                    defaultValues={
                      editingTask
                        ? {
                            ...editingTask,
                            assignee: editingTask.assignee, // Pass array directly
                          }
                        : { assignee: [] }
                    }
                    onSave={(data) => {
                      if (editingTask) {
                        updateTask(editingTask.id, data);
                      } else {
                        addTask(project.id, "1", data);
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
                  const assignees = Array.isArray(task.assignee)
                    ? task.assignee
                    : [];
                  const isDone = task.status === "Done";
                  return (
                    <Card
                      key={task.id}
                      className="hover:shadow-md transition-all cursor-pointer group"
                      onClick={() => {
                        const enriched = getEnrichedTaskById(task.id);
                        if (enriched) {
                          setSelectedTask(enriched);
                        }
                      }}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={isDone}
                            onCheckedChange={(checked) =>
                              updateTask(task.id, {
                                ...task,
                                status: checked ? "Done" : "To-Do",
                                updatedAt: new Date().toISOString(),
                              })
                            }
                            onClick={(e) => e.stopPropagation()}
                            className="mt-1"
                          />

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex-1 min-w-0">
                                <h3
                                  className={`font-medium text-base mb-1 ${
                                    isDone
                                      ? "line-through text-muted-foreground"
                                      : ""
                                  }`}
                                >
                                  {task.title}
                                </h3>
                                <p className="text-sm text-muted-foreground line-clamp-2">
                                  {task.description}
                                </p>
                              </div>

                              <div className="flex items-center gap-2 mr-9">
                                <Badge
                                  variant="outline"
                                  className={
                                    task.priority === "high"
                                      ? "text-red-600"
                                      : task.priority === "medium"
                                      ? "text-yellow-600"
                                      : "text-green-600"
                                  }
                                >
                                  {task.priority?.[0]?.toUpperCase()}
                                  {task.priority?.slice(1)}
                                </Badge>
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <span className="truncate max-w-[200px]">
                                  Assigned to:{" "}
                                  {assignees.length > 0
                                    ? assignees
                                        .map((id) => {
                                          const member = teamMembers.find(
                                            (m) => m.id === id
                                          );
                                          return member
                                            ? `${member.firstname} ${member.lastname}`
                                            : "Unknown";
                                        })
                                        .join(", ")
                                    : "Unassigned"}
                                </span>
                              </div>
                              <span>
                                Due:{" "}
                                {new Date(task.dueDate).toLocaleDateString()}
                              </span>
                              <Badge variant="outline">{task.status}</Badge>
                              {task.subtaskIds &&
                                task.subtaskIds.length > 0 && (
                                  <span>
                                    0/{task.subtaskIds.length} subtasks
                                  </span>
                                )}
                            </div>

                            {typeof (task as any).progress === "number" &&
                              (task as any).progress < 100 &&
                              task.subtaskIds &&
                              task.subtaskIds.length > 0 && (
                                <div className="flex items-center gap-2 mt-3">
                                  <Progress
                                    value={(task as any).progress}
                                    className="h-2 flex-1"
                                  />
                                  <span className="text-xs text-muted-foreground min-w-[40px]">
                                    {(task as any).progress}%
                                  </span>
                                </div>
                              )}
                          </div>

                          <div className="flex items-center gap-2">
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
              {team.map((team_members) => (
                <Card key={team_members.id}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage
                        src={team_members.avatar || "/placeholder.svg"}
                      />
                      <AvatarFallback>
                        {team_members.name
                          ?.split(" ")
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join("")
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{team_members.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {team_members.role}
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
              <Input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                id="file-upload"
                onChange={handleFileUpload}
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
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                window.open(file.url, "_blank");
                              }}
                            >
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
                          {new Date(file.upload_date).toLocaleDateString()}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* Comments Tab */}
          <CommentContextProvider projectId={project.id}>
            <TabsContent value="comments" className="space-y-4">
              <h2 className="text-xl font-semibold">Project Comments</h2>
              <CommentsSystem
                comments={comments}
                loading={commentLoading}
                onCommentAdd={addComment}
                onCommentUpdate={updateComment}
                onCommentDelete={deleteComment}
              />
            </TabsContent>
          </CommentContextProvider>
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

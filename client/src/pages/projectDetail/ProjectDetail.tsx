import { useEffect, useMemo, useRef, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  Download,
  Trash2,
  Edit,
  Loader,
} from "lucide-react";
import { useParams, Link as RouterLink } from "react-router-dom";
import { CommentsSystem } from "@/components/CommentsSystem";
import { useProjectContext } from "@/context/ProjectContext";
import { useAssetContext } from "@/context/AssetContext";
import TaskDetailDialog from "@/components/TaskDetailDialog";
import TaskForm from "@/components/TaskForm";
import { useTaskContext } from "@/context/TaskContext";
// import { Toaster } from "sonner";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import type { TaskWithAssigneesDTO, TeamMemberSummary } from "@/Types/types";
import { useProjectTaskStats } from "@/hooks/useProjectTaskStats";
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
// import Loader from "@/components/Loader";
import { TaskListSkeleton } from "@/components/TaskListSkeleton";
import { useMyTasksContext } from "@/context/MyTaskContext";
import { useTeamContext } from "@/context/TeamMemberContext";

export function ProjectDetail() {
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
    taskToDelete,
    isDeleteDialogOpen,
    confirmDelete,
    updateTask,
    setTasks,
    loading: taskLoading,
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

  const { refetch } = useMyTasksContext();
  const { currentMember } = useTeamContext();

  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskWithAssigneesDTO | null>(
    null,
  );

  const filteredTasks = useMemo(
    () => tasks.filter((task) => task.projectId === id),
    [tasks, id],
  );

  const { total, completed, progress } = useProjectTaskStats(id ?? "");
  const team = currentProject ? (currentProject.team_members ?? []) : [];

  const filteredfiles = useMemo(
    () => files.filter((file) => file.project_id === (id ?? "")),
    [files, id],
  );

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
    const files = Array.from(e.target.files);
    e.target.value = "";
    await uploadFiles(project.id, files);
  };

  if (loading)
    return (
      <div>
        <Loader className="animate-spin" />
      </div>
    );
  if (error) return <div>Error: {error}</div>;
  if (!project) return <div>No project data available</div>;

  // console.log("current Project data:", currentProject);

  return (
    <div className="space-y-6">
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

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Project Deadline</p>
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
                    {(project.team_members ?? []).length}{" "}
                    {project.team_members.length <= 1 ? "member" : "members"}
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

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="assets">Assets</TabsTrigger>
          <TabsTrigger value="comments">Comments</TabsTrigger>
        </TabsList>

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
                    {project.client?.name || "No client assigned"}
                  </li>
                  <li>
                    <strong>Status:</strong> {project.status}
                  </li>
                  <li>
                    <strong>Project Deadline:</strong>{" "}
                    {new Date(project.deadline ?? "").toLocaleDateString()}
                  </li>
                  <li>
                    <strong>Total Task(s):</strong> {total}
                  </li>
                  <li>
                    <strong>Completed Task(s):</strong> {completed}
                  </li>
                  <li>
                    <strong>Progress:</strong> {progress}%
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks" className="space-y-4">
          {taskLoading ? (
            <TaskListSkeleton />
          ) : (
            <>
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
                    {filteredTasks.length !== 0 && (
                      <Button onClick={() => setEditingTask(null)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Task
                      </Button>
                    )}
                  </DialogTrigger>

                  <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                      <DialogTitle>
                        {editingTask ? "Update Task" : "Create New Task"}
                      </DialogTitle>
                      <DialogDescription>
                        {editingTask
                          ? "Update the task details and save your changes."
                          : "Create New Task"}
                      </DialogDescription>
                    </DialogHeader>
                    <TaskForm
                      key={editingTask?.id ?? "new"}
                      defaultValues={editingTask ?? undefined}
                      onSave={async (data) => {
                        try {
                          let updatedTask;

                          if (editingTask) {
                            // Update existing task
                            updatedTask = await updateTask(
                              editingTask.id,
                              data,
                            );
                          } else {
                            // Create new task
                            const created = await addTask(data);
                            if (!created) return;

                            const teamMembers: TeamMemberSummary[] =
                              project.team_members
                                ?.filter((m) =>
                                  data.team_member_ids.includes(m.id),
                                )
                                .map((m) => ({
                                  id: m.id,
                                  name: m.name,
                                  avatar: m.avatar ?? null,
                                  role: m.role ?? "member",
                                })) ?? [];

                            updatedTask = {
                              ...created,
                              team_members: teamMembers,
                            };

                            console.log("updated Task Shape:", updatedTask);

                            setTasks((prev) =>
                              prev.map((t) =>
                                t.id === created.id
                                  ? { ...created, team_members: teamMembers }
                                  : t,
                              ),
                            );
                          }

                          // --- REFRESH MY TASKS IF CURRENT USER IS ASSIGNED ---
                          if (
                            updatedTask?.team_members?.some(
                              (m) => m.id === currentMember?.id,
                            )
                          ) {
                            await refetch();
                          }

                          setIsTaskDialogOpen(false);
                          setEditingTask(null);
                        } catch (error) {
                          console.error("Failed to save task:", error);
                        }
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
                    const isDone = task.status === "Done";
                    return (
                      <Card
                        key={task.id}
                        className="hover:shadow-md transition-all cursor-pointer group"
                        onClick={() => setSelectedTask(task)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <Checkbox
                              checked={isDone}
                              onCheckedChange={async (checked) => {
                                await updateTask(task.id, {
                                  status: checked ? "Done" : "To-Do",
                                });
                              }}
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
                                  {task.description && (
                                    <p className="text-sm text-muted-foreground line-clamp-2">
                                      {task.description}
                                    </p>
                                  )}
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
                                    {task.team_members &&
                                    task.team_members.length > 0
                                      ? task.team_members
                                          .map((m) => m.name)
                                          .join(", ")
                                      : "Unassigned"}
                                  </span>
                                </div>
                                {task.due_date && (
                                  <span>
                                    Due:{" "}
                                    {new Date(
                                      task.due_date,
                                    ).toLocaleDateString()}
                                  </span>
                                )}
                                <Badge variant="outline">{task.status}</Badge>
                              </div>
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

              {selectedTask && (
                <TaskDetailDialog
                  task={selectedTask}
                  onClose={() => setSelectedTask(null)}
                  assignee={selectedTask.team_members ?? []}
                />
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="team" className="space-y-4">
          <h2 className="text-xl font-semibold">Team Members</h2>

          {team && team.length > 0 ? (
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
          ) : (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center text-muted-foreground">
              <p className="text-sm">
                No team members have been added to this project yet.
              </p>
              <p className="text-xs mt-1">
                Add team members from the Projects Page.
              </p>
            </div>
          )}
        </TabsContent>

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
                                -4,
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
                            onClick={() => window.open(file.url, "_blank")}
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

      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {taskToDelete ? "Delete Task" : "Delete File"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <strong>
                {taskToDelete
                  ? `${taskToDelete.title}`
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
                if (taskToDelete) {
                  setTaskToDelete(null);
                } else setFileToDelete(null);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (taskToDelete) {
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

      {/* <Toaster position="top-right" /> */}
    </div>
  );
}

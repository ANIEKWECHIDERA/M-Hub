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
  ChevronDown,
  SlidersHorizontal,
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
import { useCommentContext } from "@/context/CommentContext";
import { Input } from "@/components/ui/input";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
// import Loader from "@/components/Loader";
import { TaskListSkeleton } from "@/components/TaskListSkeleton";
import { useMyTasksContext } from "@/context/MyTaskContext";
import { useTeamContext } from "@/context/TeamMemberContext";
import { useAuthContext } from "@/context/AuthContext";

export function ProjectDetail() {
  const { id } = useParams();
  const { authStatus } = useAuthContext();
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
  const [showCompactOverview, setShowCompactOverview] = useState(false);

  const filteredTasks = useMemo(
    () => tasks.filter((task) => task.projectId === id),
    [tasks, id],
  );
  const projectSnapshot = currentProject ?? project ?? null;
  const total = projectSnapshot?.task_count ?? 0;
  const completed = projectSnapshot?.completed_task_count ?? 0;
  const progress = projectSnapshot?.progress ?? 0;
  const team = currentProject ? (currentProject.team_members ?? []) : [];
  const isTeamMember =
    authStatus?.access === "team_member" || authStatus?.access === "member";

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
    <div className="flex h-full min-h-0 flex-col gap-6">
      <div className="space-y-4">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <RouterLink
                to="/"
                className="transition-colors hover:text-foreground"
              >
                Home
              </RouterLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <RouterLink
                to="/projects"
                className="transition-colors hover:text-foreground"
              >
                Projects
              </RouterLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{project.title}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                {project.title}
              </h1>
              <p className="text-muted-foreground">{project.client?.name}</p>
            </div>
            <div className="flex flex-col items-stretch gap-3 sm:items-end">
              <Badge
                className="h-7 justify-center px-2 text-[11px] font-medium sm:justify-start"
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
              <Button
                type="button"
                variant="outline"
                className="sm:hidden"
                onClick={() => setShowCompactOverview((value) => !value)}
              >
                <SlidersHorizontal className="mr-2 h-4 w-4" />
                {showCompactOverview ? "Hide overview" : "Show overview"}
                <ChevronDown
                  className={`ml-2 h-4 w-4 transition-transform ${
                    showCompactOverview ? "rotate-180" : ""
                  }`}
                />
              </Button>
            </div>
          </div>

          <div
            className={`grid grid-cols-1 gap-3 md:grid-cols-3 ${
              showCompactOverview ? "grid" : "hidden sm:grid"
            }`}
          >
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
      </div>

      <Tabs
        defaultValue="overview"
        className="flex min-h-0 flex-1 flex-col"
      >
        <TabsList
          className={`grid w-full shrink-0 overflow-x-auto ${
            isTeamMember ? "grid-cols-3" : "grid-cols-5"
          }`}
        >
          <TabsTrigger value="overview">Overview</TabsTrigger>
          {!isTeamMember && (
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
          )}
          {!isTeamMember && (
            <TabsTrigger value="team">Team</TabsTrigger>
          )}
          <TabsTrigger value="assets">Assets</TabsTrigger>
          <TabsTrigger value="comments">Comments</TabsTrigger>
        </TabsList>

        <TabsContent
          value="overview"
          className="mt-4 pb-2"
        >
          <Card className="app-surface">
            <CardHeader className="border-b pb-4">
              <CardTitle className="text-xl">Project Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 p-6">
              <div className="space-y-2">
                <p className="section-heading">Description</p>
                <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                  {project.description || "No description provided."}
                </p>
              </div>

              <div className="space-y-3">
                <p className="section-heading">Key Information</p>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  <div className="rounded-lg border bg-muted/30 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Client
                    </p>
                    <p className="mt-2 text-sm font-medium">
                      {project.client?.name || "No client assigned"}
                    </p>
                  </div>
                  <div className="rounded-lg border bg-muted/30 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Status
                    </p>
                    <p className="mt-2 text-sm font-medium">{project.status}</p>
                  </div>
                  <div className="rounded-lg border bg-muted/30 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Deadline
                    </p>
                    <p className="mt-2 text-sm font-medium">
                      {new Date(project.deadline ?? "").toLocaleDateString()}
                    </p>
                  </div>
                  <div className="rounded-lg border bg-muted/30 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Total Tasks
                    </p>
                    <p className="mt-2 text-sm font-medium">{total}</p>
                  </div>
                  <div className="rounded-lg border bg-muted/30 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Completed
                    </p>
                    <p className="mt-2 text-sm font-medium">{completed}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {!isTeamMember && (
          <TabsContent
            value="tasks"
            className="mt-4 min-h-0 flex-1 overflow-hidden"
          >
            <div className="flex h-full min-h-0 flex-col">
              {taskLoading ? (
                <TaskListSkeleton />
              ) : (
                <>
                  <div className="mb-4 flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="mt-1 text-xl font-semibold">
                        Project Tasks
                      </h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Track progress, assignees, due dates, and task status
                        for this project.
                      </p>
                    </div>
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
                            setIsTaskDialogOpen(false);
                            setEditingTask(null);

                            try {
                              let updatedTask;

                              if (editingTask) {
                                updatedTask = await updateTask(
                                  editingTask.id,
                                  data,
                                );
                              } else {
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

                                setTasks((prev) =>
                                  prev.map((t) =>
                                    t.id === created.id
                                      ? {
                                          ...created,
                                          team_members: teamMembers,
                                        }
                                      : t,
                                  ),
                                );
                              }

                              if (
                                updatedTask?.team_members?.some(
                                  (m) => m.id === currentMember?.id,
                                )
                              ) {
                                await refetch();
                              }
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

                  <div className="min-h-0 flex-1 overflow-hidden">
                    <div className="flex h-full min-h-0 flex-col">
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
                        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                          <div className="space-y-3">
                            {filteredTasks.map((task) => {
                              const isDone = task.status === "Done";
                              const assignees =
                                task.team_members && task.team_members.length > 0
                                  ? task.team_members.map((m) => m.name).join(", ")
                                  : "Unassigned";

                              return (
                                <div
                                  key={task.id}
                                  className="cursor-pointer rounded-xl border bg-card px-4 py-4 transition-colors hover:bg-muted/20"
                                  onClick={() => setSelectedTask(task)}
                                >
                                  <div className="flex items-start gap-3">
                                    <div className="pt-1">
                                      <Checkbox
                                        checked={isDone}
                                        onCheckedChange={async (checked) => {
                                          await updateTask(task.id, {
                                            status: checked ? "Done" : "To-Do",
                                          });
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                      />
                                    </div>

                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-start justify-between gap-4">
                                        <div className="min-w-0 flex-1">
                                          <p
                                            className={`truncate text-base font-semibold ${
                                              isDone
                                                ? "text-muted-foreground line-through"
                                                : "text-foreground"
                                            }`}
                                          >
                                            {task.title}
                                          </p>
                                          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                                            {task.description || "No description"}
                                          </p>
                                        </div>

                                        <div className="flex shrink-0 items-center gap-1">
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

                                      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                                        <span className="truncate">
                                          Assigned to: {assignees}
                                        </span>
                                        <span>
                                          Due:{" "}
                                          {task.due_date
                                            ? new Date(
                                                task.due_date,
                                              ).toLocaleDateString()
                                            : "No date"}
                                        </span>
                                        <Badge variant="outline">
                                          {task.status}
                                        </Badge>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {selectedTask && (
                    <TaskDetailDialog
                      task={selectedTask}
                      onClose={() => setSelectedTask(null)}
                      assignee={selectedTask.team_members ?? []}
                    />
                  )}
                </>
              )}
            </div>
          </TabsContent>
        )}

        {!isTeamMember && (
          <TabsContent
            value="team"
            className="mt-4 border border-b rounded-t-xl"
          >
            <div className="mb-4  border-b bg-card p-4">
              <h2 className="text-xl font-semibold">Team Members</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                People currently attached to this project workspace.
              </p>
            </div>

            {team && team.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 px-6">
                {team.map((team_members) => (
                  <Card key={team_members.id} className="app-surface">
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
        )}

        <TabsContent
          value="assets"
          className="mt-4 border border-b rounded-t-xl"
        >
          <div className="mb-4 flex flex-col gap-3 border-b bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Project Assets</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Store uploads, references, and deliverables for this project.
              </p>
            </div>
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

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 px-6">
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
                <Card key={file.id} className="app-surface">
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg border bg-muted/40">
                            <span className="text-xs font-medium text-foreground">
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

        <TabsContent
          value="comments"
          className="mt-4 flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <div className="shrink-0 pb-4">
            <h2 className="text-xl font-semibold">Project Comments</h2>
          </div>
          <CommentsSystem
            comments={comments}
            loading={commentLoading}
            onCommentAdd={addComment}
            onCommentUpdate={updateComment}
            onCommentDelete={deleteComment}
          />
        </TabsContent>
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

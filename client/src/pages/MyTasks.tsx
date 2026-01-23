import { useState, useMemo, useDeferredValue, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  CheckCircle2,
  Circle,
  Clock,
  AlertCircle,
  Calendar,
  FolderOpen,
  Search,
  SortAsc,
  Plus,
  MessageSquare,
  Paperclip,
  ChevronRight,
  Target,
  TrendingUp,
  ListTodo,
  Edit,
  Trash2,
  type LucideProps,
} from "lucide-react";
import { cn } from "@/lib/utils";
// import { CommentsSystem } from "@/components/CommentsSystem";
import type { Subtask, TaskStatus } from "@/Types/types";
import { useTaskContext } from "@/context/TaskContext";
import { useTeamContext } from "@/context/TeamMemberContext";
import { useSubTasksContext } from "@/context/SubTasksContext";
// import { useCommentContext } from "@/context/CommentContext";

// Comments are sourced from CommentContext; removed mock comments

const statusConfig: Record<
  TaskStatus,
  {
    label: string;
    icon: React.ForwardRefExoticComponent<
      Omit<LucideProps, "ref"> & React.RefAttributes<SVGSVGElement>
    >;
    color: string;
    bg: string;
  }
> = {
  "To-Do": {
    label: "To-Do",
    icon: Circle,
    color: "text-gray-500",
    bg: "bg-gray-100 dark:bg-gray-800",
  },
  "In Progress": {
    label: "In Progress",
    icon: Clock,
    color: "text-blue-500",
    bg: "bg-blue-100 dark:bg-blue-900/20",
  },
  Done: {
    label: "Completed",
    icon: CheckCircle2,
    color: "text-green-500",
    bg: "bg-green-100 dark:bg-green-900/20",
  },
};

const priorityConfig = {
  low: { label: "Low", color: "text-green-600 dark:text-green-400" },
  medium: { label: "Medium", color: "text-yellow-600 dark:text-yellow-400" },
  high: { label: "High", color: "text-red-600 dark:text-red-400" },
};

export default function MyTasksPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterProject, setFilterProject] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("dueDate");
  const [viewMode, setViewMode] = useState<
    "all" | "today" | "overdue" | "upcoming"
  >("all");
  const [isDetailsPanelOpen, setIsDetailsPanelOpen] = useState(false);
  const [newSubtask, setNewSubtask] = useState("");
  const [editingSubtaskId, setEditingSubtaskId] = useState<number | null>(null);
  const [editingSubtaskTitle, setEditingSubtaskTitle] = useState("");
  const {
    tasks,
    setTasks,
    addTask,
    selectedTask,
    setSelectedTask,
    setIsDeleteDialogOpen,
    setTaskToDelete,
    isDeleteDialogOpen,
    confirmDelete,
    updateTask,
  } = useTaskContext();
  const { teamMembers, currentMember } = useTeamContext();
  const { updateSubtask, addSubtask, deleteSubtask, subtasks } =
    useSubTasksContext();
  // const { comments, addComment, updateComment, deleteComment } =
  //   useCommentContext();

  // Get assigneeId from auth context (fallback to 1 if not available)
  const assigneeId = currentMember?.id ?? 1; // TODO: Ensure currentUser.id comes from auth context
  // TODO: Make companyId dynamic (e.g., from user context or auth)
  const companyId = "3b72e747-22d9-40b6-9445-8308253923c1"; // Hardcoded for now

  // const tasks = tasks;
  const deferredSearch = useDeferredValue(searchQuery);
  const stats = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today.getTime() + 86400000);

    // Filter tasks by assignee and company
    const assignedTasks = tasks.filter(
      (task) =>
        Array.isArray(task.assignees) &&
        task.assignees.includes(assigneeId) &&
        task.companyId === companyId,
    );

    return {
      total: assignedTasks.length,
      completed: assignedTasks.filter((t) => t.status === "Done").length,
      inProgress: assignedTasks.filter((t) => t.status === "In Progress")
        .length,
      todo: assignedTasks.filter((t) => t.status === "To-Do").length,
      overdue: assignedTasks.filter(
        (t) => new Date(t.due_date ?? 0) < today && t.status !== "Done",
      ).length,
      dueToday: assignedTasks.filter((t) => {
        const dueDate = new Date(t.due_date ?? 0);
        return dueDate >= today && dueDate < tomorrow && t.status !== "Done";
      }).length,
    };
  }, [tasks, assigneeId]);

  // Filter and sort tasks
  const filteredTasks = useMemo(() => {
    const filtered = tasks.filter((task) => {
      // Only show tasks assigned to the specific team member and company
      const matchesAssignee =
        Array.isArray(task.assignees) && task.assignees?.includes(assigneeId);
      const matchesCompany = task.companyId === companyId;

      const matchesSearch =
        task.title.toLowerCase().includes(deferredSearch.toLowerCase()) ||
        task.description
          ?.toLowerCase()
          .includes(deferredSearch.toLowerCase()) ||
        task.title.toLowerCase().includes(deferredSearch.toLowerCase());

      const matchesStatus =
        filterStatus === "all" || task.status === filterStatus;
      const matchesPriority =
        filterPriority === "all" || task.priority === filterPriority;
      const matchesProject =
        filterProject === "all" || task.title === filterProject;

      // View mode filters
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const tomorrow = new Date(today.getTime() + 86400000);
      const nextWeek = new Date(today.getTime() + 604800000);
      const dueDate = new Date(task.due_date ?? 0);

      let matchesViewMode = true;
      switch (viewMode) {
        case "today":
          matchesViewMode =
            dueDate >= today && dueDate < tomorrow && task.status !== "Done";
          break;
        case "overdue":
          matchesViewMode = dueDate < today && task.status !== "Done";
          break;
        case "upcoming":
          matchesViewMode =
            dueDate >= tomorrow && dueDate < nextWeek && task.status !== "Done";
          break;
      }

      return (
        matchesAssignee &&
        matchesCompany &&
        matchesSearch &&
        matchesStatus &&
        matchesPriority &&
        matchesProject &&
        matchesViewMode
      );
    });

    // Sort tasks
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "dueDate":
          return (
            new Date(a.due_date ?? 0).getTime() -
            new Date(b.due_date ?? 0).getTime()
          );
        case "priority":
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        case "project":
          return a.title.localeCompare(b.title);
        case "status":
          return a.status.localeCompare(b.status);
        default:
          return 0;
      }
    });

    return filtered;
  }, [
    tasks,
    searchQuery,
    filterStatus,
    filterPriority,
    filterProject,
    sortBy,
    viewMode,
    assigneeId,
  ]);

  const projects = useMemo(() => {
    return Array.from(new Set(tasks.map((t) => t.title)));
  }, [tasks]);

  const isOverdue = (dueDate: string, status: string) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return new Date(dueDate) < today && status !== "Done";
  };

  const isDueToday = (dueDate: string) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today.getTime() + 86400000);
    const taskDue = new Date(dueDate);
    return taskDue >= today && taskDue < tomorrow;
  };

  const handleTaskClick = (task: EnrichedTask) => {
    setSelectedTask(task);
    setIsDetailsPanelOpen(true);
  };

  const handleStatusChange = async (
    taskId: string,
    newStatus: Task["status"],
  ) => {
    const updatedAt = new Date().toISOString();
    await updateTask(taskId, { status: newStatus, updatedAt });
    if (selectedTask?.id === taskId) {
      setSelectedTask({ ...selectedTask, status: newStatus, updatedAt });
    }
  };

  // const handleSubtaskToggle = async (taskId: string, subtaskId: string) => {
  //   const task = tasks.find((t) => t.id === taskId);
  //   if (!task || !task.subtasks) return;

  //   const toggledSubtask = task.subtasks.find((st) => st.id === subtaskId);
  //   if (!toggledSubtask) return;

  //   const updatedSubtasks = task.subtasks.map((st) =>
  //     st.id === subtaskId ? { ...st, completed: !st.completed } : st,
  //   );
  //   const completedCount = updatedSubtasks.filter((st) => st.completed).length;
  //   const progress = Math.round(
  //     (completedCount / (updatedSubtasks.length || 1)) * 100,
  //   );

  //   await updateSubtask(subtaskId, { completed: !toggledSubtask.completed });
  //   await updateTask(taskId, { progress });

  //   if (selectedTask?.id === taskId) {
  //     setSelectedTask({ ...selectedTask, subtasks: updatedSubtasks, progress });
  //   }
  // };

  // const handleAddSubtask = async () => {
  //   if (!newSubtask.trim() || !selectedTask) return;

  //   const subtask: Omit<Subtask, "id"> = {
  //     companyId: 1, // TODO: Make dynamic
  //     title: newSubtask,
  //     completed: false,
  //     createdAt: new Date().toISOString(),
  //   };

  //   const created = await addSubtask(subtask);

  //   const newIds = [...(selectedTask.subtaskIds || []), created.id];
  //   await updateTask(selectedTask.id, { subtaskIds: newIds });

  //   const updatedSubtasks = [...(selectedTask.subtasks || []), created];
  //   const completedCount = updatedSubtasks.filter((st) => st.completed).length;
  //   const progress = Math.round(
  //     (completedCount / (updatedSubtasks.length || 1)) * 100,
  //   );
  //   await updateTask(selectedTask.id, { progress });

  //   setSelectedTask({
  //     ...selectedTask,
  //     subtaskIds: newIds,
  //     subtasks: updatedSubtasks,
  //     progress,
  //   });
  //   setNewSubtask("");
  // };

  // const handleEditSubtaskStart = (subtaskId: string, currentTitle: string) => {
  //   setEditingSubtaskId(subtaskId);
  //   setEditingSubtaskTitle(currentTitle);
  // };

  // const handleEditSubtaskSave = async (taskId: string) => {
  //   if (!selectedTask || editingSubtaskId == null) return;
  //   const trimmed = editingSubtaskTitle.trim();
  //   if (!trimmed) return;
  //   await updateSubtask(editingSubtaskId, { title: trimmed });
  //   const updatedSubtasks = (selectedTask.subtasks || []).map((st) =>
  //     st.id === editingSubtaskId ? { ...st, title: trimmed } : st,
  //   );
  //   const completedCount = updatedSubtasks.filter((st) => st.completed).length;
  //   const progress = Math.round(
  //     (completedCount / (updatedSubtasks.length || 1)) * 100,
  //   );
  //   await updateTask(taskId, { progress });
  //   setSelectedTask({ ...selectedTask, subtasks: updatedSubtasks, progress });
  //   setEditingSubtaskId(null);
  //   setEditingSubtaskTitle("");
  // };

  // const handleDeleteSubtask = async (taskId: string, subtaskId: string) => {
  //   if (!selectedTask) return;
  //   await deleteSubtask(subtaskId);
  //   const newIds = (selectedTask.subtaskIds || []).filter(
  //     (id) => id !== subtaskId,
  //   );
  //   const updatedSubtasks = (selectedTask.subtasks || []).filter(
  //     (st) => st.id !== subtaskId,
  //   );
  //   const completedCount = updatedSubtasks.filter((st) => st.completed).length;
  //   const progress = Math.round(
  //     (completedCount / (updatedSubtasks.length || 1)) * 100,
  //   );
  //   await updateTask(taskId, { subtaskIds: newIds, progress });
  //   setSelectedTask({
  //     ...selectedTask,
  //     subtaskIds: newIds,
  //     subtasks: updatedSubtasks,
  //     progress,
  //   });
  // };

  // const mappedCommentsForSelectedTask = useMemo(() => {
  //   if (!selectedTask)
  //     return [] as Array<{
  //       id: string;
  //       content: string;
  //       author: { id: string; name: string; avatar?: string; role?: string };
  //       createdAt: string;
  //       likes: number;
  //       isLiked: boolean;
  //     }>;
  //   const findAuthorName = (authorId: string) => {
  //     const tm = teamMembers.find((m) => m.id === authorId);
  //     return tm ? `${tm.firstname} ${tm.lastname}` : `User ${authorId}`;
  //   };
  //   return comments
  //     .filter(
  //       (c) =>
  //         c.projectId === selectedTask.projectId &&
  //         c.companyId === selectedTask.companyId,
  //     )
  //     .map((c) => ({
  //       id: String(c.id),
  //       content: c.content,
  //       author: {
  //         id: String(c.authorId),
  //         name: findAuthorName(c.authorId),
  //         avatar: "/placeholder.svg?height=32&width=32",
  //       },
  //       createdAt:
  //         new Date(c.timestamp).toString() === "Invalid Date"
  //           ? new Date().toISOString()
  //           : new Date(c.timestamp).toISOString(),
  //       likes: 0,
  //       isLiked: false,
  //     }));
  // }, [comments, selectedTask, teamMembers]);

  // const handleAddComment = async (content: string) => {
  //   if (!selectedTask || !currentMember) return;
  //   await addComment(
  //     content,
  //     selectedTask.companyId,
  //     currentMember.id,
  //     selectedTask.projectId,
  //   );
  // };

  // const handleUpdateComment = async (commentId: string, content: string) => {
  //   await updateComment(Number(commentId), { content });
  // };

  // const handleDeleteComment = async (commentId: string) => {
  //   await deleteComment(Number(commentId));
  // };

  const completionPercentage =
    stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            My Tasks
          </h1>
          <p className="text-muted-foreground">
            Your personalized workspace across all projects
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card
          className="hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => setViewMode("all")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
            <ListTodo className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="flex items-center gap-2 mt-2">
              <Progress value={completionPercentage} className="h-2" />
              <span className="text-xs text-muted-foreground">
                {completionPercentage}%
              </span>
            </div>
          </CardContent>
        </Card>

        <Card
          className="hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => setViewMode("today")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Due Today</CardTitle>
            <Calendar className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">
              {stats.dueToday}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Requires attention
            </p>
          </CardContent>
        </Card>

        <Card
          className="hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => setViewMode("overdue")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">
              {stats.overdue}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Needs immediate action
            </p>
          </CardContent>
        </Card>

        <Card
          className="hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => setViewMode("upcoming")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              {stats.inProgress}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Active work items
            </p>
          </CardContent>
        </Card>
      </div>

      {/* View Mode Tabs */}
      <Tabs
        value={viewMode}
        onValueChange={(v) => setViewMode(v as typeof viewMode)}
      >
        <TabsList className="grid w-full grid-cols-4 h-10">
          <TabsTrigger value="all">All Tasks</TabsTrigger>
          <TabsTrigger value="today">Today</TabsTrigger>
          <TabsTrigger value="overdue">Overdue</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tasks, projects, or descriptions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="To-Do">To Do</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="Done">Completed</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterPriority} onValueChange={setFilterPriority}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterProject} onValueChange={setFilterProject}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project} value={project}>
                      {project}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[140px]">
                  <SortAsc className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dueDate">Due Date</SelectItem>
                  <SelectItem value="priority">Priority</SelectItem>
                  <SelectItem value="project">Project</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setFilterStatus("all");
                  setFilterPriority("all");
                  setFilterProject("all");
                  setSortBy("dueDate");
                }}
              >
                Clear
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Task List */}
      <div className="space-y-3">
        {filteredTasks.length > 0 ? (
          filteredTasks.map((task) => {
            const statusKey = task.status as TaskStatus;
            const StatusIcon = statusConfig[statusKey].icon;

            const isTaskOverdue = isOverdue(
              task.due_date ? "no due date" : `${task.due_date}`,
              task.status,
            );
            const isTaskDueToday = isDueToday(
              task.due_date ? "no due date" : `${task.due_date}`,
            );

            return (
              <Card
                key={task.id}
                className="hover:shadow-md transition-all cursor-pointer group"
                onClick={() => handleTaskClick(task)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={task.status === "Done"}
                      onCheckedChange={(checked) => {
                        handleStatusChange(task.id, checked ? "Done" : "To-Do");
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-1"
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <h3
                            className={cn(
                              "font-medium text-base mb-1",
                              task.status === "Done" &&
                                "line-through text-muted-foreground",
                            )}
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
                            className={cn(
                              "text-xs",
                              priorityConfig[task.priority].color,
                            )}
                          >
                            {priorityConfig[task.priority].label}
                          </Badge>

                          {/* <DropdownMenu>
                            <DropdownMenuTrigger
                              asChild
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStatusChange(task.id, "To-Do");
                                }}
                              >
                                Mark as To Do
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStatusChange(task.id, "In Progress");
                                }}
                              >
                                Mark as In Progress
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStatusChange(task.id, "Done");
                                }}
                              >
                                Mark as Completed
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu> */}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <FolderOpen className="h-3.5 w-3.5" />
                          <span className="truncate max-w-[150px]">
                            {task.title}
                          </span>
                        </div>

                        <Separator orientation="vertical" className="h-4" />

                        <div className="flex items-center gap-1">
                          <StatusIcon
                            className={cn(
                              "h-3.5 w-3.5",
                              statusConfig[statusKey].color,
                            )}
                          />
                          <span>{statusConfig[statusKey].label}</span>
                        </div>

                        <Separator orientation="vertical" className="h-4" />

                        <div
                          className={cn(
                            "flex items-center gap-1",
                            isTaskOverdue && "text-red-500",
                            isTaskDueToday && "text-blue-500 font-medium",
                          )}
                        >
                          {isTaskOverdue ? (
                            <AlertCircle className="h-3.5 w-3.5" />
                          ) : (
                            <Calendar className="h-3.5 w-3.5" />
                          )}
                          <span>
                            {isTaskOverdue
                              ? "Overdue"
                              : isTaskDueToday
                                ? "Due Today"
                                : new Date(
                                    task.due_date
                                      ? "No task"
                                      : `${task.due_date}`,
                                  ).toLocaleDateString()}
                          </span>
                        </div>

                        {/* {task.subtasks && task.subtasks.length > 0 && (
                          <>
                            <Separator orientation="vertical" className="h-4" />
                            <div className="flex items-center gap-1">
                              <ListTodo className="h-3.5 w-3.5" />
                              <span>
                                {
                                  task.subtasks.filter((st) => st.completed)
                                    .length
                                }
                                /{task.subtasks.length} subtasks
                              </span>
                            </div>
                          </>
                        )} */}

                        {/* {(task.attachments || 0) > 0 && (
                          <>
                            <Separator orientation="vertical" className="h-4" />
                            <div className="flex items-center gap-1">
                              <Paperclip className="h-3.5 w-3.5" />
                              <span>{task.attachments}</span>
                            </div>
                          </>
                        )} */}

                        {/* {(task.comments || 0) > 0 && (
                          <>
                            <Separator orientation="vertical" className="h-4" />
                            <div className="flex items-center gap-1">
                              <MessageSquare className="h-3.5 w-3.5" />
                              <span>{task.comments}</span>
                            </div>
                          </>
                        )} */}
                      </div>

                      {/* {task.progress !== undefined &&
                        task.progress < 100 &&
                        task.subtasks &&
                        task.subtasks.length > 0 && (
                          <div className="flex items-center gap-2 mt-3">
                            <Progress
                              value={task.progress}
                              className="h-2 flex-1"
                            />
                            <span className="text-xs text-muted-foreground min-w-[40px]">
                              {task.progress}%
                            </span>
                          </div>
                        )} */}

                      {/* {task.tags && task.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {task.tags.map((tag, index) => (
                            <Badge
                              key={index}
                              variant="secondary"
                              className="text-xs"
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )} */}
                    </div>

                    <ChevronRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1" />
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No tasks found</h3>
              <p className="text-muted-foreground">
                {searchQuery ||
                filterStatus !== "all" ||
                filterPriority !== "all" ||
                filterProject !== "all"
                  ? "Try adjusting your search or filters"
                  : "No tasks assigned to you yet."}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Task Details Panel */}
      <Sheet open={isDetailsPanelOpen} onOpenChange={setIsDetailsPanelOpen}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          {selectedTask && (
            <>
              <SheetHeader>
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={selectedTask.status === "Done"}
                    onCheckedChange={(checked) => {
                      handleStatusChange(
                        selectedTask.id,
                        checked ? "Done" : "To-Do",
                      );
                    }}
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <SheetTitle
                      className={cn(
                        "text-xl",
                        selectedTask.status === "Done" &&
                          "line-through text-muted-foreground",
                      )}
                    >
                      {selectedTask.title}
                    </SheetTitle>
                    <SheetDescription className="mt-2">
                      {selectedTask.description}
                    </SheetDescription>
                  </div>
                </div>
              </SheetHeader>

              <div className="space-y-6 mt-6">
                {/* Quick Actions */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex gap-2">
                      <Button
                        variant={
                          selectedTask.status === "To-Do"
                            ? "default"
                            : "outline"
                        }
                        size="sm"
                        onClick={() =>
                          handleStatusChange(selectedTask.id, "To-Do")
                        }
                        className="flex-1"
                      >
                        To Do
                      </Button>
                      <Button
                        variant={
                          selectedTask.status === "In Progress"
                            ? "default"
                            : "outline"
                        }
                        size="sm"
                        onClick={() =>
                          handleStatusChange(selectedTask.id, "In Progress")
                        }
                        className="flex-1"
                      >
                        In Progress
                      </Button>
                      <Button
                        variant={
                          selectedTask.status === "Done" ? "default" : "outline"
                        }
                        size="sm"
                        onClick={() =>
                          handleStatusChange(selectedTask.id, "Done")
                        }
                        className="flex-1"
                      >
                        Completed
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Task Details */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">
                          Project
                        </p>
                        <div className="flex items-center gap-2">
                          <FolderOpen className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">
                            {selectedTask.title}
                          </span>
                        </div>
                      </div>
                      {/* <div>
                        <p className="text-sm text-muted-foreground mb-1">
                          Client
                        </p>
                        <span className="text-sm font-medium">
                          {selectedTask.clientName}
                        </span>
                      </div> */}
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">
                          Priority
                        </p>
                        <Badge
                          variant="outline"
                          className={
                            priorityConfig[selectedTask.priority].color
                          }
                        >
                          {priorityConfig[selectedTask.priority].label}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">
                          Status
                        </p>
                        <Badge
                          variant="outline"
                          className={statusConfig[selectedTask.status].color}
                        >
                          {statusConfig[selectedTask.status].label}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">
                          Due Date
                        </p>
                        <div
                          className={cn(
                            "flex items-center gap-1",
                            isOverdue(
                              selectedTask.due_date
                                ? "No task"
                                : `${selectedTask.due_date}`,
                              selectedTask.status,
                            ) && "text-red-500",
                          )}
                        >
                          <Calendar className="h-4 w-4" />
                          <span className="text-sm font-medium">
                            {new Date(
                              selectedTask.due_date
                                ? "No task"
                                : `${selectedTask.due_date}`,
                            ).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">
                          Last Updated
                        </p>
                        <span className="text-sm">
                          {selectedTask.updatedAt
                            ? new Date(
                                selectedTask.updatedAt,
                              ).toLocaleDateString()
                            : "N/A"}
                        </span>
                      </div>
                    </div>

                    {/* {selectedTask.tags && selectedTask.tags.length > 0 && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">
                          Tags
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {selectedTask.tags.map((tag, index) => (
                            <Badge key={index} variant="secondary">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )} */}
                  </CardContent>
                </Card>

                {/* Subtasks */}
                {/* <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <ListTodo className="h-4 w-4" />
                        My Subtasks
                        {selectedTask.subtasks &&
                          selectedTask.subtasks.length > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {
                                selectedTask.subtasks.filter(
                                  (st) => st.completed,
                                ).length
                              }
                              /{selectedTask.subtasks.length}
                            </Badge>
                          )}
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {selectedTask.progress !== undefined &&
                      selectedTask.subtasks &&
                      selectedTask.subtasks.length > 0 && (
                        <div className="flex items-center gap-2">
                          <Progress
                            value={selectedTask.progress}
                            className="h-2 flex-1"
                          />
                          <span className="text-sm text-muted-foreground">
                            {selectedTask.progress}%
                          </span>
                        </div>
                      )}

                    <div className="space-y-2">
                      {selectedTask.subtasks &&
                      selectedTask.subtasks.length > 0 ? (
                        selectedTask.subtasks.map((subtask) => (
                          <div
                            key={subtask.id}
                            className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50"
                          >
                            <Checkbox
                              checked={subtask.completed}
                              onCheckedChange={() =>
                                handleSubtaskToggle(selectedTask.id, subtask.id)
                              }
                            />
                            {editingSubtaskId === subtask.id ? (
                              <>
                                <Input
                                  value={editingSubtaskTitle}
                                  onChange={(e) =>
                                    setEditingSubtaskTitle(e.target.value)
                                  }
                                  className="h-8 flex-1"
                                />
                                <Button
                                  size="sm"
                                  onClick={() =>
                                    handleEditSubtaskSave(selectedTask.id)
                                  }
                                >
                                  Save
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setEditingSubtaskId(null);
                                    setEditingSubtaskTitle("");
                                  }}
                                >
                                  Cancel
                                </Button>
                              </>
                            ) : (
                              <>
                                <span
                                  className={cn(
                                    "text-sm flex-1",
                                    subtask.completed &&
                                      "line-through text-muted-foreground",
                                  )}
                                >
                                  {subtask.title}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    handleEditSubtaskStart(
                                      subtask.id,
                                      subtask.title,
                                    )
                                  }
                                  className="h-8 w-8 p-0"
                                  aria-label="Edit subtask"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    handleDeleteSubtask(
                                      selectedTask.id,
                                      subtask.id,
                                    )
                                  }
                                  className="h-8 w-8 p-0 text-red-600"
                                  aria-label="Delete subtask"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No subtasks yet. Add your first one below!
                        </p>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Input
                        placeholder="Add a new subtask..."
                        value={newSubtask}
                        onChange={(e) => setNewSubtask(e.target.value)}
                        onClick={(e) => {
                          if (e.key === "Enter") {
                            handleAddSubtask();
                          }
                        }}
                      />
                      <Button
                        size="sm"
                        onClick={handleAddSubtask}
                        disabled={!newSubtask.trim()}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      💡 Subtasks help you break down complex tasks into
                      manageable steps
                    </p>
                  </CardContent>
                </Card> */}

                {/* Comments */}
                {/* <div>
                  <CommentsSystem
                    comments={mappedCommentsForSelectedTask}
                    onCommentAdd={(content) => handleAddComment(content)}
                    onCommentUpdate={(commentId, content) =>
                      handleUpdateComment(commentId, content)
                    }
                    onCommentDelete={(commentId) =>
                      handleDeleteComment(commentId)
                    }
                    onCommentLike={() => {}}
                    currentUser={{
                      id: assigneeId.toString(),
                      name: currentMember
                        ? `${currentMember.firstname} ${currentMember.lastname}`
                        : "Current User",
                      avatar:
                        currentMember?.avatar ??
                        "/placeholder.svg?height=32&width=32",
                      role: currentMember?.role ?? "Designer",
                    }}
                    placeholder="Add a note or update..."
                  />
                </div> */}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

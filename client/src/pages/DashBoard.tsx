import { useState } from "react";
import { useProjectContext } from "@/context/ProjectContext";
import { useFilteredProjects } from "../hooks/useFilteredProjects";
import { useProjectStats } from "../hooks/useProjectStats";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  Calendar,
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
  Plus,
  ChevronDown,
  SlidersHorizontal,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useTaskContext } from "@/context/TaskContext";
import { useClientContext } from "@/context/ClientContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import ProjectForm from "@/components/ProjectForm";
import type { CreateProjectDTO } from "@/Types/types";
import { DashboardSkeleton } from "@/components/DashBoardSkeleton";
import { useAuthContext } from "@/context/AuthContext";

export default function Dashboard() {
  const { authStatus } = useAuthContext();
  const { addProject, projects, loading, error } = useProjectContext();
  const { tasks } = useTaskContext();
  const { clients } = useClientContext();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [clientFilter, setClientFilter] = useState<string>("all");
  const filteredProjects = useFilteredProjects(
    projects,
    statusFilter,
    clientFilter,
  );
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [showCompactOverview, setShowCompactOverview] = useState(false);
  const isTeamMember =
    authStatus?.access === "team_member" || authStatus?.access === "member";
  const { totalProjects, activeProjects, completedProjects, overdueProjects } =
    useProjectStats(projects, tasks);

  const formatProjectDeadline = (deadline?: string | null) => {
    if (!deadline) {
      return "No deadline";
    }

    const parsed = new Date(deadline);
    if (Number.isNaN(parsed.getTime())) {
      return "No deadline";
    }

    return parsed.toLocaleDateString();
  };

  if (loading)
    return (
      <div className="min-h-[60vh]">
        <DashboardSkeleton />
      </div>
    );
  if (error) return <div>Error: {error}</div>;

  const hasProjects = projects.length > 0;
  const hasFilteredProjects = filteredProjects.length > 0;

  return (
    <div className="space-y-4 sm:space-y-5 lg:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl lg:text-3xl">
            Dashboard
          </h1>
          <p className="text-sm text-muted-foreground sm:text-base">
            Overview of your workspace activity, current delivery load, and project momentum.
          </p>
        </div>
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

      {hasProjects ? (
        <>
          {/* Stats Cards */}
          <div
            className={`grid grid-cols-1 gap-3 sm:grid sm:grid-cols-2 xl:grid-cols-4 ${
              showCompactOverview ? "grid" : "hidden sm:grid"
            }`}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Projects
                </CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalProjects}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Active Projects
                </CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{activeProjects}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Overdue Projects
                </CardTitle>
                <AlertCircle className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-500">
                  {overdueProjects}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Completed Projects
                </CardTitle>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-500">
                  {completedProjects}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card
            className={`app-surface ${showCompactOverview ? "block" : "hidden sm:block"}`}
          >
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:flex-wrap sm:items-center">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="in progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
              <Select value={clientFilter} onValueChange={setClientFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Filter by client" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clients</SelectItem>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.name}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => {
                  setStatusFilter("all");
                  setClientFilter("all");
                }}
              >
                Reset Filters
              </Button>
            </CardContent>
          </Card>

          {hasFilteredProjects ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredProjects.map((project) => {
                return (
                  <Link
                    key={project.id}
                    to={`/projectdetails/${project.id}`}
                    className="block h-full"
                  >
                    <Card className="flex h-full min-h-[265px] flex-col transition-colors hover:border-foreground/20">
                      <CardHeader className="pb-4">
                        <div className="flex items-start justify-between">
                          <div className="min-w-0 flex-1 pr-3 space-y-1">
                            <CardTitle
                              className="truncate text-lg"
                              title={project.title}
                            >
                              {project.title}
                            </CardTitle>
                            <p
                              className="truncate text-sm text-muted-foreground"
                              title={project.client?.name}
                            >
                              {project.client?.name}
                            </p>
                          </div>
                          <Badge
                            className="inline-flex h-6 min-w-[100px] shrink-0 items-center justify-center whitespace-nowrap px-2 text-center"
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
                      </CardHeader>
                      <CardContent className="flex flex-1 flex-col gap-4">
                        <div className="min-h-[3.25rem] space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Progress</span>
                            <span>{project.progress}%</span>
                          </div>
                          <Progress value={project.progress} className="h-2" />
                        </div>

                        <div className="grid min-h-[3.5rem] grid-cols-2 gap-3 text-sm text-muted-foreground">
                          <div className="flex min-w-0 items-center gap-1.5">
                            <Calendar className="h-4 w-4" />
                            <span
                              className="truncate"
                              title={formatProjectDeadline(project.deadline)}
                            >
                              {formatProjectDeadline(project.deadline)}
                            </span>
                          </div>
                          <div className="flex min-w-0 items-center gap-1.5 justify-self-end">
                            <CheckCircle className="h-4 w-4" />
                            <span className="truncate">
                              {project.task_count > 0
                                ? `${project.task_count} ${project.task_count === 1 ? "task" : "tasks"}`
                                : "No tasks"}
                            </span>
                          </div>
                        </div>

                        <div className="mt-auto flex min-h-[2.5rem] items-center justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-1.5">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span
                              className="truncate text-sm text-muted-foreground"
                              title={`${project.team_members?.length ?? 0} ${(project.team_members?.length ?? 0) <= 1 ? "member" : "members"}`}
                            >
                              {project.team_members?.length ?? 0}{" "}
                              {project.team_members?.length <= 1
                                ? "member"
                                : "members"}
                            </span>
                          </div>

                          <Button variant="outline" size="sm" onClick={() => {}}>
                            View Details
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          ) : (
            <Card className="app-surface">
              <CardContent className="flex min-h-[18rem] flex-col items-center justify-center gap-4 px-6 py-10 text-center">
                <div className="space-y-2">
                  <h2 className="text-xl font-semibold">No projects match these filters</h2>
                  <p className="max-w-md text-sm text-muted-foreground sm:text-base">
                    Try a different status or client filter, or reset the view to
                    see everything that is currently in motion.
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    setStatusFilter("all");
                    setClientFilter("all");
                  }}
                >
                  Reset Filters
                </Button>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <div className="flex min-h-[52vh] items-center justify-center px-4 py-8 sm:px-0 sm:py-12">
          <div className="mx-auto max-w-md space-y-4 text-center">
            <h2 className="text-xl font-semibold">No projects yet</h2>
            <p className="text-muted-foreground">
              Get started by creating your first project.
            </p>

            {!isTeamMember && (
              <>
                <Button onClick={() => setIsCreateOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Project
                </Button>
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Start a project</DialogTitle>
                    <DialogDescription>
                      Give it a name now. You can shape the details as the work comes together.
                    </DialogDescription>
                  </DialogHeader>

                  <ProjectForm
                    onSave={async (data) => {
                      const newProject: CreateProjectDTO = {
                        title: data.title || "",
                        client_id: data.client_id || undefined,
                        client: data.client,
                        status: data.status || "Planning",
                        deadline: data.deadline || undefined,
                        description: data.description || undefined,
                        team_member_ids: Array.isArray(data.team_member_ids)
                          ? (data.team_member_ids as string[])
                          : [],
                      };

                      setIsCreateOpen(false);
                      await addProject(newProject);
                    }}
                    onCancel={() => setIsCreateOpen(false)}
                  />
                </DialogContent>
                </Dialog>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

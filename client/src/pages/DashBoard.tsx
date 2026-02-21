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
  Loader,
  Plus,
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
  DialogTrigger,
} from "@/components/ui/dialog";
import ProjectForm from "@/components/ProjectForm";
import type { CreateProjectDTO } from "@/Types/types";
import { DashboardSkeleton } from "@/components/DashBoardSkeleton";

export default function Dashboard() {
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
  const { totalProjects, activeProjects, completedProjects, overdueProjects } =
    useProjectStats(projects, tasks);
  // console.log("tasks:", tasks, "projects:", projects);

  if (loading)
    return (
      <div className="min-h-[60vh]">
        <DashboardSkeleton />
      </div>
    );
  if (error) return <div>Error: {error}</div>;

  if (projects.length === 0) {
    return (
      <div className="min-h-full border-2 border-dashed grid grid-rows-4 grid-cols-[1fr_2fr_1fr] rounded-lg overflow-hidden  items-center justify-center bg-background">
        <div className="col-start-2 row-start-2 flex justify-center">
          <Card className="p-10 text-center">
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">No projects yet</h2>
              <p className="text-muted-foreground">
                Get started by creating your first project.
              </p>

              <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Project
                  </Button>
                </DialogTrigger>

                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Create New Project</DialogTitle>
                    <DialogDescription>
                      Input project details.
                    </DialogDescription>
                  </DialogHeader>

                  <ProjectForm
                    onSave={async (data) => {
                      const newProject: CreateProjectDTO = {
                        title: data.title || "",
                        client_id: data.client_id || undefined,
                        status: data.status || "Planning",
                        deadline: data.deadline || undefined,
                        description: data.description || undefined,
                        team_member_ids: Array.isArray(data.team_member_ids)
                          ? (data.team_member_ids as string[])
                          : [],
                      };

                      await addProject(newProject);
                      setIsCreateOpen(false);
                    }}
                    onCancel={() => setIsCreateOpen(false)}
                  />
                </DialogContent>
              </Dialog>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of your projects and tasks
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
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
          onClick={() => {
            setStatusFilter("all");
            setClientFilter("all");
          }}
        >
          Reset Filters
        </Button>
      </div>

      {/* Project Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProjects.map((project) => {
          // console.log("DASHBOARD tasks length:", tasks.length);

          return (
            <Link to={`/projectdetails/${project.id}`}>
              <Card
                key={project.id}
                className="hover:shadow-lg transition-shadow"
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{project.title}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {project.client?.name}
                      </p>
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
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress</span>
                      <span>{project.progress}%</span>
                    </div>
                    <Progress value={project.progress} className="h-2" />
                  </div>

                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {project.deadline
                          ? new Date(project.deadline).toLocaleDateString()
                          : "No deadline"}
                      </span>
                    </div>
                    {project.task_count > 0 ? (
                      <div className="flex items-center gap-1">
                        <CheckCircle className="h-4 w-4" />
                        <span>
                          {/* {completed}/{total} {total === 1 ? "task" : "tasks"} */}
                          {project.task_count}{" "}
                          {project.task_count === 1 ? "task" : "tasks"}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <CheckCircle className="h-4 w-4" />
                        <span>No tasks</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
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
    </div>
  );
}

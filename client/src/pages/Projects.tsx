import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
// import { Toaster } from "@/components/ui/sonner";
import ProjectForm from "@/components/ProjectForm";
import { Plus, Search, Edit, Trash2, Eye } from "lucide-react";
import { useProjectContext } from "@/context/ProjectContext";
import { Link } from "react-router-dom";
import type { CreateProjectDTO } from "../Types/types";
import { TableSkeleton } from "@/components/TableSkeleton";

export default function Projects() {
  const {
    projects,
    loading,
    error,
    addProject,
    updateProject,
    setCurrentProject,
    confirmDelete,
    projectToDelete,
    setProjectToDelete,
    isDeleteDialogOpen,
    setIsDeleteDialogOpen,
  } = useProjectContext();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);

  const clients = useMemo(
    () => Array.from(new Set(projects.map((p) => p.client?.name ?? "Unknown"))),
    [projects],
  );

  const filteredProjects = useMemo(() => {
    return projects
      .filter((project) => {
        const matchesSearch =
          project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (project.client?.id ?? "")
            .toLowerCase()
            .includes(searchTerm.toLowerCase());
        const matchesStatus =
          statusFilter === "all" || project.status === statusFilter;
        const matchesClient =
          clientFilter === "all" || project.client?.name === clientFilter;
        const projectDate = project.deadline
          ? new Date(project.deadline)
          : new Date(0);
        const matchesFrom = dateFrom ? projectDate >= new Date(dateFrom) : true;
        const matchesTo = dateTo ? projectDate <= new Date(dateTo) : true;
        return (
          matchesSearch &&
          matchesStatus &&
          matchesClient &&
          matchesFrom &&
          matchesTo
        );
      })
      .sort(
        (a, b) =>
          (a.deadline ? new Date(a.deadline).getTime() : 0) -
          (b.deadline ? new Date(b.deadline).getTime() : 0),
      );
  }, [projects, searchTerm, statusFilter, clientFilter, dateFrom, dateTo]);

  // if (loading)
  //   return (
  //     <div>
  //       <TableSkeleton rows={5} />
  //     </div>
  //   );
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground">Manage your client projects</p>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          {projects.length === 0 ? null : (
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Project
              </Button>
            </DialogTrigger>
          )}
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
              <DialogDescription>Input project details.</DialogDescription>
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

      {/* Search and Filters */}
      {projects.length > 0 && (
        <div className="flex flex-col lg:flex-row gap-4 lg:items-center">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full"
            />
          </div>

          <div className="flex flex-wrap gap-3 lg:gap-4 items-center">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="In Progress">In Progress</SelectItem>
                <SelectItem value="On Hold">On Hold</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
                <SelectItem value="Planning">Planning</SelectItem>
              </SelectContent>
            </Select>

            <Select value={clientFilter} onValueChange={setClientFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Client" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Clients</SelectItem>
                {clients.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchTerm("");
                setStatusFilter("all");
                setClientFilter("all");
                setDateFrom("");
                setDateTo("");
              }}
            >
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* Projects Table */}
      {loading ? (
        <div>
          <TableSkeleton rows={5} />
        </div>
      ) : projects.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground">
          No projects yet. Create your first project to get started.
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Project
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Create New Project</DialogTitle>
                <DialogDescription>Input project details.</DialogDescription>
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
      ) : filteredProjects.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground">
          No projects match your filters. Try adjusting your filters.
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>All Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Deadline</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProjects.map((project) => (
                  <TableRow key={project.id} className="hover:bg-muted/50">
                    <TableCell>
                      <div>
                        <div className="font-medium">{project.title}</div>
                        <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                          {project.description}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{project.client?.name}</TableCell>
                    <TableCell>
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
                    </TableCell>
                    <TableCell>
                      {project.deadline
                        ? new Date(project.deadline).toLocaleDateString()
                        : "N/A"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Link to={`/projectdetails/${project.id}`}>
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label={`View details for ${project.title}`}
                            onClick={() => setCurrentProject(project)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={`Edit ${project.title}`}
                          onClick={() => setEditingProjectId(project.id)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-700"
                          aria-label={`Delete ${project.title}`}
                          onClick={() => {
                            setProjectToDelete(project);
                            setIsDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Single Edit Dialog */}
      <Dialog
        open={!!editingProjectId}
        onOpenChange={() => setEditingProjectId(null)}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
            <DialogDescription>
              Update the task details and save your changes.
            </DialogDescription>
          </DialogHeader>
          <ProjectForm
            project={projects.find((p) => p.id === editingProjectId)}
            onSave={async (data) => {
              if (editingProjectId) {
                await updateProject(editingProjectId, data as any);
                setEditingProjectId(null);
              }
            }}
            onCancel={() => setEditingProjectId(null)}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <strong>{projectToDelete?.title}</strong>? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end gap-2 pt-4">
            <AlertDialogCancel onClick={() => setProjectToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Sonner toaster */}
      {/* <Toaster position="top-right" /> */}
    </div>
  );
}

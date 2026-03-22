import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  Building2,
  ChevronDown,
  Loader2,
  SlidersHorizontal,
  Trash2,
  Upload,
  Users,
} from "lucide-react";
import { useAuthContext } from "@/context/AuthContext";
import { useWorkspaceContext } from "@/context/WorkspaceContext";
import { CompanyAPI } from "@/api/company.api";
import type { WorkspaceManagerSnapshot } from "@/Types/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const capacityBadgeClasses: Record<
  WorkspaceManagerSnapshot["workload"][number]["capacityStatus"],
  string
> = {
  free: "bg-emerald-100 text-emerald-700 border-emerald-200",
  balanced: "bg-sky-100 text-sky-700 border-sky-200",
  overloaded: "bg-amber-100 text-amber-700 border-amber-200",
  behind: "bg-rose-100 text-rose-700 border-rose-200",
};

type WorkspaceManagerSection = "details" | "workload" | "delete";

const sectionTitles: Record<
  WorkspaceManagerSection,
  { title: string; description: string }
> = {
  details: {
    title: "Workspace Details",
    description:
      "Review ownership, logo, and workspace identity for the active workspace.",
  },
  workload: {
    title: "Team Workload",
    description:
      "Use lightweight capacity cues to spot who is free, balanced, overloaded, or behind.",
  },
  delete: {
    title: "Delete Workspace",
    description:
      "This is permanent. Confirm the workspace name exactly before deleting it.",
  },
};

function WorkspaceManagerSkeleton({
  section,
}: {
  section: WorkspaceManagerSection;
}) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-9 w-60" />
        <Skeleton className="h-4 w-full max-w-xl" />
      </div>

      {section === "details" && (
        <Card className="app-surface">
          <CardContent className="space-y-6 pt-6">
            <div className="flex items-center gap-4 rounded-xl border bg-muted/20 p-4">
              <Skeleton className="h-16 w-16 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-28" />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-28 w-full" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {section === "workload" && (
        <>
          <Card className="app-surface">
            <CardContent className="grid gap-3 pt-6 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="rounded-xl border bg-muted/20 p-4">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="mt-3 h-8 w-14" />
                </div>
              ))}
            </CardContent>
          </Card>
          <Card className="app-surface">
            <CardContent className="space-y-3 pt-6">
              {Array.from({ length: 4 }).map((_, rowIndex) => (
                <div
                  key={rowIndex}
                  className="grid gap-3 rounded-xl border bg-muted/10 p-4 md:grid-cols-7"
                >
                  {Array.from({ length: 7 }).map((_, columnIndex) => (
                    <Skeleton key={columnIndex} className="h-5 w-full" />
                  ))}
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}

      {section === "delete" && (
        <Card className="app-surface border-red-200">
          <CardContent className="space-y-4 pt-6">
            <Skeleton className="h-5 w-56" />
            <Skeleton className="h-4 w-full max-w-2xl" />
            <Skeleton className="h-4 w-full max-w-lg" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-10 w-full max-w-md" />
            </div>
            <Skeleton className="h-10 w-40" />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function WorkspaceManager() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { idToken, authStatus, refreshStatus } = useAuthContext();
  const {
    currentWorkspace,
    getManagerSnapshot,
    peekManagerSnapshot,
    invalidateManagerSnapshot,
    applyWorkspaceUpdate,
    refreshWorkspaces,
  } = useWorkspaceContext();
  const isSuperAdmin = authStatus?.access === "superAdmin";
  const requestedSection = searchParams.get("section");
  const activeSection: WorkspaceManagerSection =
    requestedSection === "workload" || requestedSection === "delete"
      ? requestedSection
      : "details";
  const initialSnapshot = peekManagerSnapshot(authStatus?.companyId);
  const [data, setData] = useState<WorkspaceManagerSnapshot | null>(
    initialSnapshot,
  );
  const [loading, setLoading] = useState(!initialSnapshot);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [isLogoPreviewOpen, setIsLogoPreviewOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [showCompactOverview, setShowCompactOverview] = useState(false);

  const loadWorkspaceManager = async (options?: { force?: boolean }) => {
    const snapshot = await getManagerSnapshot({
      force: options?.force,
    });

    if (snapshot) {
      setData(snapshot);
      setName(snapshot.workspace.name);
      setDescription(snapshot.workspace.description ?? "");
      return snapshot;
    }

    setData(null);
    return null;
  };

  useEffect(() => {
    let cancelled = false;

    setLoading(!peekManagerSnapshot(authStatus?.companyId));
    loadWorkspaceManager()
      .catch((error: any) => {
        if (!cancelled) {
          toast.error(error.message || "Failed to load workspace manager");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [authStatus?.companyId, getManagerSnapshot, peekManagerSnapshot]);

  useEffect(() => {
    setDeleteConfirmation("");
  }, [authStatus?.companyId]);

  useEffect(() => {
    if (!logoFile) {
      setLogoPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(logoFile);
    setLogoPreviewUrl(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [logoFile]);

  const dirty =
    data &&
    (name.trim() !== data.workspace.name ||
      description.trim() !== (data.workspace.description ?? "") ||
      Boolean(logoFile));

  const ownerInitials = useMemo(() => {
    const ownerName = data?.owner?.name ?? "W";
    return ownerName
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }, [data?.owner?.name]);

  const handleSave = async () => {
    if (!idToken || !data || !isSuperAdmin) {
      return;
    }

    setSaving(true);
    try {
      const company = await CompanyAPI.updateCurrent(
        {
          name: name.trim(),
          description: description.trim(),
          logo: logoFile,
        },
        idToken,
      );

      applyWorkspaceUpdate(company);
      invalidateManagerSnapshot(company.id);
      const refreshedSnapshot = await loadWorkspaceManager({ force: true });

      if (refreshedSnapshot) {
        setName(refreshedSnapshot.workspace.name);
        setDescription(refreshedSnapshot.workspace.description ?? "");
      }

      setLogoFile(null);
      toast.success("Workspace updated");
    } catch (error: any) {
      toast.error(error.message || "Failed to update workspace");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteWorkspace = async () => {
    if (!idToken || !data || !isSuperAdmin) {
      return;
    }

    if (deleteConfirmation.trim() !== data.workspace.name) {
      toast.error("Enter the workspace name exactly to confirm deletion.");
      return;
    }

    setDeleting(true);
    try {
      await CompanyAPI.deleteCurrent(idToken);
      invalidateManagerSnapshot(data.workspace.id);
      await refreshStatus();
      await refreshWorkspaces({ force: true });
      toast.success("Workspace deleted");
      navigate("/dashboard", { replace: true });
    } catch (error: any) {
      toast.error(error.message || "Failed to delete workspace");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return <WorkspaceManagerSkeleton section={activeSection} />;
  }

  if (!data) {
    return (
      <Empty className="border-dashed py-16">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Building2 className="size-5" />
          </EmptyMedia>
          <EmptyTitle>Workspace unavailable</EmptyTitle>
          <EmptyDescription>
            We couldn&apos;t load the current workspace details.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  const sectionMeta = sectionTitles[activeSection] ?? sectionTitles.details;
  const logoPreviewSrc =
    logoPreviewUrl || currentWorkspace?.logoUrl || data.workspace.logoUrl || null;

  return (
    <div className="space-y-3 sm:space-y-5 lg:space-y-6">
      <div className="space-y-1">
        <h1 className="text-lg font-bold tracking-tight sm:text-2xl lg:text-3xl">
          {sectionMeta.title}
        </h1>
        <p className="text-xs text-muted-foreground sm:text-base">
          {sectionMeta.description}
        </p>
      </div>

      {activeSection === "details" && (
        <Card className="app-surface">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Workspace Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 sm:space-y-6">
            <div className="flex items-center gap-4 rounded-xl border bg-muted/20 p-4">
              <Dialog
                open={isLogoPreviewOpen}
                onOpenChange={setIsLogoPreviewOpen}
              >
                <DialogTrigger asChild>
                  <button
                    type="button"
                    disabled={!logoPreviewSrc}
                    className="rounded-full transition-transform hover:scale-[1.02] disabled:cursor-default disabled:hover:scale-100"
                    aria-label={
                      logoPreviewSrc
                        ? "Preview workspace logo"
                        : "No workspace logo to preview"
                    }
                  >
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={logoPreviewSrc || undefined} />
                      <AvatarFallback>
                        {data.workspace.name[0]?.toUpperCase() ?? "W"}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DialogTrigger>
                <DialogContent className="overflow-hidden p-0 sm:max-w-xl">
                  <DialogHeader className="px-4 pt-4 sm:px-6 sm:pt-6">
                    <DialogTitle>Workspace Logo Preview</DialogTitle>
                    <DialogDescription>
                      Preview the current workspace logo before saving changes.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="px-4 pb-4 pt-2 sm:px-6 sm:pb-6">
                    {logoPreviewSrc ? (
                      <div className="overflow-hidden rounded-xl border bg-muted/20">
                        <img
                          src={logoPreviewSrc}
                          alt="Workspace logo preview"
                          className="max-h-[70vh] w-full object-contain"
                        />
                      </div>
                    ) : (
                      <div className="flex min-h-[240px] items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
                        No workspace logo available to preview.
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
              <div className="space-y-1">
                <p className="text-lg font-semibold">
                  {currentWorkspace?.name ?? data.workspace.name}
                </p>
                <p className="text-sm text-muted-foreground">
                  {data.workspace.memberCount} active member
                  {data.workspace.memberCount === 1 ? "" : "s"}
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Workspace Name</Label>
                <Input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  disabled={!isSuperAdmin || saving}
                />
              </div>
              <div className="space-y-2">
                <Label>Workspace Owner</Label>
                <div className="flex items-center gap-3 rounded-lg border bg-muted/20 px-3 py-2">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={data.owner?.avatar || undefined} />
                    <AvatarFallback>{ownerInitials}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">
                      {data.owner?.name ?? "Unknown owner"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {data.owner?.email ?? "No owner email"}
                    </p>
                  </div>
                </div>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Description</Label>
                <Textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  disabled={!isSuperAdmin || saving}
                  placeholder="Describe this workspace"
                  rows={4}
                />
                {!isSuperAdmin && (
                  <p className="text-xs text-muted-foreground">
                    Only super admins can edit the workspace name, logo, and
                    other workspace details.
                  </p>
                )}
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Workspace Logo</Label>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Input
                    id="workspace-logo"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="sr-only"
                    disabled={!isSuperAdmin || saving}
                    onChange={(event) =>
                      setLogoFile(event.target.files?.[0] ?? null)
                    }
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-fit"
                    disabled={!isSuperAdmin || saving}
                    onClick={() =>
                      document.getElementById("workspace-logo")?.click()
                    }
                  >
                    <Upload className="h-4 w-4" />
                    Upload Logo
                  </Button>
                  {isSuperAdmin && (
                    <Button
                      type="button"
                      onClick={handleSave}
                      disabled={!dirty || saving}
                    >
                      {saving ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="mr-2 h-4 w-4" />
                      )}
                      Save Changes
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {activeSection === "workload" && (
        <div className="space-y-3 sm:space-y-5 lg:space-y-6">
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

          <Card className="app-surface">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Capacity Cues
              </CardTitle>
            </CardHeader>
            <CardContent
              className={`space-y-4 ${
                showCompactOverview ? "block" : "hidden sm:block"
              }`}
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border bg-muted/20 p-4">
                  <p className="text-sm text-muted-foreground">Total Members</p>
                  <p className="text-2xl font-semibold">
                    {data.workspace.memberCount}
                  </p>
                </div>
                <div className="rounded-xl border bg-muted/20 p-4">
                  <p className="text-sm text-muted-foreground">Free</p>
                  <p className="text-2xl font-semibold">
                    {
                      data.workload.filter(
                        (member) => member.capacityStatus === "free",
                      ).length
                    }
                  </p>
                </div>
                <div className="rounded-xl border bg-muted/20 p-4">
                  <p className="text-sm text-muted-foreground">Balanced</p>
                  <p className="text-2xl font-semibold">
                    {
                      data.workload.filter(
                        (member) => member.capacityStatus === "balanced",
                      ).length
                    }
                  </p>
                </div>
                <div className="rounded-xl border bg-muted/20 p-4">
                  <p className="text-sm text-muted-foreground">Attention Needed</p>
                  <p className="text-2xl font-semibold">
                    {
                      data.workload.filter(
                        (member) =>
                          member.capacityStatus === "behind" ||
                          member.capacityStatus === "overloaded",
                      ).length
                    }
                  </p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Use these cues to spot who is free for new work, who is balanced,
                and who may already be overloaded or behind.
              </p>
            </CardContent>
          </Card>

          <Card className="app-surface">
            <CardHeader>
              <CardTitle>Team Workload</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-xl border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Member</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Assigned</TableHead>
                      <TableHead>Completed</TableHead>
                      <TableHead>Overdue</TableHead>
                      <TableHead>In Progress</TableHead>
                      <TableHead>Status Cue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.workload.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarImage src={member.avatar || undefined} />
                              <AvatarFallback>
                                {member.name
                                  .split(" ")
                                  .map((part) => part[0])
                                  .join("")
                                  .slice(0, 2)
                                  .toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{member.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {member.email}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{member.role}</Badge>
                        </TableCell>
                        <TableCell>{member.assignedTaskCount}</TableCell>
                        <TableCell>{member.completedTaskCount}</TableCell>
                        <TableCell>{member.overdueTaskCount}</TableCell>
                        <TableCell>{member.inProgressTaskCount}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={capacityBadgeClasses[member.capacityStatus]}
                          >
                            {member.capacityStatus}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeSection === "delete" && (
        <Card className="app-surface border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <Trash2 className="h-5 w-5" />
              Delete Workspace
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 sm:space-y-6">
            {!isSuperAdmin ? (
              <div className="rounded-xl border border-dashed bg-muted/20 px-4 py-4 text-sm text-muted-foreground">
                Only super admins can permanently delete a workspace.
              </div>
            ) : (
              <>
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
                  Deleting a workspace permanently removes its members, project
                  data, and related collaboration history. Make sure you really
                  want to remove <strong>{data.workspace.name}</strong> before
                  continuing.
                </div>

                <div className="space-y-2">
                  <Label htmlFor="workspace-delete-confirmation">
                    Type <strong>{data.workspace.name}</strong> to confirm
                  </Label>
                  <Input
                    id="workspace-delete-confirmation"
                    value={deleteConfirmation}
                    onChange={(event) => setDeleteConfirmation(event.target.value)}
                    placeholder={data.workspace.name}
                    disabled={deleting}
                  />
                </div>

                <Button
                  type="button"
                  variant="destructive"
                  disabled={
                    deleting || deleteConfirmation.trim() !== data.workspace.name
                  }
                  onClick={handleDeleteWorkspace}
                >
                  {deleting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="mr-2 h-4 w-4" />
                  )}
                  Delete workspace
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

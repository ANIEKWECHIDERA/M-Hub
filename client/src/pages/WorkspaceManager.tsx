import { useEffect, useMemo, useState } from "react";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Building2, Loader2, Upload, Users } from "lucide-react";
import { useAuthContext } from "@/context/AuthContext";
import { CompanyAPI } from "@/api/company.api";
import { workspaceAPI } from "@/api/workspace.api";
import type { WorkspaceManagerSnapshot } from "@/Types/types";

const capacityBadgeClasses: Record<
  WorkspaceManagerSnapshot["workload"][number]["capacityStatus"],
  string
> = {
  free: "bg-emerald-100 text-emerald-700 border-emerald-200",
  balanced: "bg-sky-100 text-sky-700 border-sky-200",
  overloaded: "bg-amber-100 text-amber-700 border-amber-200",
  behind: "bg-rose-100 text-rose-700 border-rose-200",
};

export default function WorkspaceManager() {
  const { idToken, authStatus } = useAuthContext();
  const isSuperAdmin = authStatus?.access === "superAdmin";
  const [data, setData] = useState<WorkspaceManagerSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const loadWorkspaceManager = async () => {
    if (!idToken) {
      return;
    }

    setLoading(true);
    try {
      const snapshot = await workspaceAPI.manager(idToken);
      setData(snapshot);
      setName(snapshot.workspace.name);
      setDescription(snapshot.workspace.description ?? "");
    } catch (error: any) {
      toast.error(error.message || "Failed to load workspace manager");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkspaceManager();
  }, [idToken, authStatus?.companyId]);

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
      await CompanyAPI.updateCurrent(
        {
          name: name.trim(),
          description: description.trim(),
          logo: logoFile,
        },
        idToken,
      );

      toast.success("Workspace updated");
      setLogoFile(null);
      await loadWorkspaceManager();
    } catch (error: any) {
      toast.error(error.message || "Failed to update workspace");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
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

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Workspace Manager</h1>
        <p className="text-muted-foreground">
          View workspace ownership, branding, and team capacity at a glance.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <Card className="app-surface">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Workspace Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4 rounded-xl border bg-muted/20 p-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={data.workspace.logoUrl || undefined} />
                <AvatarFallback>
                  {data.workspace.name[0]?.toUpperCase() ?? "W"}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <p className="text-lg font-semibold">{data.workspace.name}</p>
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
                    Only super admins can edit workspace branding and details.
                  </p>
                )}
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Workspace Photo</Label>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    disabled={!isSuperAdmin || saving}
                    onChange={(event) =>
                      setLogoFile(event.target.files?.[0] ?? null)
                    }
                  />
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
                      Save Branding
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="app-surface">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Capacity Cues
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border bg-muted/20 p-4">
                <p className="text-sm text-muted-foreground">Free</p>
                <p className="text-2xl font-semibold">
                  {data.workload.filter((member) => member.capacityStatus === "free").length}
                </p>
              </div>
              <div className="rounded-xl border bg-muted/20 p-4">
                <p className="text-sm text-muted-foreground">Balanced</p>
                <p className="text-2xl font-semibold">
                  {data.workload.filter((member) => member.capacityStatus === "balanced").length}
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
      </div>

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
                  <TableHead>Access</TableHead>
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
                      <Badge variant="secondary">{member.access}</Badge>
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
  );
}

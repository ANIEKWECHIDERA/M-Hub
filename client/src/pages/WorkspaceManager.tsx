import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import InviteForm from "@/components/InviteForm";
import TeamMemberForm from "@/components/TeamMemberForm";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  Copy,
  Ellipsis,
  Loader2,
  Mail,
  Plus,
  RefreshCw,
  SlidersHorizontal,
  Trash2,
  Upload,
  Users,
  AlertCircle,
} from "lucide-react";
import { useAuthContext } from "@/context/AuthContext";
import { useTeamContext } from "@/context/TeamMemberContext";
import { useWorkspaceContext } from "@/context/WorkspaceContext";
import { CompanyAPI } from "@/api/company.api";
import { inviteAPI, type InviteRecord } from "@/api/invite.api";
import type { TeamMember, WorkspaceManagerSnapshot } from "@/Types/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatRelativeTimestamp } from "@/lib/datetime";

const capacityBadgeClasses: Record<
  WorkspaceManagerSnapshot["workload"][number]["capacityStatus"],
  string
> = {
  free: "bg-emerald-100 text-emerald-700 border-emerald-200",
  balanced: "bg-sky-100 text-sky-700 border-sky-200",
  overloaded: "bg-amber-100 text-amber-700 border-amber-200",
  behind: "bg-rose-100 text-rose-700 border-rose-200",
};

type WorkspaceManagerSection =
  | "details"
  | "workload"
  | "team"
  | "invites"
  | "delete";

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
  team: {
    title: "Team",
    description:
      "Manage active workspace members, update roles and status, and remove access when needed.",
  },
  invites: {
    title: "Invites",
    description:
      "Send new invites, copy workspace invite links, resend pending access, and clean up old requests.",
  },
  delete: {
    title: "Delete Workspace",
    description:
      "This is permanent. Confirm the workspace name exactly before deleting it.",
  },
};

const roleLabels = {
  superAdmin: "Super Admin",
  admin: "Admin",
  team_member: "Team Member",
  member: "Team Member",
} as const;

const compactBadgeClass =
  "inline-flex h-6 min-w-[6.5rem] items-center justify-center rounded-full px-2 text-[10px] font-medium sm:text-xs";

function OverflowTooltip({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <p className={className}>{label}</p>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs break-words text-left">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

async function copyTextToClipboard(value: string) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      // fall through
    }
  }

  const textArea = document.createElement("textarea");
  textArea.value = value;
  textArea.setAttribute("readonly", "");
  textArea.style.position = "fixed";
  textArea.style.opacity = "0";
  textArea.style.pointerEvents = "none";
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  try {
    return document.execCommand("copy");
  } finally {
    document.body.removeChild(textArea);
  }
}

function isAcceptedInviteStatus(status: string | null | undefined) {
  return String(status ?? "").trim().toUpperCase() === "ACCEPTED";
}

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

      {section === "team" && (
        <Card className="app-surface">
          <CardContent className="space-y-3 pt-6">
            {Array.from({ length: 4 }).map((_, rowIndex) => (
              <div
                key={rowIndex}
                className="grid gap-3 rounded-xl border bg-muted/10 p-4 md:grid-cols-[1.5fr_0.8fr_0.8fr_1fr_0.8fr_120px]"
              >
                {Array.from({ length: 6 }).map((__, columnIndex) => (
                  <Skeleton key={columnIndex} className="h-5 w-full" />
                ))}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {section === "invites" && (
        <>
          <Card className="app-surface">
            <CardContent className="space-y-3 pt-6">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-full max-w-xl" />
              <Skeleton className="h-10 w-40" />
            </CardContent>
          </Card>
          <Card className="app-surface">
            <CardContent className="space-y-3 pt-6">
              {Array.from({ length: 4 }).map((_, rowIndex) => (
                <div
                  key={rowIndex}
                  className="grid gap-3 rounded-xl border bg-muted/10 p-4 md:grid-cols-[1.4fr_0.8fr_0.8fr_0.8fr_1fr_40px]"
                >
                  {Array.from({ length: 6 }).map((__, columnIndex) => (
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
    teamMembers,
    updateTeamMember,
    memberToDelete,
    setMemberToDelete,
    isDeleteDialogOpen,
    setIsDeleteDialogOpen,
    confirmDelete,
    inviteMember,
    loading: teamLoading,
    error: teamError,
  } = useTeamContext();
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
    requestedSection === "workload" ||
    requestedSection === "team" ||
    requestedSection === "invites" ||
    requestedSection === "delete"
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
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [invites, setInvites] = useState<InviteRecord[]>([]);
  const [invitesLoading, setInvitesLoading] = useState(false);
  const [inviteToDelete, setInviteToDelete] = useState<InviteRecord | null>(
    null,
  );

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

  const loadInvites = async () => {
    if (
      !idToken ||
      activeSection !== "invites" ||
      authStatus?.onboardingState !== "ACTIVE"
    ) {
      return;
    }

    setInvitesLoading(true);
    try {
      const response = await inviteAPI.list(idToken);
      setInvites(response.invites);
    } catch (error: any) {
      toast.error(error.message || "Failed to load invites");
    } finally {
      setInvitesLoading(false);
    }
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
    if (activeSection !== "invites") {
      return;
    }

    void loadInvites();
  }, [activeSection, authStatus?.companyId, idToken]);

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

  const canCopyInviteLink = (invite: InviteRecord) =>
    !isAcceptedInviteStatus(invite.status);

  const canResendInvite = (invite: InviteRecord) =>
    !isAcceptedInviteStatus(invite.status);

  const handleInviteSave = async (payload: {
    email: string;
    role: string;
    access: "admin" | "team_member";
  }) => {
    await inviteMember(payload);
    await loadInvites();
    setIsInviteDialogOpen(false);
  };

  const handleCopyInviteLink = async (inviteId: string) => {
    if (!idToken) {
      return;
    }

    const invite = invites.find((item) => item.id === inviteId);
    if (invite && !canCopyInviteLink(invite)) {
      toast.error("Accepted invites no longer have a shareable link");
      return;
    }

    const result = await inviteAPI.copyLink(inviteId, idToken);
    const copied = await copyTextToClipboard(result.link);

    if (!copied) {
      throw new Error("We couldn't copy the invite link. Try again.");
    }

    toast.success("Invite link copied");
    await loadInvites();
  };

  const handleResendInvite = async (inviteId: string) => {
    if (!idToken) {
      return;
    }

    const invite = invites.find((item) => item.id === inviteId);
    if (invite && !canResendInvite(invite)) {
      toast.error("Accepted invites cannot be resent");
      return;
    }

    const promise = inviteAPI.resend(inviteId, idToken);
    toast.promise(promise, {
      loading: "Resending invite...",
      success: "Invite resent",
      error: "Failed to resend invite",
    });

    await promise;
    await loadInvites();
  };

  const handleDeleteInvite = async (inviteId: string) => {
    if (!idToken) {
      return;
    }

    const promise = inviteAPI.remove(inviteId, idToken);
    toast.promise(promise, {
      loading: "Deleting invite...",
      success: "Invite deleted",
      error: "Failed to delete invite",
    });

    await promise;
    await loadInvites();
  };

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
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label>Workspace Owner</Label>
                <div className="flex h-11 items-center gap-3 rounded-lg border bg-muted/20 px-3">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={data.owner?.avatar || undefined} />
                    <AvatarFallback>{ownerInitials}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <OverflowTooltip
                      label={data.owner?.name ?? "Unknown owner"}
                      className="truncate text-sm font-medium"
                    />
                    <OverflowTooltip
                      label={data.owner?.email ?? "No owner email"}
                      className="truncate text-xs text-muted-foreground"
                    />
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
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
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
                              <OverflowTooltip
                                label={member.name}
                                className="max-w-[12rem] truncate font-medium"
                              />
                              <OverflowTooltip
                                label={member.email}
                                className="max-w-[12rem] truncate text-sm text-muted-foreground"
                              />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={compactBadgeClass}>
                            <span className="truncate">{member.role}</span>
                          </Badge>
                        </TableCell>
                        <TableCell>{member.assignedTaskCount}</TableCell>
                        <TableCell>{member.completedTaskCount}</TableCell>
                        <TableCell>{member.overdueTaskCount}</TableCell>
                        <TableCell>{member.inProgressTaskCount}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`${compactBadgeClass} ${capacityBadgeClasses[member.capacityStatus]}`}
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

      {activeSection === "team" && (
        <Card className="app-surface">
          <CardHeader>
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Team Management
              </CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Manage the teammates already active in this workspace.
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {teamLoading ? (
              <div className="space-y-3 rounded-xl border p-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="grid gap-3 md:grid-cols-[1.5fr_0.8fr_0.8fr_1fr_0.8fr_120px]"
                  >
                    {Array.from({ length: 6 }).map((__, cellIndex) => (
                      <Skeleton key={cellIndex} className="h-9 w-full" />
                    ))}
                  </div>
                ))}
              </div>
            ) : teamError ? (
              <Empty className="border-dashed py-10">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <AlertCircle className="size-5" />
                  </EmptyMedia>
                  <EmptyTitle>Team is unavailable</EmptyTitle>
                  <EmptyDescription>{teamError}</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : teamMembers.length === 0 ? (
              <Empty className="border-dashed py-10">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Users className="size-5" />
                  </EmptyMedia>
                  <EmptyTitle>No team members yet</EmptyTitle>
                  <EmptyDescription>
                    Invite teammates to start collaborating in this workspace.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <div className="overflow-x-auto rounded-xl border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Member</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Login</TableHead>
                      <TableHead>Access</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {teamMembers.map((member: TeamMember) => (
                      <TableRow key={member.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarImage src={member.avatar ?? undefined} />
                              <AvatarFallback>
                                {member.name
                                  ?.split(" ")
                                  .map((part: string) => part[0])
                                  .slice(0, 2)
                                  .join("")
                                  .toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <OverflowTooltip
                                label={member.name ?? "Unknown member"}
                                className="max-w-[12rem] truncate font-medium"
                              />
                              <OverflowTooltip
                                label={member.email ?? "No email"}
                                className="max-w-[12rem] truncate text-sm text-muted-foreground"
                              />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={compactBadgeClass}>
                            <span className="truncate">{member.role}</span>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`${compactBadgeClass} text-emerald-600`}
                          >
                            {member.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {member.last_login
                            ? formatRelativeTimestamp(member.last_login)
                            : "Never"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={compactBadgeClass}>
                            {roleLabels[
                              member.access as keyof typeof roleLabels
                            ] || "Team Member"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingUserId(member.id)}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-500 hover:text-red-700"
                              onClick={() => {
                                setMemberToDelete(member);
                                setIsDeleteDialogOpen(true);
                              }}
                            >
                              Remove
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeSection === "invites" && (
        <div className="space-y-3 sm:space-y-5 lg:space-y-6">
          <Card className="app-surface">
            <CardHeader>
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Invite Management
                  </CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Send invites, track status, and clean up old access requests.
                  </p>
                </div>
                <Dialog
                  open={isInviteDialogOpen}
                  onOpenChange={setIsInviteDialogOpen}
                >
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Invite Team Member
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                      <DialogTitle>Invite Team Member</DialogTitle>
                      <DialogDescription>
                        Invite a teammate into your current workspace.
                      </DialogDescription>
                    </DialogHeader>
                    <InviteForm
                      onSave={handleInviteSave}
                      onCancel={() => setIsInviteDialogOpen(false)}
                    />
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl border border-dashed bg-muted/20 px-4 py-4 text-sm text-muted-foreground">
                Pending and historical invites for this workspace are managed
                below. Accepted invites stay in the log, but only pending ones
                can still be copied or resent.
              </div>
            </CardContent>
          </Card>

          <Card className="app-surface">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Sent Invites
              </CardTitle>
            </CardHeader>
            <CardContent>
              {invitesLoading ? (
                <div className="space-y-3 rounded-xl border p-4">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div
                      key={index}
                      className="grid gap-3 md:grid-cols-[1.4fr_0.8fr_0.8fr_0.8fr_1fr_40px]"
                    >
                      {Array.from({ length: 6 }).map((__, cellIndex) => (
                        <Skeleton key={cellIndex} className="h-9 w-full" />
                      ))}
                    </div>
                  ))}
                </div>
              ) : invites.length === 0 ? (
                <Empty className="border-dashed py-10">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <Mail className="size-5" />
                    </EmptyMedia>
                    <EmptyTitle>No invites sent yet</EmptyTitle>
                    <EmptyDescription>
                      New invites will appear here with their current status and
                      expiration date.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                <div className="overflow-x-auto rounded-xl border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Access</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Expires</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invites.map((invite) => (
                        <TableRow key={invite.id}>
                          <TableCell>
                            <OverflowTooltip
                              label={invite.email}
                              className="max-w-[12rem] truncate"
                            />
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className={compactBadgeClass}>
                              <span className="truncate">{invite.role}</span>
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className={compactBadgeClass}>
                              <span className="truncate">
                                {roleLabels[
                                  invite.access as keyof typeof roleLabels
                                ] || invite.access}
                              </span>
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={compactBadgeClass}>
                              <span className="truncate">{invite.status}</span>
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {formatRelativeTimestamp(invite.expires_at)}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <Ellipsis className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {canCopyInviteLink(invite) && (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleCopyInviteLink(invite.id)
                                    }
                                  >
                                    <Copy className="mr-2 h-4 w-4" />
                                    Copy invite link
                                  </DropdownMenuItem>
                                )}
                                {canResendInvite(invite) && (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleResendInvite(invite.id)
                                    }
                                  >
                                    <RefreshCw className="mr-2 h-4 w-4" />
                                    Resend invite
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  className="text-red-600 focus:text-red-600"
                                  onClick={() => setInviteToDelete(invite)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete invite
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
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

      <Dialog
        open={Boolean(editingUserId)}
        onOpenChange={() => setEditingUserId(null)}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Team Member</DialogTitle>
            <DialogDescription>
              Update the team member details and save your changes.
            </DialogDescription>
          </DialogHeader>
          <TeamMemberForm
            member={teamMembers.find((member: TeamMember) => member.id === editingUserId)}
            canAssignSuperAdmin={isSuperAdmin}
            canEditAccess={isSuperAdmin}
            onSave={async (nextData) => {
              if (!editingUserId) {
                return;
              }

              await updateTeamMember(editingUserId, nextData);
              setEditingUserId(null);
            }}
            onCancel={() => setEditingUserId(null)}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove{" "}
              <strong>{memberToDelete?.name || "this team member"}</strong> from
              the workspace? They will lose access immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>
              Remove Member
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={Boolean(inviteToDelete)}
        onOpenChange={(open) => {
          if (!open) {
            setInviteToDelete(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Invite</AlertDialogTitle>
            <AlertDialogDescription>
              Delete the invite for{" "}
              <strong>{inviteToDelete?.email ?? "this teammate"}</strong>? This
              removes the current invite link and it can no longer be used.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!inviteToDelete) {
                  return;
                }

                const inviteId = inviteToDelete.id;
                setInviteToDelete(null);
                await handleDeleteInvite(inviteId);
              }}
            >
              Delete Invite
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

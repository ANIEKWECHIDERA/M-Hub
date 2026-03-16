import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Bell,
  KeyRound,
  Loader,
  Mail,
  Plus,
  Shield,
  Upload,
  User,
  Users,
} from "lucide-react";

import { inviteAPI, type InviteRecord } from "@/api/invite.api";
import InviteForm from "@/components/InviteForm";
import TeamMemberForm from "@/components/TeamMemberForm";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuthContext } from "@/context/AuthContext";
import { useTeamContext } from "@/context/TeamMemberContext";
import { useUploadStatus } from "@/context/UploadStatusContext";
import { useUser } from "@/context/UserContext";
import { prepareImageUpload } from "@/lib/image-upload";

const roleLabels = {
  superAdmin: "Super Admin",
  admin: "Admin",
  team_member: "Team Member",
  member: "Team Member",
};

type SecurityFormState = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export default function Settings() {
  const {
    teamMembers,
    setMemberToDelete,
    memberToDelete,
    isDeleteDialogOpen,
    setIsDeleteDialogOpen,
    inviteMember,
    updateTeamMember,
    confirmDelete,
    loading,
    error,
  } = useTeamContext();
  const { profile, updateProfile } = useUser();
  const { idToken, authStatus } = useAuthContext();
  const { startUpload, setUploadProgress, finishUpload } = useUploadStatus();

  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [invites, setInvites] = useState<InviteRecord[]>([]);
  const [invitesLoading, setInvitesLoading] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [securityForm, setSecurityForm] = useState<SecurityFormState>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    setFirstName(profile?.first_name ?? "");
    setLastName(profile?.last_name ?? "");
  }, [profile?.first_name, profile?.last_name]);

  const initials = useMemo(() => {
    if (!profile) return "U";

    const parts =
      [firstName, lastName].filter(Boolean) || profile.displayName?.split(" ");

    return (
      parts
        .filter(Boolean)
        .map((part) => part[0]?.toUpperCase())
        .join("")
        .slice(0, 2) || "U"
    );
  }, [firstName, lastName, profile]);

  const profileDirty =
    firstName.trim() !== (profile?.first_name ?? "") ||
    lastName.trim() !== (profile?.last_name ?? "") ||
    Boolean(avatarFile);

  const passwordDirty = Object.values(securityForm).some(Boolean);

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;

    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const loadInvites = async () => {
    if (!idToken || authStatus?.onboardingState !== "ACTIVE") return;

    setInvitesLoading(true);
    try {
      const response = await inviteAPI.list(idToken);
      setInvites(response.invites);
    } catch (inviteError: any) {
      toast.error(inviteError.message || "Failed to load invites");
    } finally {
      setInvitesLoading(false);
    }
  };

  useEffect(() => {
    loadInvites();
  }, [idToken, authStatus?.companyId]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader className="animate-spin" />
      </div>
    );
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  const handleUpdateProfile = async () => {
    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();

    if (!trimmedFirstName || !trimmedLastName) {
      toast.error("First name and last name cannot be empty.");
      return;
    }

    const formData = new FormData();
    formData.append("first_name", trimmedFirstName);
    formData.append("last_name", trimmedLastName);
    formData.append("display_name", `${trimmedFirstName} ${trimmedLastName}`);

    startUpload("Uploading profile update...");

    try {
      setUploadProgress(18);

      if (avatarFile) {
        const optimizedAvatar = await prepareImageUpload(avatarFile, {
          maxSizeMB: 5,
          maxWidth: 1200,
          maxHeight: 1200,
        });
        formData.append("avatar", optimizedAvatar);
        setUploadProgress(45);
      }

      const success = await updateProfile(formData);

      if (!success) {
        throw new Error("Something went wrong, please try again.");
      }

      setUploadProgress(100);
      finishUpload({ success: true, message: "Profile updated successfully" });
      setAvatarFile(null);
      toast.success("Profile updated");
    } catch (profileError: any) {
      finishUpload({
        success: false,
        message: profileError.message || "Profile update failed",
      });
      toast.error(profileError.message || "Something went wrong.");
    }
  };

  const handleInviteSave = async (data: {
    email: string;
    role: string;
    access: "admin" | "team_member";
  }) => {
    await inviteMember(data);
    await loadInvites();
    setIsUserDialogOpen(false);
  };

  const handleCancelInvite = async (inviteId: string) => {
    if (!idToken) return;

    const promise = inviteAPI.cancel(inviteId, idToken);

    toast.promise(promise, {
      loading: "Cancelling invite...",
      success: "Invite cancelled",
      error: "Failed to cancel invite",
    });

    await promise;
    await loadInvites();
  };

  const handleSecurityPlaceholder = () => {
    toast.info("Password and 2FA management UI is ready. Backend actions come next.");
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your profile, security preferences, and workspace members.
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-5">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-2 rounded-xl border bg-muted/40 p-1 md:grid-cols-4">
          <TabsTrigger value="profile" className="rounded-lg">
            Profile
          </TabsTrigger>
          <TabsTrigger value="notifications" className="rounded-lg">
            Notifications
          </TabsTrigger>
          <TabsTrigger value="security" className="rounded-lg">
            Security
          </TabsTrigger>
          <TabsTrigger value="users" className="rounded-lg">
            Team
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          <Card className="app-surface">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col gap-4 rounded-xl border bg-muted/20 p-4 md:flex-row md:items-center">
                <Avatar className="h-20 w-20">
                  <AvatarImage
                    src={
                      avatarFile
                        ? URL.createObjectURL(avatarFile)
                        : profile?.photoURL || undefined
                    }
                  />
                  <AvatarFallback className="text-lg">
                    {initials}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 space-y-2">
                  <Label htmlFor="avatar">Profile Photo</Label>
                  <Input
                    id="avatar"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(e) => setAvatarFile(e.target.files?.[0] ?? null)}
                  />
                  <p className="text-sm text-muted-foreground">
                    Optional. Images are optimized before upload to make profile
                    updates faster and more reliable.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="First name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Last name"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profile?.email ?? ""}
                    disabled
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={handleUpdateProfile}
                  disabled={!profileDirty}
                  className={profileDirty ? "" : "opacity-70"}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card className="app-surface">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {[
                "Task Assignments",
                "Project Updates",
                "Comments",
                "Email Notifications",
              ].map((label, index) => (
                <div
                  key={label}
                  className="flex items-center justify-between rounded-xl border bg-muted/20 px-4 py-3"
                >
                  <div className="space-y-0.5">
                    <Label>{label}</Label>
                    <p className="text-sm text-muted-foreground">
                      Manage how you receive {label.toLowerCase()}.
                    </p>
                  </div>
                  <Switch defaultChecked={index < 3} />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card className="app-surface">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    value={securityForm.currentPassword}
                    onChange={(e) =>
                      setSecurityForm((prev) => ({
                        ...prev,
                        currentPassword: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={securityForm.newPassword}
                    onChange={(e) =>
                      setSecurityForm((prev) => ({
                        ...prev,
                        newPassword: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={securityForm.confirmPassword}
                  onChange={(e) =>
                    setSecurityForm((prev) => ({
                      ...prev,
                      confirmPassword: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="flex items-start justify-between rounded-xl border bg-muted/20 px-4 py-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 font-medium">
                    <KeyRound className="h-4 w-4" />
                    Two-Factor Authentication
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Add an extra layer of security to your account.
                  </p>
                </div>
                <Button variant="outline" onClick={handleSecurityPlaceholder}>
                  Enable 2FA
                </Button>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={handleSecurityPlaceholder}
                  disabled={!passwordDirty}
                  className={passwordDirty ? "" : "opacity-70"}
                >
                  Update Password
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card className="app-surface">
            <CardHeader>
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Team Management
                  </CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Invite teammates and manage access for this workspace.
                  </p>
                </div>
                <Dialog
                  open={isUserDialogOpen}
                  onOpenChange={setIsUserDialogOpen}
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
                      onCancel={() => setIsUserDialogOpen(false)}
                    />
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {teamMembers.length === 0 ? (
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
                <div className="rounded-xl border">
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
                      {teamMembers.map((member: any) => (
                        <TableRow key={member.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9">
                                <AvatarImage src={member.avatar} />
                                <AvatarFallback>
                                  {member.name
                                    ?.split(" ")
                                    .map((n: string) => n[0])
                                    .slice(0, 2)
                                    .join("")
                                    .toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium">{member.name}</div>
                                <div className="text-sm text-muted-foreground">
                                  {member.email}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{member.role}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-emerald-600">
                              {member.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {member.last_login
                              ? formatTime(member.last_login)
                              : "Never"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">
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

          <Card className="app-surface">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Sent Invites
              </CardTitle>
            </CardHeader>
            <CardContent>
              {invitesLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader className="h-4 w-4 animate-spin" />
                  Loading invites...
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
                <div className="rounded-xl border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Access</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Expires</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invites.map((invite) => (
                        <TableRow key={invite.id}>
                          <TableCell>{invite.email}</TableCell>
                          <TableCell>{invite.role}</TableCell>
                          <TableCell>{invite.access}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{invite.status}</Badge>
                          </TableCell>
                          <TableCell>{formatTime(invite.expires_at)}</TableCell>
                          <TableCell className="text-right">
                            {invite.status === "PENDING" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-500"
                                onClick={() => handleCancelInvite(invite.id)}
                              >
                                Cancel
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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
            member={teamMembers.find((member: any) => member.id === editingUserId)}
            onSave={async (data) => {
              if (!editingUserId) return;
              await updateTeamMember(editingUserId, data);
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
              <strong>{memberToDelete?.name}</strong> from this workspace?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end gap-2 pt-4">
            <AlertDialogCancel onClick={() => setMemberToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDelete()}
              className="bg-red-600 hover:bg-red-700"
            >
              Remove
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

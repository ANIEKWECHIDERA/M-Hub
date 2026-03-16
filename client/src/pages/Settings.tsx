import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  User,
  Bell,
  Shield,
  Users,
  Plus,
  Edit,
  Trash2,
  Loader,
  Mail,
  Upload,
} from "lucide-react";
import { useTeamContext } from "@/context/TeamMemberContext";
import { toast } from "sonner";
import TeamMemberForm from "@/components/TeamMemberForm";
import InviteForm from "@/components/InviteForm";
import { useUser } from "@/context/UserContext";
import { useAuthContext } from "@/context/AuthContext";
import { inviteAPI, type InviteRecord } from "@/api/invite.api";
import { useUploadStatus } from "@/context/UploadStatusContext";

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
  const { startUpload, finishUpload } = useUploadStatus();

  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [isValid, setIsValid] = useState(false);
  const [invites, setInvites] = useState<InviteRecord[]>([]);
  const [invitesLoading, setInvitesLoading] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  const firstNameRef = useRef<HTMLInputElement>(null);
  const lastNameRef = useRef<HTMLInputElement>(null);

  const initials = useMemo(() => {
    if (!profile) return "U";

    const parts =
      [profile.first_name, profile.last_name].filter(Boolean) ||
      profile.displayName?.split(" ");

    const joined = (parts || [])
      .filter(Boolean)
      .map((part) => part![0].toUpperCase())
      .join("");

    return joined || "U";
  }, [profile]);

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

  useEffect(() => {
    setIsValid(
      Boolean(
        (profile?.first_name?.trim() && profile?.last_name?.trim()) || avatarFile,
      ),
    );
  }, [profile?.first_name, profile?.last_name, avatarFile]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader className="animate-spin" />
      </div>
    );
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  const validate = () => {
    const first = firstNameRef.current?.value.trim();
    const last = lastNameRef.current?.value.trim();
    setIsValid(Boolean((first && last) || avatarFile));
  };

  const handleUpdateProfile = async () => {
    const firstName = firstNameRef.current?.value.trim() || "";
    const lastName = lastNameRef.current?.value.trim() || "";

    if (!firstName || !lastName) {
      toast.error("First name and last name cannot be empty.");
      return;
    }

    const formData = new FormData();
    formData.append("first_name", firstName);
    formData.append("last_name", lastName);
    formData.append("display_name", `${firstName} ${lastName}`);

    if (avatarFile) {
      formData.append("avatar", avatarFile);
    }

    startUpload("Uploading profile update...");
    try {
      const promise = updateProfile(formData);

      toast.promise(promise, {
        loading: "Updating profile...",
        success: "Profile updated",
        error: "Something went wrong, please try again.",
      });

      await promise;
      setAvatarFile(null);
    } finally {
      finishUpload();
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

  const roleLabels = {
    superAdmin: "Super Admin",
    admin: "Admin",
    team_member: "Team Member",
    member: "Team Member",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your profile, invitations, and workspace members.
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="users">Team</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-center">
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

                <div className="space-y-2">
                  <Label htmlFor="avatar">Profile Photo</Label>
                  <Input
                    id="avatar"
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      setAvatarFile(e.target.files?.[0] ?? null)
                    }
                  />
                  <p className="text-sm text-muted-foreground">
                    Optional. Upload a profile picture for your workspace.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    ref={firstNameRef}
                    defaultValue={profile?.first_name ?? ""}
                    onInput={validate}
                    placeholder="First name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    ref={lastNameRef}
                    defaultValue={profile?.last_name ?? ""}
                    onInput={validate}
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

              <Button onClick={handleUpdateProfile} disabled={!isValid}>
                <Upload className="mr-2 h-4 w-4" />
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {[
                "Task Assignments",
                "Project Updates",
                "Comments",
                "Email Notifications",
              ].map((label, index) => (
                <div
                  key={label}
                  className="flex items-center justify-between border-b pb-4 last:border-b-0"
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
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Password and provider security controls can be expanded here as
                you wire more account-management endpoints.
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                <Input type="password" placeholder="Current password" />
                <Input type="password" placeholder="New password" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Team Management
                </CardTitle>
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
              <div className="rounded-lg border">
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
                            <Avatar className="h-8 w-8">
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
                          <Badge variant="outline" className="text-green-600">
                            {member.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {member.last_login ? formatTime(member.last_login) : "Never"}
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
                              <Edit className="h-4 w-4" />
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
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  <h3 className="font-semibold">Sent Invites</h3>
                </div>

                <div className="rounded-lg border">
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
                      {invitesLoading ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center">
                            Loading invites...
                          </TableCell>
                        </TableRow>
                      ) : invites.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center">
                            No invites sent yet.
                          </TableCell>
                        </TableRow>
                      ) : (
                        invites.map((invite) => (
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
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
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

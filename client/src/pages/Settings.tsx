import { useEffect, useRef, useState } from "react";
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
} from "lucide-react";
import { useTeamContext } from "@/context/TeamMemberContext";
import { toast } from "sonner";
import TeamMemberForm from "@/components/TeamMemberForm";
import InviteForm from "@/components/InviteForm";
import { useUser } from "@/context/UserContext";
import type { UserProfileUpdate } from "@/Types/types";
// import { useAuthContext } from "@/context/AuthContext";

export default function Settings() {
  const {
    teamMembers,
    setMemberToDelete,
    memberToDelete,
    isDeleteDialogOpen,
    setIsDeleteDialogOpen,
    updateTeamMember,
    confirmDelete,
    loading,
    error,
  } = useTeamContext();
  const { profile, updateProfile } = useUser();
  const [users, setUsers] = useState(teamMembers);
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<any>(null);
  const [isValid, setIsValid] = useState(false);
  // const { idToken } = useAuthContext();
  const initials = (() => {
    if (!profile) return "User";

    const { first_name, last_name, displayName } = profile;

    const initials =
      [first_name, last_name]
        .filter(Boolean)
        .map((x) => x![0].toUpperCase())
        .join("") ||
      displayName
        ?.split(" ")
        .filter(Boolean)
        .map((p) => p[0].toUpperCase())
        .join("");

    return initials || "User";
  })();

  const photoURL = profile?.photoURL;

  const [formData, setFormData] = useState({
    firstName: profile?.first_name ?? "",
    lastName: profile?.last_name ?? "",
    email: profile?.email ?? "",
  });

  const firstNameRef = useRef<HTMLInputElement>(null);
  const lastNameRef = useRef<HTMLInputElement>(null);

  // Sync form when profile loads/changes
  useEffect(() => {
    if (profile) {
      setFormData({
        firstName: profile.first_name ?? "",
        lastName: profile.last_name ?? "",
        email: profile.email ?? "",
      });
    }
  }, [profile]);

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader className="animate-spin" />
      </div>
    );
  if (error) return <div>Error: {error}</div>;

  const validate = () => {
    const first = firstNameRef.current?.value.trim();
    const last = lastNameRef.current?.value.trim();
    setIsValid(!!first && !!last);
  };

  const handleUpdateProfile = async () => {
    const firstName = firstNameRef.current?.value.trim() || "";
    const lastName = lastNameRef.current?.value.trim() || "";

    if (!firstName || !lastName) {
      toast.error("First name and last name cannot be empty.");
      return;
    }

    const updates: Partial<UserProfileUpdate> = {
      first_name: firstName,
      last_name: lastName,
    };

    const promise = updateProfile(updates);

    toast.promise(promise, {
      loading: "Updating profile...",
      success: "Profile has been updated!",
      error: "Something went wrong, please try again.",
    });

    await promise; // nothing else needed
  };

  const roleLabels = {
    superAdmin: "Super Admin",
    admin: "Admin",
    member: "Team Member",
  };

  // console.log("TEAM MEMBERS:", teamMembers);

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr + "Z"); // treat backend time as UTC
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000); // difference in seconds

    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    if (diff < 31536000)
      return date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      });
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account and application preferences
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="users">Team Management</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={photoURL} />
                  <AvatarFallback className="text-lg">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <Button variant="outline">Change Avatar</Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    ref={firstNameRef}
                    defaultValue={profile?.first_name ?? ""}
                    disabled={loading}
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
                    disabled={loading}
                    onInput={validate}
                    placeholder="Last name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profile?.email ?? ""}
                    disabled
                  />
                </div>
              </div>
              <Button
                onClick={handleUpdateProfile}
                disabled={loading || !isValid}
              >
                {loading ? "Saving..." : "Save Changes"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Task Assignments</Label>
                    <p className="text-sm text-muted-foreground">
                      Get notified when tasks are assigned to you
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Project Updates</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive updates about project changes
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Comments</Label>
                    <p className="text-sm text-muted-foreground">
                      Get notified about new comments
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Chat Messages</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive notifications for chat messages
                    </p>
                  </div>
                  <Switch />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Send notifications to your email
                    </p>
                  </div>
                  <Switch />
                </div>
              </div>

              <Button>Save Preferences</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <Input id="currentPassword" type="password" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input id="newPassword" type="password" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input id="confirmPassword" type="password" />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Two-Factor Authentication</Label>
                    <p className="text-sm text-muted-foreground">
                      Add an extra layer of security to your account
                    </p>
                  </div>
                  <Button variant="outline">Enable 2FA</Button>
                </div>
              </div>

              <Button>Update Password</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Team Management Tab */}
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
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
                      <Plus className="h-4 w-4 mr-2" />
                      Invite Team Member
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                      <DialogTitle>Invite Team Member</DialogTitle>
                      <DialogDescription>
                        Invite Team Members.
                      </DialogDescription>
                    </DialogHeader>
                    <InviteForm
                      onSave={(data: any) => {
                        const newUser = {
                          id: users.length + 1,
                          ...data,
                          status: "Active",
                          lastLogin: new Date().toISOString().split("T")[0],
                        };
                        setUsers([...users, newUser]);
                        setIsUserDialogOpen(false);
                      }}
                      onCancel={() => setIsUserDialogOpen(false)}
                    />
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
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
                  {teamMembers.map((team_members: any) => (
                    <TableRow key={team_members.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={team_members.avatar} />
                            <AvatarFallback>
                              {team_members.name
                                ?.split(" ")
                                .map((n: any) => n[0])
                                .slice(0, 2)
                                .join("")
                                .toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">
                              {team_members.name}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {team_members.email}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={"outline"}>{team_members.role}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-green-600">
                          {team_members.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {team_members.last_login === null
                          ? "Never"
                          : formatTime(team_members.last_login)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            team_members.access === "Admin"
                              ? "default"
                              : team_members.role === "Team"
                                ? "secondary"
                                : "outline"
                          }
                        >
                          {roleLabels[
                            team_members.access as keyof typeof roleLabels
                          ] || "Team Member"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label={`Edit ${team_members.firstname} ${team_members.lastname}`}
                            onClick={() => {
                              setEditingUserId(team_members.id);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-700"
                            aria-label={`Delete ${team_members.firstname} ${team_members.lastname}`}
                            onClick={() => {
                              setMemberToDelete(team_members);
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
        </TabsContent>
      </Tabs>

      {/* Single Edit Dialog */}
      <Dialog
        open={!!editingUserId}
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
            member={teamMembers.find((m: any) => m.id === editingUserId)}
            onSave={async (data) => {
              if (editingUserId) {
                await updateTeamMember(editingUserId, data);
                setEditingUserId(null);
              }
            }}
            onCancel={() => setEditingUserId(null)}
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
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <strong>
                {memberToDelete?.firstname} {memberToDelete?.lastname}
              </strong>
              ? This action cannot be undone.
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
              Delete
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

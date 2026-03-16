import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, LogOut, Upload, User } from "lucide-react";
import { toast } from "sonner";

import { UserAPI } from "@/api/user.api";
import { useAuthContext } from "@/context/AuthContext";
import { useUploadStatus } from "@/context/UploadStatusContext";

export default function CompleteProfile() {
  const [loading, setLoading] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  const navigate = useNavigate();
  const { idToken, currentUser, refreshStatus, logout } = useAuthContext();
  const { startUpload, finishUpload } = useUploadStatus();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!firstName.trim() || !lastName.trim()) {
      toast.error("Both first and last name are required");
      return;
    }

    if (!acceptedTerms) {
      toast.error("You must accept the terms and conditions");
      return;
    }

    if (!currentUser) {
      toast.error("Not authenticated");
      return;
    }

    setLoading(true);
    startUpload("Uploading profile...");

    try {
      const formData = new FormData();
      formData.append("first_name", firstName.trim());
      formData.append("last_name", lastName.trim());
      formData.append("display_name", `${firstName.trim()} ${lastName.trim()}`);
      formData.append("terms_accepted", "true");
      formData.append("profile_complete", "true");
      if (avatarFile) {
        formData.append("avatar", avatarFile);
      }

      await UserAPI.update(formData, idToken);

      toast.success("Profile completed!");
      await refreshStatus();
      navigate("/onboarding/company");
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    } finally {
      finishUpload();
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-6 relative">
      <Button
        type="button"
        variant="outline"
        className="absolute right-6 top-6"
        onClick={logout}
        disabled={loading}
      >
        <LogOut className="mr-2 h-4 w-4" />
        Logout
      </Button>
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center pb-8">
          <div className="mx-auto w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <User className="w-10 h-10 text-blue-600" />
          </div>
          <CardTitle className="text-2xl font-bold">Welcome!</CardTitle>
          <p className="text-muted-foreground mt-2">
            Please complete your profile to continue
          </p>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex items-center gap-4 rounded-xl border p-4">
              <Avatar className="h-16 w-16">
                <AvatarImage
                  src={avatarFile ? URL.createObjectURL(avatarFile) : undefined}
                />
                <AvatarFallback>
                  {(firstName[0] ?? "U").toUpperCase()}
                  {(lastName[0] ?? "").toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-2">
                <Label htmlFor="avatar">Profile Picture</Label>
                <Input
                  id="avatar"
                  type="file"
                  accept="image/*"
                  disabled={loading}
                  onChange={(e) => setAvatarFile(e.target.files?.[0] ?? null)}
                />
                <p className="text-sm text-muted-foreground">
                  Optional. Upload a profile photo for your workspace.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="John"
                  required
                  disabled={loading}
                  autoFocus
                  className="text-base"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Doe"
                  required
                  disabled={loading}
                  className="text-base"
                />
              </div>
            </div>

            <div className="flex items-start space-x-2">
              <Checkbox
                id="terms"
                checked={acceptedTerms}
                onCheckedChange={(checked) =>
                  setAcceptedTerms(Boolean(checked))
                }
                disabled={loading}
                className="mt-1"
              />
              <Label htmlFor="terms" className="text-sm font-normal leading-5">
                I accept the terms of service and privacy policy.
              </Label>
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={
                loading ||
                !firstName.trim() ||
                !lastName.trim() ||
                !acceptedTerms
              }
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Continue
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

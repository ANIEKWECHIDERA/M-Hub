// src/pages/CompleteProfile.tsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, User } from "lucide-react";
import { toast } from "sonner";

import { UserAPI } from "@/api/user.api";
import { useAuthContext } from "@/context/AuthContext";

export default function CompleteProfile() {
  const [loading, setLoading] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  const navigate = useNavigate();
  const { currentUser } = useAuthContext();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!firstName.trim() || !lastName.trim()) {
      toast.error("Both first and last name are required");
      return;
    }

    if (!currentUser) {
      toast.error("Not authenticated");
      return;
    }

    setLoading(true);

    try {
      const idToken = await currentUser.getIdToken();

      await UserAPI.update(
        {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          display_name: `${firstName.trim()} ${lastName.trim()}`,
          profile_complete: true,
        },
        idToken,
      );

      toast.success("Profile completed!");

      setTimeout(() => {
        navigate("/create-company");
      }, 1000);
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-6">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center pb-8">
          <div className="mx-auto w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <User className="w-10 h-10 text-blue-600" />
          </div>
          <CardTitle className="text-2xl font-bold">Welcome!</CardTitle>
          <p className="text-muted-foreground mt-2">
            Please tell us your name to get started
          </p>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
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

            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={loading || !firstName.trim() || !lastName.trim()}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Saving...
                </>
              ) : (
                "Continue"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

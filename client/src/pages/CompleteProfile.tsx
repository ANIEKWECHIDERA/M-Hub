// src/pages/CompleteProfile.tsx
import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, User, X } from "lucide-react";
import { toast } from "sonner";
import { API_CONFIG } from "@/lib/api";

export default function CompleteProfile() {
  const [loading, setLoading] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const location = useLocation();

  // Extract token from URL: /complete-profile?token=abc123
  const searchParams = new URLSearchParams(location.search);
  const token = searchParams.get("token");

  useEffect(() => {
    if (!token) {
      toast.error("Invalid access. Missing token.");
      setTimeout(() => window.close(), 2000);
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!firstName.trim() || !lastName.trim()) {
      toast.error("Both first and last name are required");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_CONFIG.backend}/api/user`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to save profile");
      }

      toast.success("Profile completed!");

      // Close popup after success
      setTimeout(() => {
        window.close();

        // Fallback: notify parent window to refresh
        if (window.opener) {
          window.opener.postMessage({ type: "PROFILE_COMPLETED" }, "*");
          window.opener.focus();
        }
      }, 1500);
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
      setLoading(false);
    }
  };

  const handleClose = () => {
    window.close();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-6">
      <Card className="w-full max-w-md shadow-2xl relative">
        {/* Close button */}
        <Button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition"
        >
          <X className="w-5 h-5" />
        </Button>

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
                "Continue to Dashboard"
              )}
            </Button>
          </form>

          <p className="text-xs text-center text-muted-foreground mt-8">
            This window will close automatically when done.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Building2, LogOut } from "lucide-react";
import { toast } from "sonner";
import { useAuthContext } from "@/context/AuthContext";
import { CompanyAPI } from "@/api/company.api";
import { useUploadStatus } from "@/context/UploadStatusContext";
import { prepareImageUpload } from "@/lib/image-upload";

export default function CreateCompany() {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [logo, setLogo] = useState<File | null>(null);

  const navigate = useNavigate();
  const { idToken, refreshStatus, logout } = useAuthContext();
  const { startUpload, setUploadProgress, finishUpload } = useUploadStatus();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Company name is required");
      return;
    }

    setLoading(true);
    startUpload("Uploading company setup...");

    try {
      const formData = new FormData();
      setUploadProgress(20);
      formData.append("name", name.trim());
      if (description.trim()) {
        formData.append("description", description.trim());
      }
      if (logo) {
        setUploadProgress(40);
        const optimizedLogo = await prepareImageUpload(logo, {
          maxSizeMB: 5,
          maxWidth: 1400,
          maxHeight: 1400,
        });
        formData.append("logo", optimizedLogo);
      }

      setUploadProgress(75);
      await CompanyAPI.create(formData, idToken);
      setUploadProgress(100);
      finishUpload({ success: true, message: "Company setup completed" });

      toast.success("Company created successfully!");

      setTimeout(() => {
        refreshStatus().then(() => {
          navigate("/dashboard");
        });
      }, 1000);
    } catch (err: any) {
      finishUpload({
        success: false,
        message: err.message || "Company setup failed",
      });
      toast.error(err.message || "Something went wrong");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-6 relative">
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
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center pb-8">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full border bg-muted">
            <Building2 className="h-10 w-10 text-foreground" />
          </div>
          <CardTitle className="text-2xl font-bold">
            Create Your Company
          </CardTitle>
          <p className="text-muted-foreground mt-2">
            Set up your workspace to get started
          </p>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label>Company Name *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Acme Inc."
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label>Description (Optional)</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What does your company do?"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label>Logo (Optional)</Label>
              <Input
                type="file"
                accept="image/*"
                disabled={loading}
                onChange={(e) =>
                  setLogo(e.target.files ? e.target.files[0] : null)
                }
              />
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={loading || !name.trim()}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Company"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

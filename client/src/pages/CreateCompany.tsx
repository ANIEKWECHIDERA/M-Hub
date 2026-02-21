import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Building2 } from "lucide-react";
import { toast } from "sonner";
import { useAuthContext } from "@/context/AuthContext";
import { CompanyAPI } from "@/api/company.api";

export default function CreateCompany() {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [logo, setLogo] = useState<File | null>(null);

  const navigate = useNavigate();
  const { idToken, refreshStatus, authStatus } = useAuthContext();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Submitting company creation", { name, description, logo });
    if (!name.trim()) {
      toast.error("Company name is required");
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("name", name.trim());
      if (description.trim()) {
        formData.append("description", description.trim());
      }
      if (logo) {
        formData.append("logo", logo);
      }

      await CompanyAPI.create(formData, idToken);

      toast.success("Company created successfully!");

      setTimeout(() => {
        refreshStatus().then(() => {
          console.log("Auth status after refresh:", authStatus);
          navigate("/dashboard");
        });
      }, 1000);
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-blue-50 flex items-center justify-center p-6">
      <Card className="w-full max-w-lg shadow-2xl">
        <CardHeader className="text-center pb-8">
          <div className="mx-auto w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
            <Building2 className="w-10 h-10 text-indigo-600" />
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

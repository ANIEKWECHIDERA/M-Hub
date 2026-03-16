import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, MailCheck, UserPlus, XCircle } from "lucide-react";
import { toast } from "sonner";
import { inviteAPI } from "@/api/invite.api";
import { workspaceAPI } from "@/api/workspace.api";
import { useAuthContext } from "@/context/AuthContext";

export default function AcceptInvitePage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { idToken, refreshStatus, currentUser } = useAuthContext();
  const [loading, setLoading] = useState(false);
  const [acceptedCompanyId, setAcceptedCompanyId] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      localStorage.setItem("pendingInviteToken", token);
    }
  }, [token]);

  const handleAccept = async () => {
    if (!token) {
      toast.error("Invite token is missing.");
      return;
    }

    if (!idToken || !currentUser) {
      toast.error("Please log in or sign up before accepting this invite.");
      return;
    }

    setLoading(true);
    try {
      const result = await inviteAPI.accept(token, idToken);
      setAcceptedCompanyId(result.companyId);
      localStorage.removeItem("pendingInviteToken");
      toast.success("Invite accepted successfully");
      await refreshStatus();
    } catch (error: any) {
      toast.error(error.message || "Failed to accept invite");
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchWorkspace = async () => {
    if (!idToken || !acceptedCompanyId) return;

    setLoading(true);
    try {
      await workspaceAPI.switch(acceptedCompanyId, idToken);
      await refreshStatus();
      toast.success("Workspace switched");
      navigate("/dashboard", { replace: true });
    } catch (error: any) {
      toast.error(error.message || "Failed to switch workspace");
    } finally {
      setLoading(false);
    }
  };

  const handleDecline = async () => {
    if (!token) return;

    setLoading(true);
    try {
      await inviteAPI.decline(token);
      localStorage.removeItem("pendingInviteToken");
      toast.success("Invite declined");
      navigate("/login", { replace: true });
    } catch (error: any) {
      toast.error(error.message || "Failed to decline invite");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-white to-orange-50 p-6">
      <Card className="w-full max-w-lg shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
            <MailCheck className="h-8 w-8 text-amber-700" />
          </div>
          <CardTitle>Workspace Invite</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Accept this invite to join another workspace. You can keep your
            existing workspace and switch between them later.
          </p>

          {!currentUser && !acceptedCompanyId && (
            <div className="rounded-lg border bg-muted/30 p-4 text-sm">
              <p className="font-medium">No M-Hub account yet?</p>
              <p className="mt-1 text-muted-foreground">
                Create an account or log in with the invited email address, then
                come back here to accept the invite.
              </p>
              <div className="mt-3 flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => navigate("/login", { replace: true })}
                >
                  Log In
                </Button>
                <Button onClick={() => navigate("/signup", { replace: true })}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Sign Up
                </Button>
              </div>
            </div>
          )}

          {!acceptedCompanyId ? (
            <div className="space-y-3">
              <Button
                onClick={handleAccept}
                className="w-full"
                disabled={loading || !token || !currentUser}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Accepting...
                  </>
                ) : (
                  "Accept Invite"
                )}
              </Button>
              <Button
                variant="outline"
                onClick={handleDecline}
                className="w-full"
                disabled={loading || !token}
              >
                <XCircle className="mr-2 h-4 w-4" />
                Decline Invite
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <Button
                onClick={handleSwitchWorkspace}
                className="w-full"
                disabled={loading}
              >
                Switch to New Workspace
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate("/dashboard", { replace: true })}
                disabled={loading}
              >
                Stay in Current Workspace
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

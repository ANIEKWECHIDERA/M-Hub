import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, MailCheck, UserPlus, XCircle } from "lucide-react";
import { toast } from "sonner";
import { inviteAPI } from "@/api/invite.api";
import { workspaceAPI } from "@/api/workspace.api";
import { useAuthContext } from "@/context/AuthContext";
import { CrevoMark } from "@/components/CrevoMark";

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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-amber-50 via-white to-orange-50 px-4 py-5 sm:p-6">
      <Card className="premium-interactive w-full max-w-lg shadow-xl">
        <CardHeader className="text-center">
          <div className="mb-4 flex items-center justify-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm sm:h-14 sm:w-14">
              <CrevoMark className="h-7 w-7 sm:h-8 sm:w-8" />
            </div>
            <div className="text-left">
              <p className="text-lg font-semibold tracking-tight sm:text-xl">
                Crevo
              </p>
              <p className="text-xs text-muted-foreground sm:text-sm">
                Invitation flow
              </p>
            </div>
          </div>
          <div className="mx-auto mb-1 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
            <MailCheck className="h-6 w-6 text-amber-700" />
          </div>
          <CardTitle className="text-xl sm:text-2xl">Workspace Invite</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4">
          <p className="text-xs text-muted-foreground sm:text-sm">
            Accept this invite to join another workspace. You can keep your
            existing workspace and switch between them later.
          </p>

          {!currentUser && !acceptedCompanyId && (
            <div className="rounded-lg border bg-muted/30 p-3 text-xs sm:p-4 sm:text-sm">
              <p className="font-medium">No Crevo account yet?</p>
              <p className="mt-1 text-muted-foreground">
                Create an account or log in with the invited email address, then
                come back here to accept the invite.
              </p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <Button
                  variant="outline"
                  onClick={() => navigate("/login", { replace: true })}
                  className="w-full sm:w-auto"
                >
                  Log In
                </Button>
                <Button
                  onClick={() => navigate("/signup", { replace: true })}
                  className="w-full sm:w-auto"
                >
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

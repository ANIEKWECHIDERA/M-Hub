"use client";

import {
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from "react";
import { CheckCircle2, Copy, Link2, Sparkles, User } from "lucide-react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";

import { joinWaitlist, type WaitlistActionState } from "@/actions/waitlist";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const initialState: WaitlistActionState = {
  status: "idle",
};

function getStoredReferralCodeClient() {
  const params = new URLSearchParams(window.location.search);
  const referralFromUrl = params.get("ref");
  return referralFromUrl || window.localStorage.getItem("crevo_ref") || "";
}

function SubmitButton({ compact = false }: { compact?: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      className={cn("w-full sm:w-auto", compact && "h-11 px-4")}
      disabled={pending}
    >
      {pending ? "Saving your spot..." : "Join waitlist →"}
    </Button>
  );
}

export function WaitlistForm({
  className,
  compact = false,
  showAgency = true,
  title = "Join the waitlist",
  description = "Get first access, referral perks, and updates from the founding team.",
}: {
  className?: string;
  compact?: boolean;
  showAgency?: boolean;
  title?: string;
  description?: string;
}) {
  const [state, formAction] = useActionState(joinWaitlist, initialState);
  const startedAtRef = useRef<HTMLInputElement | null>(null);
  const storedReferral = useSyncExternalStore(
    () => () => undefined,
    getStoredReferralCodeClient,
    () => "",
  );

  const stampFormStart = () => {
    if (startedAtRef.current && !startedAtRef.current.value) {
      startedAtRef.current.value = String(Date.now());
    }
  };

  useEffect(() => {
    if (!storedReferral) return;
    window.localStorage.setItem("crevo_ref", storedReferral);
  }, [storedReferral]);

  useEffect(() => {
    if (state.status !== "success" || !storedReferral) return;
    window.localStorage.removeItem("crevo_ref");
  }, [state.status, storedReferral]);

  useEffect(() => {
    if (state.status === "success" && state.message) {
      toast.success(state.message);
    }

    if (state.status === "error" && state.message) {
      toast.error(state.message);
    }
  }, [state]);

  const shareLink = useMemo(
    () => state.referralLink || "",
    [state.referralLink],
  );

  const copyLink = async () => {
    if (!shareLink) return;
    await navigator.clipboard.writeText(shareLink);
    toast.success("Referral link copied.");
  };

  if (state.status === "success" && shareLink) {
    return (
      <Card className={cn("surface-outline", className)}>
        <CardHeader>
          <div className="flex items-center gap-2 text-primary">
            <CheckCircle2 className="h-5 w-5" />
            <span className="text-sm font-medium uppercase tracking-[0.14em]">
              You&apos;re on the waitlist
            </span>
          </div>
          <CardTitle>Now turn one signup into two.</CardTitle>
          <CardDescription>
            Copy your referral link and share it with other teams. Referral
            signups can unlock launch discounts later.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-2xl border border-border/70 bg-background/50 p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
              Your referral link
            </p>
            <p className="mt-2 break-all text-sm font-medium text-foreground">
              {shareLink}
            </p>
          </div>
          <Button type="button" onClick={copyLink} className="w-full">
            <Copy className="h-4 w-4" />
            Copy referral link
          </Button>
          {state.positionEstimate ? (
            <p className="text-sm text-muted-foreground">
              {state.positionEstimate} · Founding member perks are still open.
              Keep your link handy for future discount rewards.
            </p>
          ) : null}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("surface-outline", className)}>
      <CardHeader>
        <div className="flex items-center gap-2 text-primary">
          <Sparkles className="h-5 w-5" />
          <span className="text-sm font-medium uppercase tracking-[0.14em]">
            Early access
          </span>
        </div>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          action={formAction}
          className="space-y-4"
          onFocusCapture={stampFormStart}
          onPointerDownCapture={stampFormStart}
        >
          <input
            ref={startedAtRef}
            type="hidden"
            name="startedAt"
            defaultValue=""
          />
          <input type="hidden" name="referredBy" value={storedReferral} />
          <div className="hidden" aria-hidden="true">
            <label htmlFor="waitlist-company-website">
              Leave this field empty
            </label>
            <Input
              id="waitlist-company-website"
              name="companyWebsite"
              tabIndex={-1}
              autoComplete="off"
            />
          </div>

          <div
            className={cn(
              "grid gap-3",
              showAgency
                ? "sm:grid-cols-2"
                : "sm:grid-cols-[1fr_auto] sm:items-end",
            )}
          >
            <div className="space-y-2">
              <label
                htmlFor="name"
                className="text-sm font-medium text-foreground"
              >
                Name
              </label>
              <div className="relative">
                <User className="field-icon" />
                <Input
                  id="name"
                  name="name"
                  placeholder="Your name"
                  className="field-with-icon"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="email"
                className="text-sm font-medium text-foreground"
              >
                Email
              </label>
              <div className="relative">
                <Link2 className="field-icon" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder="email@youragency.com"
                  className="field-with-icon"
                />
              </div>
            </div>
          </div>

          {showAgency ? (
            <div className="space-y-2">
              <label
                htmlFor="agency"
                className="text-sm font-medium text-foreground"
              >
                Agency name
              </label>
              <Input
                id="agency"
                name="agency"
                placeholder="Your studio or agency"
              />
            </div>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              {storedReferral
                ? `Referral code applied: ${storedReferral}`
                : "No credit card · Founding access perks · Setup in minutes"}
            </p>
            <SubmitButton compact={compact} />
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

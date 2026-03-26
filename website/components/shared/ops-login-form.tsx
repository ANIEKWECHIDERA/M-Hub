"use client";

import { useActionState, useEffect } from "react";
import { LockKeyhole, Mail } from "lucide-react";
import { toast } from "sonner";

import { loginToOps, type OpsLoginState } from "@/actions/ops-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const initialState: OpsLoginState = {
  status: "idle",
};

export function OpsLoginForm() {
  const [state, formAction] = useActionState(loginToOps, initialState);

  useEffect(() => {
    if (state.status === "error" && state.message) {
      toast.error(state.message);
    }
  }, [state]);

  return (
    <Card className="surface-outline max-w-md">
      <CardHeader>
        <CardTitle>Waitlist ops login</CardTitle>
        <CardDescription>
          This workspace is private. Sign in to view and export your leads.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="ops-email" className="text-sm font-medium text-foreground">
              Email
            </label>
            <div className="relative">
              <Mail className="field-icon" />
              <Input
                id="ops-email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@crevo.com"
                className="field-with-icon"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="ops-password" className="text-sm font-medium text-foreground">
              Password
            </label>
            <div className="relative">
              <LockKeyhole className="field-icon" />
              <Input
                id="ops-password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="Waitlist ops password"
                className="field-with-icon"
              />
            </div>
          </div>

          <Button type="submit" className="w-full">
            Open waitlist ops
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

import type { Metadata } from "next";

import { Logo } from "@/components/shared/logo";
import { WaitlistForm } from "@/components/shared/waitlist-form";

export const metadata: Metadata = {
  title: "Waitlist",
  description: "Join the Crevo waitlist for early access.",
};

export default function WaitlistPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="container-shell flex min-h-screen items-center justify-center py-10">
        <div className="w-full max-w-3xl space-y-8 text-center">
          <div className="mx-auto w-max">
            <Logo />
          </div>
          <div className="space-y-4">
            <span className="label-pill">Early Access</span>
            <h1 className="section-title">The waitlist is open.</h1>
            <p className="section-copy mx-auto max-w-2xl">
              Crevo is in private beta. Join the list and be first in.
            </p>
          </div>
          <WaitlistForm
            title="Secure my spot"
            description="Early access pricing locked in · Direct line to the founding team · Founding member badge on your profile"
          />
          <p className="text-sm text-muted-foreground">412 agencies already on the list</p>
        </div>
      </div>
    </main>
  );
}

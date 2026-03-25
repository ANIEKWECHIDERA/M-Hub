import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Logo } from "@/components/shared/logo";
import { WaitlistForm } from "@/components/shared/waitlist-form";

export const metadata: Metadata = {
  title: "Waitlist",
  description: "Join the Crevo waitlist for early access.",
};

export default function WaitlistPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="container-shell flex min-h-screen items-center py-10">
        <div className="grid w-full gap-8 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
          <div className="space-y-6 text-center lg:text-left">
            <div className="flex justify-center lg:justify-start">
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/72 px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-primary/24 hover:text-primary"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to home
              </Link>
            </div>
            <div className="mx-auto w-max lg:mx-0">
              <Logo />
            </div>
            <div className="space-y-4">
              <span className="label-pill">Early Access</span>
              <h1 className="section-title max-w-3xl">The waitlist is open.</h1>
              <p className="section-copy mx-auto max-w-2xl lg:mx-0">
                Crevo is in private beta. Join the list and be first in. Early access
                gets your agency closer to launch pricing, direct product feedback loops,
                and a smoother migration when the doors open.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {[
                "Early access pricing locked in",
                "Direct line to the founding team",
                "Founding member badge on your profile",
              ].map((benefit) => (
                <div
                  key={benefit}
                  className="rounded-[22px] border border-border/70 bg-card/78 px-4 py-4 text-sm leading-6 text-muted-foreground"
                >
                  {benefit}
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-muted-foreground lg:justify-start">
              <span className="rounded-full border border-primary/24 bg-primary/10 px-3 py-1 text-primary">
                412 agencies already on the list
              </span>
              <span>Share your referral link after signup to bring your team with you.</span>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 -z-10 rounded-[32px] bg-primary/10 blur-3xl" />
            <WaitlistForm
              className="border-primary/14 bg-card/94"
              title="Secure my spot"
              description="Early access pricing locked in · Direct line to the founding team · Founding member badge on your profile"
            />
          </div>
        </div>
      </div>
    </main>
  );
}

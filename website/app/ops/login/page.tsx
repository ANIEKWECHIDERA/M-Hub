import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { OpsLoginForm } from "@/components/shared/ops-login-form";

export const metadata: Metadata = {
  title: "Waitlist Ops Login",
  description: "Private access to Crevo waitlist operations.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function OpsLoginPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="container-shell flex min-h-screen flex-col justify-center gap-8 py-10">
        <div className="flex justify-center sm:justify-start">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/72 px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-primary/24 hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to site
          </Link>
        </div>
        <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <div className="space-y-4">
            <span className="label-pill">Private ops</span>
            <h1 className="section-title max-w-3xl">Your waitlist cockpit.</h1>
            <p className="section-copy max-w-2xl">
              Review signups, spot your strongest referral loops, export clean email
              lists, and keep the launch queue focused without exposing lead data to
              the public site.
            </p>
          </div>
          <OpsLoginForm />
        </div>
      </div>
    </main>
  );
}

import type { Metadata } from "next";

import { FinalCtaSection } from "@/components/sections/final-cta-section";
import { PageShell } from "@/components/shared/page-shell";

export const metadata: Metadata = {
  title: "For Agencies",
  description: "Why Crevo is built specifically for agency workflows.",
};

export default function ForAgenciesPage() {
  return (
    <PageShell>
      <section className="section-shell">
        <div className="container-shell grid gap-6 lg:grid-cols-2 lg:items-start">
          <div className="space-y-4">
            <span className="label-pill">For Agencies</span>
            <h1 className="section-title max-w-4xl">Generic tools make agencies do translation work they should never have to do.</h1>
            <p className="section-copy max-w-2xl">
              Crevo is agency-native. It understands client relationships, approvals, retainers,
              deliverables, and the constant context switching between projects that creative teams live with.
            </p>
          </div>

          <div className="grid gap-4">
            {[
              "Client visibility without exposing the whole workspace",
              "Approval checkpoints that reduce revision chaos",
              "Budget awareness before work slips over retainer",
              "Decision context attached to the work, not trapped in chat",
            ].map((item) => (
              <div key={item} className="rounded-[24px] border border-border/70 bg-card/86 p-5">
                <p className="text-sm leading-7 text-muted-foreground">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <FinalCtaSection />
    </PageShell>
  );
}

import type { Metadata } from "next";

import { DeepDiveSection } from "@/components/sections/deep-dive-section";
import { FeaturesSection } from "@/components/sections/features-section";
import { FinalCtaSection } from "@/components/sections/final-cta-section";
import { PageShell } from "@/components/shared/page-shell";

export const metadata: Metadata = {
  title: "Features",
  description: "Explore the feature set behind Crevo’s agency workflow.",
};

export default function FeaturesPage() {
  return (
    <PageShell>
      <section className="section-shell">
        <div className="container-shell space-y-4">
          <span className="label-pill">Features</span>
          <h1 className="section-title max-w-4xl">One operating system for client work, approvals, and team clarity.</h1>
          <p className="section-copy max-w-3xl">
            Chat, projects, tasks, budgets, and decision visibility built to match the shape of real
            agency delivery.
          </p>
        </div>
      </section>
      <FeaturesSection />
      <DeepDiveSection />
      <FinalCtaSection />
    </PageShell>
  );
}

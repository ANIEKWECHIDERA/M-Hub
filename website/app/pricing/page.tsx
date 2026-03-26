import type { Metadata } from "next";

import { FinalCtaSection } from "@/components/sections/final-cta-section";
import { PricingSection } from "@/components/sections/pricing-section";
import { PageShell } from "@/components/shared/page-shell";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Simple pricing for agencies ready to replace scattered tools.",
};

export default function PricingPage() {
  return (
    <PageShell>
      <section className="section-shell">
        <div className="container-shell space-y-4">
          <span className="label-pill">Pricing</span>
          <h1 className="section-title max-w-4xl">A pricing model that scales with client complexity, not chaos.</h1>
          <p className="section-copy max-w-2xl">
            Start lean, then grow into the version of Crevo that fits how your agency actually operates.
          </p>
        </div>
      </section>
      <PricingSection />
      <FinalCtaSection />
    </PageShell>
  );
}

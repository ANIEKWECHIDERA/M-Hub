import { DeepDiveSection } from "@/components/sections/deep-dive-section";
import { FeaturesSection } from "@/components/sections/features-section";
import { FinalCtaSection } from "@/components/sections/final-cta-section";
import { HeroSection } from "@/components/sections/hero-section";
import { PricingSection } from "@/components/sections/pricing-section";
import { ProblemSolutionSection } from "@/components/sections/problem-solution-section";
import { SocialProofBar } from "@/components/sections/social-proof-bar";
import { TestimonialsSection } from "@/components/sections/testimonials-section";
import { PageShell } from "@/components/shared/page-shell";

export default function HomePage() {
  return (
    <PageShell>
      <HeroSection />
      <SocialProofBar />
      <ProblemSolutionSection />
      <FeaturesSection />
      <DeepDiveSection />
      <TestimonialsSection />
      <PricingSection />
      <FinalCtaSection />
    </PageShell>
  );
}

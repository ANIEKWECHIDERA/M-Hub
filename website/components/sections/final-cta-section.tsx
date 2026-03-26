import { Reveal } from "@/components/shared/reveal";
import { WaitlistForm } from "@/components/shared/waitlist-form";

export function FinalCtaSection() {
  return (
    <section className="section-shell border-t border-primary/16">
      <div className="container-shell">
        <div className="rounded-[32px] border border-primary/15 bg-[radial-gradient(ellipse_at_center,rgba(200,241,53,0.12)_0%,transparent_70%),var(--background)] px-4 py-10 sm:px-6 sm:py-12 lg:px-10">
          <Reveal className="mx-auto max-w-3xl space-y-4 text-center">
            <h2 className="section-title">
              Your agency deserves
              <br />
              <span className="text-primary">better tools.</span>
            </h2>
            <p className="section-copy mx-auto max-w-2xl">
              Join hundreds of creative teams who finally have a home for their work.
            </p>
          </Reveal>

          <div className="mx-auto mt-8 max-w-3xl">
            <WaitlistForm
              compact
              showAgency={false}
              title="Secure your spot"
              description="No credit card · Cancel anytime · Set up in 5 minutes"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

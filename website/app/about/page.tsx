import type { Metadata } from "next";

import { PageShell } from "@/components/shared/page-shell";

export const metadata: Metadata = {
  title: "About",
  description: "The story, mission, and vision behind Crevo.",
};

export default function AboutPage() {
  return (
    <PageShell>
      <section className="section-shell">
        <div className="container-shell space-y-8">
          <div className="space-y-4">
            <span className="label-pill">About Crevo</span>
            <h1 className="section-title max-w-4xl">Made for agencies, not squeezed around them.</h1>
            <p className="section-copy max-w-3xl">
              Crevo exists because agency work is high-context, deadline-heavy, and far
              too relationship-driven to live comfortably across five disconnected tools.
            </p>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            {[
              {
                title: "Story",
                text: "Creative teams deserve software that understands clients, deliverables, budgets, approvals, and all the messy work in between.",
              },
              {
                title: "Vision",
                text: "A future where every agency has one clear operating system for delivery, collaboration, and client confidence.",
              },
              {
                title: "Mission",
                text: "Build the calmest, sharpest project hub creative teams have ever used — and make it feel made for them on day one.",
              },
            ].map((item) => (
              <div key={item.title} className="rounded-[24px] border border-border/70 bg-card/86 p-6 shadow-[var(--shadow-card)]">
                <h2 className="text-2xl font-semibold" data-display-font="true">{item.title}</h2>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </PageShell>
  );
}

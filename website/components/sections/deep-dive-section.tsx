import Link from "next/link";
import { Check, ArrowRight } from "lucide-react";

import { Reveal } from "@/components/shared/reveal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const benefits = [
  "Real-time project visibility — no more status call prep",
  "One-click approvals with a full audit trail",
  "White-labeled with your agency’s branding",
];

export function DeepDiveSection() {
  return (
    <section className="section-shell">
      <div className="container-shell grid gap-8 lg:grid-cols-2 lg:items-center">
        <Reveal className="order-2 lg:order-1">
          <Card className="surface-outline">
            <CardHeader>
              <CardTitle>Axiom Studio Portal</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-3xl border border-border/70 bg-background/40 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Project</p>
                    <p className="text-lg font-semibold">Homepage Redesign — Phase 2</p>
                  </div>
                  <div className="rounded-full border border-border/70 px-3 py-1 text-xs text-muted-foreground">
                    Client view
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Progress</span>
                    <span>68% complete</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/8">
                    <div className="h-2 w-[68%] rounded-full bg-primary" />
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-border/70 bg-card/66 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">Hero Section Design</p>
                    <p className="text-xs text-muted-foreground">Uploaded by Tom · 2h ago</p>
                  </div>
                  <div className="flex gap-2">
                    <button className="rounded-full bg-[color:var(--mint)] px-3 py-2 text-xs font-semibold text-black">
                      Approve
                    </button>
                    <button className="rounded-full border border-border px-3 py-2 text-xs font-semibold text-muted-foreground">
                      Request Changes
                    </button>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-border/70 bg-background/34 p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                  Recent activity
                </p>
                <div className="mt-3 space-y-3 text-sm text-muted-foreground">
                  <p>Tom uploaded 3 files · 2h ago</p>
                  <p>Client opened the portal · 40m ago</p>
                  <p>Budget status still on track · no action needed</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Reveal>

        <Reveal className="order-1 space-y-6 lg:order-2">
          <span className="label-pill">Client Portal</span>
          <div className="space-y-4">
            <h2 className="section-title max-w-2xl">
              Your clients want progress. Stop making them ask for it.
            </h2>
            <p className="section-copy max-w-xl">
              Give clients a premium view of what is moving, what needs approval,
              and what changed last, without opening the floodgates to your whole workspace.
            </p>
          </div>

          <div className="space-y-3">
            {benefits.map((benefit) => (
              <div key={benefit} className="flex items-start gap-3">
                <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-primary/12 text-primary">
                  <Check className="h-4 w-4" />
                </div>
                <p className="text-sm leading-6 text-muted-foreground">{benefit}</p>
              </div>
            ))}
          </div>

          <Button asChild variant="outline">
            <Link href="/features">
              See the client portal
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </Reveal>
      </div>
    </section>
  );
}

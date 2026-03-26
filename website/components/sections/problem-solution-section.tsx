import { ArrowRightLeft, CalendarClock, MessageSquareWarning, Sheet } from "lucide-react";

import { Reveal } from "@/components/shared/reveal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const painPoints = [
  {
    title: "Too many tools",
    description: "Slack, Trello, Notion, Sheets, and approvals all fighting for context.",
    icon: Sheet,
  },
  {
    title: "Scattered communication",
    description: "Client updates, project decisions, and tasks keep landing in different places.",
    icon: MessageSquareWarning,
  },
  {
    title: "Lost context",
    description: "Your team spends more time finding the latest answer than doing the work.",
    icon: CalendarClock,
  },
];

export function ProblemSolutionSection() {
  return (
    <section className="section-shell" id="how-it-works">
      <div className="container-shell space-y-12">
        <Reveal className="space-y-4">
          <h2 className="section-title max-w-4xl">
            Running an agency shouldn&apos;t feel like managing five tools and a prayer.
          </h2>
          <p className="section-copy max-w-3xl">
            Most project tools were built for generic teams. Crevo was built for how
            agencies actually work — clients, budgets, approvals, and all.
          </p>
        </Reveal>

        <div className="grid gap-6 lg:grid-cols-[0.95fr_auto_1.05fr] lg:items-center">
          <Card className="surface-outline">
            <CardHeader>
              <CardTitle>Your current setup</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {painPoints.map((point) => (
                <div key={point.title} className="rounded-2xl border border-[color:var(--coral)]/18 bg-background/42 p-4">
                  <point.icon className="h-4 w-4 text-[color:var(--coral)]" />
                  <p className="mt-3 text-sm font-medium text-foreground">{point.title}</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{point.description}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-primary">
              <ArrowRightLeft className="h-5 w-5" />
            </div>
          </div>

          <Card className="surface-outline">
            <CardHeader>
              <CardTitle>With Crevo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-3xl border border-border/70 bg-background/38 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">Axiom Studio</p>
                    <p className="text-xs text-muted-foreground">Homepage Redesign</p>
                  </div>
                  <span className="rounded-full bg-[color:var(--mint)] px-3 py-1 text-[10px] font-semibold tracking-[0.14em] text-black">
                    APPROVED
                  </span>
                </div>
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Project timeline</span>
                    <span>72% budget used, on track</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/8">
                    <div className="h-2 w-[72%] rounded-full bg-primary" />
                  </div>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  "Client conversations linked to the work",
                  "Approvals with a clear audit trail",
                  "One source of truth for every project",
                  "Real-time visibility without status chasing",
                ].map((item) => (
                  <div key={item} className="rounded-2xl border border-border/70 bg-card/66 px-3 py-3 text-sm text-muted-foreground">
                    {item}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}

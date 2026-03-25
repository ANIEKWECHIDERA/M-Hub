import {
  BadgeCheck,
  BarChart3,
  Copy,
  Eye,
  LayoutGrid,
  Users,
} from "lucide-react";

import { Reveal } from "@/components/shared/reveal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const featureCards = [
  {
    title: "Client Portal",
    description: "Share live project status with clients. No more PDF reports or status calls.",
    icon: Eye,
  },
  {
    title: "Deliverable Approvals",
    description: "Built-in approval gates. Every decision timestamped. Scope creep, handled.",
    icon: BadgeCheck,
  },
  {
    title: "Budget Tracking",
    description: "Watch retainer burn in real time. Alerts before you go over — not after.",
    icon: BarChart3,
  },
  {
    title: "Multi-Client HQ",
    description: "Every client. Every project. Every deadline. One screen. Finally.",
    icon: LayoutGrid,
  },
  {
    title: "Agency Templates",
    description: "Brand identity, campaign, web build — spin up projects in seconds.",
    icon: Copy,
  },
  {
    title: "Team & Role Control",
    description: "Admins, members, and clients each see exactly what they should. No more.",
    icon: Users,
  },
];

export function FeaturesSection() {
  return (
    <section className="section-shell" id="features">
      <div className="container-shell space-y-10">
        <Reveal className="space-y-4">
          <h2 className="section-title max-w-3xl">
            Everything your agency needs. Nothing it doesn&apos;t.
          </h2>
          <p className="section-copy max-w-2xl">
            Crevo keeps the workflow sharp: chat, tasks, projects, approvals, and
            decision visibility built for the real shape of agency delivery.
          </p>
        </Reveal>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
          {featureCards.map((feature, index) => (
            <Reveal key={feature.title} delay={index * 0.06}>
              <Card className="h-full transition-transform duration-200 hover:-translate-y-1 hover:border-primary/22">
                <CardHeader>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <feature.icon className="h-5 w-5" />
                  </div>
                  <CardTitle className="pt-4 text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-6 text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

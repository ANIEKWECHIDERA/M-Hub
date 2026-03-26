import Link from "next/link";
import { Check } from "lucide-react";

import { Reveal } from "@/components/shared/reveal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const tiers = [
  {
    name: "Starter",
    price: "$29",
    features: [
      "Up to 3 clients",
      "5 team members",
      "Project management + task boards",
      "Basic reporting",
      "Email support",
    ],
  },
  {
    name: "Agency",
    price: "$79",
    featured: true,
    features: [
      "Unlimited clients",
      "15 team members",
      "Client portal + deliverable approvals",
      "Budget tracking + alerts",
      "Agency templates",
      "Priority support",
    ],
  },
  {
    name: "Studio",
    price: "$149",
    features: [
      "Everything in Agency",
      "Unlimited team members",
      "White-label + custom domain",
      "Advanced analytics",
      "Dedicated account manager",
    ],
  },
];

export function PricingSection() {
  return (
    <section className="section-shell" id="pricing">
      <div className="container-shell space-y-10">
        <Reveal className="space-y-4">
          <h2 className="section-title">Simple pricing. No surprises.</h2>
          <p className="section-copy max-w-2xl">
            Start with a lean setup, then grow into the version of Crevo that matches
            how your agency actually operates.
          </p>
        </Reveal>

        <div className="grid gap-4 lg:grid-cols-3 lg:gap-5">
          {tiers.map((tier, index) => (
            <Reveal key={tier.name} delay={index * 0.06}>
              <Card className={tier.featured ? "border-primary/35" : ""}>
                <CardHeader>
                  {tier.featured ? <span className="label-pill w-max">Most Popular</span> : null}
                  <CardTitle className="pt-3 text-2xl">{tier.name}</CardTitle>
                  <p className="text-4xl font-semibold tracking-tight text-foreground" data-display-font="true">
                    {tier.price}
                    <span className="text-base font-normal text-muted-foreground">/mo</span>
                  </p>
                </CardHeader>
                <CardContent className="space-y-5">
                  <ul className="space-y-3">
                    {tier.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3 text-sm text-muted-foreground">
                        <Check className="mt-0.5 h-4 w-4 text-primary" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button asChild variant={tier.featured ? "default" : "outline"} className="w-full">
                    <Link href="/waitlist">Start free trial</Link>
                  </Button>
                </CardContent>
              </Card>
            </Reveal>
          ))}
        </div>

        <p className="text-center text-sm text-muted-foreground">
          All plans include a 14-day free trial. No credit card required.
        </p>
      </div>
    </section>
  );
}

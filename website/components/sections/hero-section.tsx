import Link from "next/link";
import { ArrowRight, Bell, ChevronDown, Sparkles } from "lucide-react";

import { Reveal } from "@/components/shared/reveal";
import { Button } from "@/components/ui/button";

const stats = [
  { label: "Active Projects", value: "12", tone: "text-[color:var(--mint)]" },
  { label: "Monthly Retainer", value: "£48,200", tone: "text-primary" },
  { label: "Pending Approvals", value: "3", tone: "text-[color:var(--coral)]" },
];

export function HeroSection() {
  return (
    <section className="section-shell">
      <div className="container-shell">
        <div className="hero-grid">
          <div className="space-y-6 sm:space-y-7">
            <Reveal>
              <span className="label-pill">
                <Sparkles className="mr-2 h-3.5 w-3.5" />
                Built for agencies
              </span>
            </Reveal>
            <div className="space-y-3">
              <Reveal delay={0.08}>
                <h1
                  className="max-w-4xl text-5xl font-bold leading-none tracking-[-0.04em] text-balance sm:text-6xl lg:text-[4.5rem]"
                  data-display-font="true"
                >
                  The project hub
                  <br />
                  your agency
                  <br />
                  <span className="text-primary">actually deserves.</span>
                </h1>
              </Reveal>
              <Reveal delay={0.2}>
                <p className="max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
                  Manage every client, project, budget, and deliverable in one place
                  without the spreadsheet chaos.
                </p>
              </Reveal>
            </div>

            <Reveal delay={0.32}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button asChild size="lg">
                  <Link href="/waitlist">
                    Join the waitlist
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="ghost">
                  <Link href="#how-it-works">
                    See how it works
                    <ChevronDown className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </Reveal>

            <Reveal delay={0.4}>
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1 text-primary">★★★★★</span>
                <span>Joined by 400+ agency teams</span>
              </div>
            </Reveal>
          </div>

          <Reveal delay={0.18}>
            <div
              className="relative mx-auto w-full max-w-[560px] rounded-[24px] border border-white/8 bg-card p-4 shadow-[0_32px_80px_rgba(0,0,0,0.6),0_0_80px_rgba(200,241,53,0.12)]"
              style={{
                transform: "perspective(1000px) rotateY(-8deg) rotateX(4deg)",
              }}
            >
              <div className="rounded-[18px] border border-border/70 bg-background/55 p-4">
                <div className="flex items-center justify-between border-b border-border/70 pb-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Good morning, Alex</p>
                    <p className="text-lg font-semibold text-foreground">Here&apos;s the state of the agency.</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Bell className="h-4 w-4 text-muted-foreground" />
                    <div className="h-9 w-9 rounded-full bg-primary/12" />
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  {stats.map((stat) => (
                    <div key={stat.label} className="rounded-2xl border border-border/70 bg-card/65 p-3">
                      <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                        {stat.label}
                      </p>
                      <p className={`mt-2 text-xl font-semibold ${stat.tone}`}>{stat.value}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-4 space-y-3 rounded-2xl border border-border/70 bg-card/60 p-3">
                  {[
                    ["Axiom Studio", "Campaign Rebrand", "ACTIVE", "87%", "bg-[color:var(--mint)]"],
                    ["Velt Agency", "Website Redesign", "REVIEW", "62%", "bg-[color:var(--amber)]"],
                    ["Nord Creative", "Social Q4", "OVERDUE", "94%", "bg-[color:var(--coral)]"],
                  ].map(([client, project, status, budget, tone]) => (
                    <div key={client} className="grid grid-cols-[1.25fr_1fr_auto] items-center gap-3 rounded-xl bg-background/36 px-3 py-3 text-sm">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">{client}</p>
                        <p className="truncate text-xs text-muted-foreground">{project}</p>
                      </div>
                      <span className={`inline-flex h-7 items-center justify-center rounded-full px-2 text-[10px] font-semibold tracking-[0.14em] text-black ${tone}`}>
                        {status}
                      </span>
                      <div className="min-w-[92px]">
                        <p className="mb-1 text-right text-xs text-muted-foreground">{budget} budget</p>
                        <div className="h-2 rounded-full bg-white/8">
                          <div className={`h-2 rounded-full ${tone}`} style={{ width: budget }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="absolute bottom-4 right-4 w-56 rounded-2xl border border-primary/20 bg-background/90 p-4 shadow-[var(--shadow-card)]">
                  <p className="text-xs uppercase tracking-[0.14em] text-primary">
                    Pending Approval
                  </p>
                  <p className="mt-2 text-sm font-medium text-foreground">
                    Homepage Hero — awaiting client sign-off
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <button className="rounded-full bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground">
                      Approve
                    </button>
                    <button className="rounded-full border border-border px-3 py-2 text-xs font-semibold text-muted-foreground">
                      Revise
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

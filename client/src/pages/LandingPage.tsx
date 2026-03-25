import { ArrowRight, CheckCircle2, PlayCircle } from "lucide-react";
import { Link } from "react-router-dom";

import { CrevoMark } from "@/components/CrevoMark";
import { MotionSurface } from "@/components/ui/motion-surface";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const highlights = [
  "Projects, tasks, notes, and chat in one workspace",
  "Daily focus that helps each teammate act faster",
  "Decision feed so important chat updates do not get buried",
];

const featureCards = [
  {
    title: "Move faster together",
    description:
      "Keep briefs, execution, and approvals close so work does not stall between tools.",
  },
  {
    title: "See what matters now",
    description:
      "Bring urgent tasks, decisions, and blockers into a calmer day-to-day workflow.",
  },
  {
    title: "Stay aligned by default",
    description:
      "Give your workspace a cleaner operating system for delivery, visibility, and follow-through.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-4 sm:px-6 sm:py-5 lg:px-8 lg:py-6">
        <header className="sticky top-0 z-20 -mx-4 border-b border-border/55 bg-background/88 px-4 py-3 backdrop-blur-sm sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/12 text-primary">
                <CrevoMark className="h-5 w-5" />
              </div>
              <div>
                <p
                  className="text-lg font-semibold tracking-tight"
                  data-display-font="true"
                >
                  Crevo
                </p>
                <p className="text-xs text-muted-foreground">
                  Work that stays in sync
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button asChild variant="ghost" className="h-9 px-3">
                <Link to="/login">Sign in</Link>
              </Button>
              <Button asChild className="h-9 px-3.5">
                <Link to="/signup">
                  Get started
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </header>

        <main className="flex flex-1 items-center">
          <div className="grid w-full grid-cols-1 gap-6 py-8 sm:gap-8 sm:py-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] lg:gap-10 lg:py-16">
            <MotionSurface className="space-y-5 sm:space-y-6">
              <Badge variant="secondary" className="h-8 rounded-full px-3">
                Agency workflow, without the tool sprawl
              </Badge>

              <div className="space-y-4">
                <h1
                  className="max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl"
                  data-display-font="true"
                >
                  A calmer home for projects, people, and decisions.
                </h1>
                <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
                  Crevo brings execution, context, and collaboration into one
                  place so creative teams can deliver faster without drowning in
                  tabs, chats, and status chasing.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="min-h-11 px-5">
                  <Link to="/signup">
                    Start free
                    <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="min-h-11 px-5"
                >
                  <Link to="/login">
                    <PlayCircle className="mr-1.5 h-4 w-4" />
                    Open app
                  </Link>
                </Button>
              </div>

              <div className="grid grid-cols-1 gap-3 pt-1 sm:grid-cols-2">
                {highlights.map((item) => (
                  <div
                    key={item}
                    className="flex items-start gap-2 rounded-2xl border border-border/50 bg-card/72 px-3 py-3"
                  >
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <p className="text-sm text-muted-foreground">{item}</p>
                  </div>
                ))}
              </div>
            </MotionSurface>

            <MotionSurface className="grid gap-4 sm:gap-5">
              <Card className="overflow-hidden">
                <CardHeader className="space-y-2">
                  <CardTitle className="text-lg" data-display-font="true">
                    Built for the way teams actually work
                  </CardTitle>
                  <CardDescription>
                    A public landing page now lives at the root, so the product
                    can grow without forcing people straight into auth.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3">
                  {featureCards.map((feature) => (
                    <div
                      key={feature.title}
                      className="rounded-xl border border-border/45 bg-background/35 px-3 py-3"
                    >
                      <p className="text-sm font-medium text-foreground">
                        {feature.title}
                      </p>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        {feature.description}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </MotionSurface>
          </div>
        </main>
      </div>
    </div>
  );
}
